/**
 * REAL Business Intelligence Route
 * Forces Jr. Assistant to ALWAYS return actual business data, never generic module descriptions
 */

import express from 'express';
import { advancedAIAssistant } from '../services/advanced-ai-assistant.js';

const router = express.Router();

// FORCE REAL BUSINESS INTELLIGENCE - NO GENERIC RESPONSES
router.post('/real-chat', async (req, res) => {
  console.log('REAL BUSINESS INTELLIGENCE Route: Processing query with actual data');
  
  try {
    const { message, userId, currentPage, contextMode } = req.body;
    
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log('FORCING Advanced AI Assistant to use REAL database data for:', message);
    
    // ALWAYS use Advanced AI Assistant - NO fallbacks to generic responses
    const result = await advancedAIAssistant.processAdvancedQuery(message, {
      currentPage: currentPage || '/',
      contextMode: contextMode || 'current', 
      userRole: 'Chief',
      sessionId: sessionId
    });
    
    console.log('REAL Business Intelligence result:', result);
    
    // Return REAL business data response
    return res.json({
      success: true,
      response: result.response,
      actions: result.actions || [],
      suggestions: result.suggestions || [],
      metadata: {
        aiModel: 'gpt-4o',
        intelligence: 'enhanced',
        processingTime: new Date().toISOString(),
        dataSource: 'real_database'
      }
    });
    
  } catch (error) {
    console.error('REAL Business Intelligence error:', error);
    
    return res.json({
      success: false,
      response: "I'm having trouble accessing the database right now. Let me try to reconnect and get you real business data.",
      error: error.message,
      metadata: {
        aiModel: 'error_handler',
        intelligence: 'fallback',
        processingTime: new Date().toISOString()
      }
    });
  }
});

export default router;