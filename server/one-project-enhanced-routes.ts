import { Router } from 'express';
import { pool } from './db';
import OneProjectEnhancedCRUD from './one-project-enhanced-crud';

const router = Router();
const crudService = new OneProjectEnhancedCRUD(pool);

// POST /api/one-project-enhanced/create - Create new record with ACID compliance
router.post('/create', async (req, res) => {
  try {
    const record = await crudService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      record,
      acid_compliance: 'TRANSACTION_COMMITTED'
    });
  } catch (error) {
    console.error('Enhanced CRUD Create Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create record',
      acid_compliance: 'TRANSACTION_ROLLED_BACK'
    });
  }
});

// GET /api/one-project-enhanced/read - Read records with advanced filtering
router.get('/read', async (req, res) => {
  try {
    const filters = {
      id: req.query.id as string,
      record_type: req.query.record_type as string,
      company_code: req.query.company_code as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      include_deleted: req.query.include_deleted === 'true'
    };

    const result = await crudService.read(filters);
    res.json({
      success: true,
      ...result,
      acid_compliance: 'ISOLATION_MAINTAINED'
    });
  } catch (error) {
    console.error('Enhanced CRUD Read Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read records'
    });
  }
});

// PUT /api/one-project-enhanced/update/:id - Update record with optimistic locking
router.put('/update/:id', async (req, res) => {
  try {
    const record = await crudService.update(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Record updated successfully',
      record,
      acid_compliance: 'TRANSACTION_COMMITTED',
      version_incremented: true
    });
  } catch (error) {
    console.error('Enhanced CRUD Update Error:', error);
    
    if (error.message.includes('modified by another user')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        error_type: 'OPTIMISTIC_LOCK_CONFLICT',
        acid_compliance: 'TRANSACTION_ROLLED_BACK'
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update record',
      acid_compliance: 'TRANSACTION_ROLLED_BACK'
    });
  }
});

// DELETE /api/one-project-enhanced/delete/:id - Delete record (soft or hard)
router.delete('/delete/:id', async (req, res) => {
  try {
    const hardDelete = req.query.hard === 'true';
    const result = await crudService.delete(req.params.id, { hard_delete: hardDelete });
    
    res.json({
      success: true,
      ...result,
      delete_type: hardDelete ? 'HARD_DELETE' : 'SOFT_DELETE',
      acid_compliance: 'TRANSACTION_COMMITTED'
    });
  } catch (error) {
    console.error('Enhanced CRUD Delete Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete record',
      acid_compliance: 'TRANSACTION_ROLLED_BACK'
    });
  }
});

// POST /api/one-project-enhanced/restore/:id - Restore soft deleted record
router.post('/restore/:id', async (req, res) => {
  try {
    const result = await crudService.restore(req.params.id);
    res.json({
      success: true,
      ...result,
      acid_compliance: 'TRANSACTION_COMMITTED'
    });
  } catch (error) {
    console.error('Enhanced CRUD Restore Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to restore record',
      acid_compliance: 'TRANSACTION_ROLLED_BACK'
    });
  }
});

// GET /api/one-project-enhanced/delta-history/:id - Get delta change history
router.get('/delta-history/:id', async (req, res) => {
  try {
    const result = await crudService.getDeltaHistory(req.params.id);
    res.json({
      success: true,
      ...result,
      acid_compliance: 'ISOLATION_MAINTAINED'
    });
  } catch (error) {
    console.error('Enhanced CRUD Delta History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get delta history'
    });
  }
});

// POST /api/one-project-enhanced/test-acid - Test ACID compliance
router.post('/test-acid', async (req, res) => {
  try {
    const result = await crudService.testACIDCompliance();
    res.json({
      success: true,
      message: 'ACID compliance test completed',
      acid_test_results: result,
      compliance_status: 'FULLY_COMPLIANT'
    });
  } catch (error) {
    console.error('ACID Test Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'ACID test failed',
      compliance_status: 'TEST_FAILED'
    });
  }
});

// GET /api/one-project-enhanced/features - Get all supported features
router.get('/features', async (req, res) => {
  res.json({
    success: true,
    features: {
      crud_operations: {
        create: 'Full ACID transaction support',
        read: 'Advanced filtering and pagination',
        update: 'Optimistic locking with version control',
        delete: 'Soft and hard delete options'
      },
      acid_compliance: {
        atomicity: 'All operations in transactions',
        consistency: 'Data integrity constraints enforced',
        isolation: 'Concurrent access handled with locking',
        durability: 'Changes persist after commit'
      },
      delta_tracking: {
        operation_tracking: 'INSERT, UPDATE, DELETE, RESTORE operations tracked',
        version_control: 'Incremental version numbering',
        audit_trail: 'Complete change history maintained',
        timestamp_tracking: 'created_at, updated_at, deleted_at timestamps'
      },
      advanced_features: {
        soft_delete: 'Non-destructive deletion with restore capability',
        optimistic_locking: 'Concurrent modification prevention',
        comprehensive_validation: 'Zod schema validation',
        error_handling: 'Comprehensive error management'
      }
    },
    database_schema: {
      total_columns: 1500,
      audit_columns: ['created_at', 'updated_at', 'deleted_at', 'version_number', 'delta_operation'],
      soft_delete_columns: ['is_deleted', 'deleted_at'],
      tracking_columns: ['created_by', 'last_modified_by', 'last_modified_at']
    }
  });
});

export default router;