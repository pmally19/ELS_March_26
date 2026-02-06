import express from 'express';
import APIKeyManager from '../apiKeyManager.js';

const router = express.Router();
const keyManager = new APIKeyManager();

// Store new API key
router.post('/store', async (req, res) => {
  try {
    const { serviceName, keyName, keyValue, description } = req.body;

    if (!serviceName || !keyName || !keyValue) {
      return res.status(400).json({
        success: false,
        error: 'Service name, key name, and key value are required'
      });
    }

    const result = await keyManager.storeAPIKey(serviceName, keyName, keyValue, description);
    
    // Initialize OpenAI if this is an OpenAI key
    if (serviceName === 'openai') {
      await keyManager.initializeOpenAI();
    }

    res.json({
      success: true,
      message: `API key for ${serviceName} stored successfully`,
      data: {
        id: result.id,
        serviceName: result.service_name
      }
    });
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store API key',
      message: error.message
    });
  }
});

// Check if service has API key
router.get('/check/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const hasKey = await keyManager.hasAPIKey(serviceName);

    res.json({
      success: true,
      serviceName,
      hasKey,
      status: hasKey ? 'configured' : 'missing'
    });
  } catch (error) {
    console.error('Error checking API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API key status'
    });
  }
});

// List all configured services
router.get('/services', async (req, res) => {
  try {
    const services = await keyManager.listServices();
    
    // Don't expose actual key values
    const safeServices = services.map(service => ({
      serviceName: service.service_name,
      keyName: service.key_name,
      description: service.description,
      isActive: service.is_active,
      createdAt: service.created_at,
      updatedAt: service.updated_at,
      lastUsed: service.last_used,
      hasKey: true
    }));

    res.json({
      success: true,
      services: safeServices,
      total: safeServices.length
    });
  } catch (error) {
    console.error('Error listing services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list services'
    });
  }
});

// Deactivate API key
router.delete('/deactivate/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = await keyManager.deactivateAPIKey(serviceName);

    if (success) {
      res.json({
        success: true,
        message: `API key for ${serviceName} deactivated successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `API key for ${serviceName} not found`
      });
    }
  } catch (error) {
    console.error('Error deactivating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate API key'
    });
  }
});

// Initialize OpenAI from stored key
router.post('/initialize/openai', async (req, res) => {
  try {
    const initialized = await keyManager.initializeOpenAI();
    
    if (initialized) {
      res.json({
        success: true,
        message: 'OpenAI API key initialized successfully',
        status: 'active'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'OpenAI API key not found in database',
        status: 'missing'
      });
    }
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize OpenAI'
    });
  }
});

export default router;