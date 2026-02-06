/**
 * BULK UPLOAD SERVICE FOR 2000+ FILES
 * Handles high-volume file uploads with batch processing, progress tracking, and error recovery
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';

interface UploadBatch {
  id: string;
  files: Express.Multer.File[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  totalFiles: number;
  processedFiles: number;
  errorFiles: string[];
  startTime: Date;
  endTime?: Date;
}

interface BulkUploadProgress {
  batchId: string;
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  overallProgress: number;
  filesProcessed: number;
  totalFiles: number;
  errors: string[];
  estimatedTimeRemaining: number;
}

export class BulkUploadService {
  private batches: Map<string, UploadBatch> = new Map();
  private progressCallbacks: Map<string, (progress: BulkUploadProgress) => void> = new Map();
  private readonly BATCH_SIZE = 50; // Process 50 files per batch
  private readonly MAX_CONCURRENT_BATCHES = 3;
  private readonly UPLOAD_DIR = './uploads';

  constructor() {
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Configure multer for bulk uploads with optimizations
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 2000 // Maximum 2000 files per upload
      },
      fileFilter: (req, file, cb) => {
        // Accept common document and image formats
        const allowedTypes = /\.(pdf|docx|doc|txt|png|jpg|jpeg|gif|xls|xlsx|csv)$/i;
        if (allowedTypes.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not supported: ${file.originalname}`));
        }
      }
    });
  }

  /**
   * Initialize bulk upload process
   */
  async initializeBulkUpload(files: Express.Multer.File[], sessionId: string): Promise<string> {
    const uploadId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalBatches = Math.ceil(files.length / this.BATCH_SIZE);

    // Create batches
    const batches: UploadBatch[] = [];
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batchFiles = files.slice(i, i + this.BATCH_SIZE);
      const batch: UploadBatch = {
        id: `${uploadId}-batch-${Math.floor(i / this.BATCH_SIZE)}`,
        files: batchFiles,
        status: 'pending',
        progress: 0,
        totalFiles: batchFiles.length,
        processedFiles: 0,
        errorFiles: [],
        startTime: new Date()
      };
      batches.push(batch);
      this.batches.set(batch.id, batch);
    }

    // Start processing batches
    this.processBatchesSequentially(batches, uploadId, sessionId);

    return uploadId;
  }

  /**
   * Process batches with controlled concurrency
   */
  private async processBatchesSequentially(batches: UploadBatch[], uploadId: string, sessionId: string) {
    const totalFiles = batches.reduce((sum, batch) => sum + batch.totalFiles, 0);
    let processedFiles = 0;
    let completedBatches = 0;

    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
      const batchGroup = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES);
      
      // Process batch group concurrently
      const promises = batchGroup.map(batch => this.processBatch(batch));
      const results = await Promise.allSettled(promises);

      // Update progress
      results.forEach((result, index) => {
        const batch = batchGroup[index];
        if (result.status === 'fulfilled') {
          processedFiles += batch.processedFiles;
          completedBatches++;
          batch.status = 'completed';
          batch.endTime = new Date();
        } else {
          batch.status = 'error';
          batch.errorFiles.push(`Batch processing failed: ${result.reason}`);
        }
      });

      // Send progress update
      const progress: BulkUploadProgress = {
        batchId: uploadId,
        totalBatches: batches.length,
        completedBatches,
        currentBatch: Math.min(i + this.MAX_CONCURRENT_BATCHES, batches.length),
        overallProgress: (processedFiles / totalFiles) * 100,
        filesProcessed: processedFiles,
        totalFiles,
        errors: this.getAllErrors(batches),
        estimatedTimeRemaining: this.calculateETA(batches, completedBatches)
      };

      this.notifyProgress(sessionId, progress);
    }
  }

  /**
   * Process individual batch
   */
  private async processBatch(batch: UploadBatch): Promise<void> {
    batch.status = 'processing';
    
    for (const file of batch.files) {
      try {
        // Save file to database using raw SQL to avoid schema dependency
        await db.execute(`
          INSERT INTO designer_documents (file_name, upload_path, file_size, file_type, document_type, uploaded_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [file.originalname, file.path, file.size, file.mimetype, 'bulk_upload', 'system']);

        batch.processedFiles++;
        batch.progress = (batch.processedFiles / batch.totalFiles) * 100;

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        batch.errorFiles.push(`${file.originalname}: ${error.message}`);
      }
    }
  }

  /**
   * Get all errors from batches
   */
  private getAllErrors(batches: UploadBatch[]): string[] {
    return batches.flatMap(batch => batch.errorFiles);
  }

  /**
   * Calculate estimated time to completion
   */
  private calculateETA(batches: UploadBatch[], completedBatches: number): number {
    if (completedBatches === 0) return 0;

    const completedBatchList = batches.filter(b => b.status === 'completed');
    if (completedBatchList.length === 0) return 0;

    const avgTimePerBatch = completedBatchList.reduce((sum, batch) => {
      const duration = batch.endTime ? batch.endTime.getTime() - batch.startTime.getTime() : 0;
      return sum + duration;
    }, 0) / completedBatchList.length;

    const remainingBatches = batches.length - completedBatches;
    return (remainingBatches * avgTimePerBatch) / 1000; // Return in seconds
  }

  /**
   * Register progress callback for real-time updates
   */
  onProgress(sessionId: string, callback: (progress: BulkUploadProgress) => void) {
    this.progressCallbacks.set(sessionId, callback);
  }

  /**
   * Notify progress to registered callbacks
   */
  private notifyProgress(sessionId: string, progress: BulkUploadProgress) {
    const callback = this.progressCallbacks.get(sessionId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get current upload status
   */
  getUploadStatus(uploadId: string): BulkUploadProgress | null {
    const batches = Array.from(this.batches.values()).filter(b => b.id.startsWith(uploadId));
    if (batches.length === 0) return null;

    const completedBatches = batches.filter(b => b.status === 'completed').length;
    const totalFiles = batches.reduce((sum, b) => sum + b.totalFiles, 0);
    const processedFiles = batches.reduce((sum, b) => sum + b.processedFiles, 0);

    return {
      batchId: uploadId,
      totalBatches: batches.length,
      completedBatches,
      currentBatch: completedBatches,
      overallProgress: (processedFiles / totalFiles) * 100,
      filesProcessed: processedFiles,
      totalFiles,
      errors: this.getAllErrors(batches),
      estimatedTimeRemaining: this.calculateETA(batches, completedBatches)
    };
  }

  /**
   * Cleanup completed uploads
   */
  cleanup(uploadId: string) {
    const batchIds = Array.from(this.batches.keys()).filter(id => id.startsWith(uploadId));
    batchIds.forEach(id => this.batches.delete(id));
  }
}

export const bulkUploadService = new BulkUploadService();