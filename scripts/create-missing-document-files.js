import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

// Minimal valid PDF content
const pdfPlaceholder = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Document Placeholder) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000306 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n390\n%%EOF');

async function createMissingFiles() {
  const client = await pool.connect();
  try {
    console.log('Checking for missing document files...\n');
    
    // Get all documents
    const result = await client.query(`
      SELECT id, file_path, document_name, document_type, goods_receipt_id
      FROM goods_receipt_documents
      ORDER BY id
    `);
    
    if (result.rows.length === 0) {
      console.log('No documents found in database.');
      return;
    }
    
    console.log(`Found ${result.rows.length} document(s) in database.\n`);
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'goods-receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory: ${uploadsDir}\n`);
    }
    
    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    for (const doc of result.rows) {
      try {
        // Resolve file path
        let filePath = doc.file_path;
        if (!path.isAbsolute(filePath)) {
          filePath = path.resolve(process.cwd(), filePath);
        } else {
          filePath = path.normalize(filePath);
        }
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
          console.log(`✅ File exists: ${doc.document_name} (ID: ${doc.id})`);
          existingCount++;
          continue;
        }
        
        // Extract filename from path
        const fileName = path.basename(filePath);
        const targetDir = path.dirname(filePath);
        
        // Ensure directory exists
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Create placeholder PDF file
        fs.writeFileSync(filePath, pdfPlaceholder);
        const fileStats = fs.statSync(filePath);
        
        // Update database with correct file size
        await client.query(`
          UPDATE goods_receipt_documents 
          SET file_size = $1
          WHERE id = $2
        `, [fileStats.size, doc.id]);
        
        console.log(`✅ Created placeholder file: ${doc.document_name} (ID: ${doc.id})`);
        console.log(`   Path: ${filePath}`);
        console.log(`   Size: ${fileStats.size} bytes\n`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error processing document ${doc.id} (${doc.document_name}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total documents: ${result.rows.length}`);
    console.log(`Files already exist: ${existingCount}`);
    console.log(`Files created: ${createdCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error creating missing files:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createMissingFiles();

