/**
 * Simple Real AI Agent Routes - Actually executes database operations
 */

import { Router } from 'express';
import { simpleRealAI } from '../services/simple-real-ai';

const router = Router();

/**
 * Real AI Chat - Actually executes actions
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    console.log('🤖 SIMPLE REAL AI REQUEST:', message);
    
    const result = await simpleRealAI.processMessage(message);
    
    console.log('✅ SIMPLE REAL AI RESULT:', result);
    
    res.json({
      success: true,
      response: result.response,
      executed: result.executed,
      result: result.result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SIMPLE REAL AI ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: 'I encountered an error while processing your request.'
    });
  }
});

/**
 * Test the Simple Real AI
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 TESTING SIMPLE REAL AI...');
    
    // Get current counts before test
    const beforeCounts = await simpleRealAI.getCurrentCounts();
    console.log('📊 BEFORE COUNTS:', beforeCounts);
    
    // Test customer creation
    const customerResult = await simpleRealAI.processMessage('create customer TestRealAI Corp with contact person Bob Wilson');
    console.log('✅ CUSTOMER TEST:', customerResult);
    
    // Test lead creation
    const leadResult = await simpleRealAI.processMessage('create lead for XYZ Manufacturing with contact person Alice Smith');
    console.log('✅ LEAD TEST:', leadResult);
    
    // Get counts after test
    const afterCounts = await simpleRealAI.getCurrentCounts();
    console.log('📊 AFTER COUNTS:', afterCounts);
    
    res.json({
      success: true,
      message: 'Simple Real AI test completed',
      tests: {
        customerCreation: customerResult,
        leadCreation: leadResult
      },
      counts: {
        before: beforeCounts,
        after: afterCounts,
        difference: {
          customers: parseInt(afterCounts.customer_count) - parseInt(beforeCounts.customer_count),
          leads: parseInt(afterCounts.lead_count) - parseInt(beforeCounts.lead_count)
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SIMPLE REAL AI TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get current system counts
 */
router.get('/status', async (req, res) => {
  try {
    const counts = await simpleRealAI.getCurrentCounts();
    
    res.json({
      success: true,
      status: 'operational',
      description: 'Simple Real AI Agent - Actually executes database operations',
      capabilities: [
        'Create customers with real database inserts',
        'Create leads with real database inserts', 
        'Query actual system data counts',
        'Natural language command processing',
        'Verified execution confirmations'
      ],
      currentData: counts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SIMPLE REAL AI STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;