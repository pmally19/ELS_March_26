/**
 * REAL AI Agent API - Actually executes database operations
 * This replaces the fake automation with real database changes
 */

import { Router } from 'express';
import { realAIAutomation } from '../services/real-ai-automation';
import { db } from '../db';

const router = Router();

/**
 * REAL AI Chat - Actually executes actions instead of pretending
 */
router.post('/real-execution', async (req, res) => {
  try {
    const { message, currentPage } = req.body;
    
    console.log('🤖 REAL AI AGENT REQUEST:', { message, currentPage });
    
    // Get current system state for context
    const businessData = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM leads) as lead_count,
        (SELECT COUNT(*) FROM sales_orders) as order_count,
        (SELECT COUNT(*) FROM materials) as material_count,
        (SELECT COUNT(*) FROM vendors) as vendor_count
    `);
    
    const context = businessData.rows[0];
    console.log('📊 CURRENT SYSTEM STATE:', context);
    
    // Process message with real automation
    const result = await realAIAutomation.processMessage(message, context);
    
    console.log('✅ REAL AI EXECUTION RESULT:', result);
    
    res.json({
      success: result.success,
      response: result.response,
      executedActions: result.executedActions,
      context: context,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ REAL AI AGENT ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: 'I encountered an error while processing your request.'
    });
  }
});

/**
 * Test Real AI Agent capabilities
 */
router.post('/test-capabilities', async (req, res) => {
  try {
    const testResults = [];
    
    // Test 1: Create a customer
    const customerTest = await realAIAutomation.processMessage(
      'Create a new customer called TestAI Corp with email test@testai.com',
      {}
    );
    testResults.push({
      test: 'Create Customer',
      success: customerTest.success,
      executed: customerTest.executedActions.length > 0,
      result: customerTest.response
    });
    
    // Test 2: Create a lead
    const leadTest = await realAIAutomation.processMessage(
      'Create a new lead for ABC Manufacturing with contact person Sarah Johnson',
      {}
    );
    testResults.push({
      test: 'Create Lead',
      success: leadTest.success,
      executed: leadTest.executedActions.length > 0,
      result: leadTest.response
    });
    
    res.json({
      success: true,
      message: 'Real AI Agent capability tests completed',
      tests: testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ REAL AI AGENT TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Real AI Agent status
 */
router.get('/status', async (req, res) => {
  try {
    const businessData = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM leads) as lead_count,
        (SELECT COUNT(*) FROM sales_orders) as order_count,
        (SELECT COUNT(*) FROM materials) as material_count,
        (SELECT COUNT(*) FROM vendors) as vendor_count
    `);
    
    const context = businessData.rows[0];
    
    res.json({
      success: true,
      status: 'operational',
      capabilities: [
        'Create customers, leads, sales orders, materials, vendors',
        'Update existing records with real database changes',
        'Intelligent natural language processing',
        'Actual database operations (not simulated)',
        'Real-time data validation and error handling'
      ],
      currentData: context,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ REAL AI AGENT STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;