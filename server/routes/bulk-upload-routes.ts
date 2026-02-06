/**
 * BULK UPLOAD API ROUTES
 * Handles 2000+ file uploads with batch processing and real-time progress tracking
 */

import { Router } from 'express';
import { bulkUploadService } from '../services/bulk-upload-service';

const router = Router();

/**
 * POST /api/bulk-upload/initialize
 * Initialize bulk upload process for 2000+ files
 */
router.post('/initialize', (req, res) => {
  const upload = bulkUploadService.getMulterConfig();
  
  upload.array('documents', 2000)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
        message: 'File upload failed'
      });
    }

    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
          message: 'Please select files to upload'
        });
      }

      const sessionId = 'bulk-upload-session';
      const uploadId = await bulkUploadService.initializeBulkUpload(files, sessionId);

      res.json({
        success: true,
        uploadId,
        totalFiles: files.length,
        message: `Bulk upload initialized for ${files.length} files`,
        batchSize: 50,
        estimatedBatches: Math.ceil(files.length / 50)
      });

    } catch (error) {
      console.error('Bulk upload initialization error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to initialize bulk upload'
      });
    }
  });
});

/**
 * GET /api/bulk-upload/status/:uploadId
 * Get real-time upload progress
 */
router.get('/status/:uploadId', (req, res) => {
  try {
    const { uploadId } = req.params;
    const status = bulkUploadService.getUploadStatus(uploadId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found',
        message: 'Upload ID not found or expired'
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get upload status'
    });
  }
});

/**
 * WebSocket endpoint for real-time progress updates
 * GET /api/bulk-upload/progress/:uploadId/stream
 */
router.get('/progress/:uploadId/stream', (req, res) => {
  const { uploadId } = req.params;
  
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection
  res.write('data: {"type":"connected","uploadId":"' + uploadId + '"}\n\n');

  // Register for progress updates
  const sessionId = 'bulk-upload-session';
  bulkUploadService.onProgress(sessionId, (progress) => {
    if (progress.batchId === uploadId) {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        ...progress
      })}\n\n`);

      // Close connection when complete
      if (progress.overallProgress >= 100) {
        res.write('data: {"type":"completed"}\n\n');
        res.end();
      }
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    res.end();
  });
});

/**
 * POST /api/bulk-upload/cleanup/:uploadId
 * Cleanup completed upload data
 */
router.post('/cleanup/:uploadId', (req, res) => {
  try {
    const { uploadId } = req.params;
    bulkUploadService.cleanup(uploadId);

    res.json({
      success: true,
      message: 'Upload data cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to cleanup upload data'
    });
  }
});

/**
 * GET /api/bulk-upload/limits
 * Get upload limits and configuration
 */
router.get('/limits', (req, res) => {
  res.json({
    success: true,
    limits: {
      maxFiles: 2000,
      maxFileSize: '10MB',
      batchSize: 50,
      maxConcurrentBatches: 3,
      supportedFormats: [
        'pdf', 'docx', 'doc', 'txt',
        'png', 'jpg', 'jpeg', 'gif',
        'xls', 'xlsx', 'csv'
      ],
      features: {
        batchProcessing: true,
        progressTracking: true,
        errorRecovery: true,
        resumeCapability: true
      }
    }
  });
});

export default router;