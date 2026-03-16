import express from 'express';
import AIAgentActions from '../aiAgentActions.js';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test endpoint to verify AI agent actions work
router.post('/test-action', async (req, res) => {
  try {
    const { message, userRole = 'chief' } = req.body;
    
    console.log('Testing AI Agent Action:', message);
    
    const agentActions = new AIAgentActions(dbPool, userRole);
    const result = await agentActions.parseAndExecuteAction(message, 'sales');
    
    console.log('Action Result:', result);
    
    res.json({
      success: true,
      input: message,
      userRole,
      result
    });
  } catch (error) {
    console.error('Test action error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;