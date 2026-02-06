import express from 'express';
import TransportSystem, { TRANSPORT_TYPES, TRANSPORT_STATUS, ENVIRONMENTS } from '../transport/transportSystem.js';

const router = express.Router();
const transportSystem = new TransportSystem();

// Initialize transport system on startup
transportSystem.initializeTables();

/**
 * Create a new transport request
 */
router.post('/requests', async (req, res) => {
  try {
    const { type, description, owner, targetEnvironment } = req.body;
    
    if (!type || !description || !owner) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, description, owner' 
      });
    }

    const transportRequest = await transportSystem.createTransportRequest(
      type, 
      description, 
      owner, 
      targetEnvironment || 'QA'
    );

    res.status(201).json({
      message: 'Transport request created successfully',
      transportRequest
    });
  } catch (error) {
    console.error('Error creating transport request:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add master data object to transport
 */
router.post('/requests/:requestId/objects', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { tableName, recordId, action } = req.body;

    if (!tableName || !recordId) {
      return res.status(400).json({ 
        error: 'Missing required fields: tableName, recordId' 
      });
    }

    await transportSystem.addMasterDataToTransport(
      parseInt(requestId),
      tableName,
      parseInt(recordId),
      action || 'INSERT'
    );

    res.json({
      message: 'Object added to transport successfully'
    });
  } catch (error) {
    console.error('Error adding object to transport:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Release transport request
 */
router.post('/requests/:requestId/release', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { releaseNotes } = req.body;

    const transport = await transportSystem.releaseTransportRequest(
      parseInt(requestId),
      releaseNotes || ''
    );

    res.json({
      message: 'Transport request released successfully',
      transport
    });
  } catch (error) {
    console.error('Error releasing transport:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Import transport to target environment
 */
router.post('/requests/:requestId/import', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { targetEnvironment, executedBy } = req.body;

    if (!targetEnvironment || !executedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: targetEnvironment, executedBy' 
      });
    }

    const result = await transportSystem.importTransport(
      parseInt(requestId),
      targetEnvironment,
      executedBy
    );

    res.json({
      message: 'Transport imported successfully',
      result
    });
  } catch (error) {
    console.error('Error importing transport:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transport requests
 */
router.get('/requests', async (req, res) => {
  try {
    const { status, environment } = req.query;
    
    const requests = await transportSystem.getTransportRequests(status, environment);
    
    res.json({
      requests,
      summary: {
        total: requests.length,
        byStatus: requests.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {}),
        byEnvironment: requests.reduce((acc, req) => {
          acc[req.target_environment] = (acc[req.target_environment] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching transport requests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transport request details
 */
router.get('/requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const details = await transportSystem.getTransportDetails(parseInt(requestId));
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching transport details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available transport types and environments
 */
router.get('/config', (req, res) => {
  res.json({
    transportTypes: TRANSPORT_TYPES,
    transportStatus: TRANSPORT_STATUS,
    environments: ENVIRONMENTS,
    masterDataTables: [
      'company_codes',
      'plants',
      'storage_locations',
      'sales_organizations',
      'purchase_organizations',
      'credit_control_areas',
      'materials',
      'customers',
      'vendors',
      'chart_of_accounts',
      'cost_centers',
      'profit_centers',
      'material_categories',
      'units_of_measure',
      'currencies'
    ]
  });
});

/**
 * Bulk add master data to transport (for related objects)
 */
router.post('/requests/:requestId/bulk-add', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { objects } = req.body; // Array of {tableName, recordId, action}

    if (!Array.isArray(objects) || objects.length === 0) {
      return res.status(400).json({ 
        error: 'Objects array is required and must not be empty' 
      });
    }

    const results = [];
    const errors = [];

    for (const obj of objects) {
      try {
        await transportSystem.addMasterDataToTransport(
          parseInt(requestId),
          obj.tableName,
          parseInt(obj.recordId),
          obj.action || 'INSERT'
        );
        results.push({ ...obj, status: 'SUCCESS' });
      } catch (error) {
        errors.push({ ...obj, status: 'FAILED', error: error.message });
      }
    }

    res.json({
      message: `Bulk add completed. ${results.length} successful, ${errors.length} failed`,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in bulk add:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check referential integrity for transport
 */
router.get('/requests/:requestId/integrity-check', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const details = await transportSystem.getTransportDetails(parseInt(requestId));
    const objects = details.objects;
    
    // Check for missing dependencies
    const dependencies = [];
    const warnings = [];
    
    for (const obj of objects) {
      const data = typeof obj.data_snapshot === 'string' ? JSON.parse(obj.data_snapshot) : obj.data_snapshot;
      
      // Check for foreign key dependencies
      switch (obj.table_name) {
        case 'plants':
          if (data.company_code_id) {
            const hasCompanyCode = objects.some(o => {
              const objData = typeof o.data_snapshot === 'string' ? JSON.parse(o.data_snapshot) : o.data_snapshot;
              return o.table_name === 'company_codes' && objData.id === data.company_code_id;
            });
            if (!hasCompanyCode) {
              dependencies.push({
                object: obj.object_name,
                table: 'company_codes',
                missingId: data.company_code_id,
                field: 'company_code_id'
              });
            }
          }
          break;
        
        case 'storage_locations':
          if (data.plant_id) {
            const hasPlant = objects.some(o => {
              const objData = typeof o.data_snapshot === 'string' ? JSON.parse(o.data_snapshot) : o.data_snapshot;
              return o.table_name === 'plants' && objData.id === data.plant_id;
            });
            if (!hasPlant) {
              dependencies.push({
                object: obj.object_name,
                table: 'plants',
                missingId: data.plant_id,
                field: 'plant_id'
              });
            }
          }
          break;
        
        case 'materials':
          if (data.uom_id) {
            const hasUom = objects.some(o => {
              const objData = typeof o.data_snapshot === 'string' ? JSON.parse(o.data_snapshot) : o.data_snapshot;
              return o.table_name === 'units_of_measure' && objData.id === data.uom_id;
            });
            if (!hasUom) {
              dependencies.push({
                object: obj.object_name,
                table: 'units_of_measure',
                missingId: data.uom_id,
                field: 'uom_id'
              });
            }
          }
          break;
      }
    }
    
    res.json({
      status: dependencies.length === 0 ? 'CLEAN' : 'DEPENDENCIES_MISSING',
      missingDependencies: dependencies,
      warnings: warnings,
      objectCount: objects.length
    });
  } catch (error) {
    console.error('Error checking integrity:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;