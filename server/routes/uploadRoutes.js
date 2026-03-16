/**
 * Upload Routes for External Data Import
 * Handles CSV/Excel uploads and data validation with AI assistance
 */

import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import ERPAgent from '../aiAgents.js';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// Database connection
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize Upload AI Agent
const uploadAgent = new ERPAgent('upload');

// Parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Parse Excel file
function parseExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
}

// Get available tables for upload mapping
router.get('/tables', async (req, res) => {
  try {
    const query = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
      ORDER BY table_name, ordinal_position
    `;
    
    const result = await dbPool.query(query);
    
    // Group columns by table
    const tables = {};
    result.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      });
    });
    
    res.json({
      success: true,
      tables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload and validate file
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { targetTable, mappingConfig } = req.body;
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let data;
    
    // Parse file based on type
    if (fileExt === '.csv') {
      data = await parseCSV(filePath);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      data = parseExcel(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    // Add metadata to each record
    const timestamp = new Date().toISOString();
    const processedData = data.map((record, index) => ({
      ...record,
      _row_number: index + 1,
      _upload_timestamp: timestamp,
      _active: true
    }));

    // Validate data with Upload AI Agent
    const validationResult = await uploadAgent.validateData({
      data: processedData.slice(0, 10), // Validate first 10 rows for performance
      targetTable,
      mappingConfig: mappingConfig ? JSON.parse(mappingConfig) : null,
      totalRows: processedData.length
    }, 'upload_validation');

    // Store upload session for later processing
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      uploadId,
      validation: validationResult,
      dataPreview: processedData.slice(0, 5),
      totalRows: processedData.length,
      fileName: req.file.originalname,
      targetTable
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process validated upload
router.post('/process', upload.single('file'), async (req, res) => {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { targetTable, mappingConfig, validateOnly = false } = req.body;
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let data;
    
    // Parse file
    if (fileExt === '.csv') {
      data = await parseCSV(filePath);
    } else {
      data = parseExcel(filePath);
    }

    const timestamp = new Date().toISOString();
    const mapping = mappingConfig ? JSON.parse(mappingConfig) : {};
    
    // Transform data according to mapping
    const transformedData = data.map((record, index) => {
      const transformed = {};
      
      // Apply field mapping
      Object.keys(record).forEach(sourceField => {
        const targetField = mapping[sourceField] || sourceField.toLowerCase().replace(/\s+/g, '_');
        transformed[targetField] = record[sourceField];
      });
      
      // Add required ERP fields
      transformed.active = true;
      transformed.created_at = timestamp;
      transformed.updated_at = timestamp;
      
      return transformed;
    });

    // Validate with AI before insertion
    const validationResult = await uploadAgent.validateData({
      data: transformedData,
      targetTable,
      operation: 'bulk_insert'
    }, 'pre_insert_validation');

    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error}`);
    }

    let insertedCount = 0;
    let errors = [];

    if (!validateOnly) {
      // Get table structure
      const tableInfoQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const tableInfo = await client.query(tableInfoQuery, [targetTable]);
      const columns = tableInfo.rows.map(row => row.column_name);
      
      // Insert data
      for (let i = 0; i < transformedData.length; i++) {
        try {
          const record = transformedData[i];
          const validColumns = Object.keys(record).filter(key => columns.includes(key));
          
          if (validColumns.length === 0) {
            errors.push({
              row: i + 1,
              error: 'No valid columns found for this record'
            });
            continue;
          }
          
          const placeholders = validColumns.map((_, index) => `$${index + 1}`).join(', ');
          const values = validColumns.map(col => record[col]);
          
          const insertQuery = `
            INSERT INTO ${targetTable} (${validColumns.join(', ')})
            VALUES (${placeholders})
          `;
          
          await client.query(insertQuery, values);
          insertedCount++;
          
        } catch (insertError) {
          errors.push({
            row: i + 1,
            error: insertError.message,
            data: transformedData[i]
          });
        }
      }
    }

    await client.query('COMMIT');

    // Clean up file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      validation: validationResult,
      totalRows: transformedData.length,
      insertedCount,
      errors,
      targetTable,
      validateOnly
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Get upload history and status
router.get('/history', async (req, res) => {
  try {
    // This would typically come from a dedicated upload_history table
    res.json({
      success: true,
      uploads: [],
      message: 'Upload history feature will be implemented with dedicated tracking table'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;