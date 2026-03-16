/**
 * API Routes for AI-Powered Module-Specific Agents
 */

import express from 'express';
import { createAgent, getAvailableAgents } from '../aiAgents.js';
import AIAgentDatabase from '../aiAgentDatabase.js';

const router = express.Router();
const agentDB = new AIAgentDatabase();

// Get all available agents
router.get('/agents', async (req, res) => {
  try {
    const agents = getAvailableAgents();
    res.json({
      success: true,
      agents,
      total: agents.length
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      message: error.message
    });
  }
});

// Start conversation with specific agent
router.post('/agents/:moduleType/conversation', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`Starting conversation with ${moduleType} agent: ${message.substring(0, 50)}...`);

    const agent = createAgent(moduleType);
    
    // Create or get existing chat session
    let chatSessionId = sessionId;
    if (!chatSessionId) {
      chatSessionId = await agentDB.createChatSession(moduleType, null, 'User', {});
    }

    // Save user message
    await agentDB.saveChatMessage(chatSessionId, 'user', message);

    // Process with agent - include agent role from session for intelligent responses
    const agentRole = req.session?.agentRole || 'chief'; // Default to chief for full permissions
    const startTime = Date.now();
    const result = await Promise.race([
      agent.processQuery(message, { 
        sessionId: chatSessionId,
        agentRole: agentRole,
        userRole: agentRole, // Pass agent role as user role for permissions
        currentModule: moduleType
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Conversation timeout')), 30000)
      )
    ]);

    const responseTime = Date.now() - startTime;

    // Save agent response (ensure content is not null)
    const agentContent = result.response || result.message || result.fallback || 'No response generated';
    await agentDB.saveChatMessage(
      chatSessionId, 
      'agent', 
      agentContent, 
      `${moduleType} Agent`,
      { 
        capabilities: result.capabilities,
        provider: result.provider || 'openai',
        quotaExceeded: result.quotaExceeded || false
      },
      responseTime
    );

    console.log(`Conversation completed for ${moduleType} agent${result.provider ? ` (${result.provider})` : ''}`);
    
    res.json({
      success: result.success !== false, // Treat quota exceeded as success with fallback
      response: result.response || result.message || result.fallback,
      agent: `${moduleType} Agent`,
      sessionId: chatSessionId,
      responseTime: responseTime,
      actionExecuted: result.actionExecuted || false,
      actionResult: result.actionResult || null,
      provider: result.provider || 'openai',
      quotaExceeded: result.quotaExceeded || false,
      warning: result.quotaExceeded ? 'AI quota exceeded - using fallback response. Please check OpenAI billing or configure DEEPSEEK_API_KEY for automatic fallback.' : null
    });

  } catch (error) {
    console.error(`Error in conversation with ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      message: error.message
    });
  }
});

// Process query with specific agent
router.post('/agents/:moduleType/query', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    console.log(`Received query for ${moduleType}: ${query.substring(0, 50)}...`);

    const agent = createAgent(moduleType);
    
    // Add agent role context for TRUE AI intelligence across all MallyERP agents
    const agentRole = req.session?.agentRole || 'rookie';
    const enhancedContext = {
      ...context,
      agentRole: agentRole,
      userRole: 'User', 
      currentModule: moduleType,
      systemWide: true // Enable cross-module intelligence
    };

    // Add timeout to prevent hanging requests
    const result = await Promise.race([
      agent.processQuery(query, enhancedContext),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);

    console.log(`Query processed successfully for ${moduleType}`);
    res.json(result);
  } catch (error) {
    console.error(`Error processing query for ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
      message: error.message
    });
  }
});

// Analyze data with specific agent
router.post('/agents/:moduleType/analyze', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const { data, analysisType } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for analysis'
      });
    }

    console.log(`Received analysis request for ${moduleType}`);

    const agent = createAgent(moduleType);
    
    // Add timeout to prevent hanging requests
    const result = await Promise.race([
      agent.analyzeData(data, analysisType || 'general'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 25000)
      )
    ]);

    console.log(`Analysis completed for ${moduleType}`);
    res.json(result);
  } catch (error) {
    console.error(`Error analyzing data for ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze data',
      message: error.message
    });
  }
});

// Validate data with specific agent
router.post('/agents/:moduleType/validate', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const { data, validationType } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for validation'
      });
    }

    const agent = createAgent(moduleType);
    const result = await agent.validateData(data, validationType || 'standard');

    res.json(result);
  } catch (error) {
    console.error(`Error validating data for ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate data',
      message: error.message
    });
  }
});

// Get agent capabilities
router.get('/agents/:moduleType/capabilities', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const agent = createAgent(moduleType);
    const capabilities = agent.getCapabilities();

    res.json({
      success: true,
      capabilities
    });
  } catch (error) {
    console.error(`Error fetching capabilities for ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch capabilities',
      message: error.message
    });
  }
});

// Bulk operations - analyze multiple data sets
router.post('/agents/:moduleType/bulk-analyze', async (req, res) => {
  try {
    const { moduleType } = req.params;
    const { datasets, analysisType } = req.body;

    if (!datasets || !Array.isArray(datasets)) {
      return res.status(400).json({
        success: false,
        error: 'Datasets array is required'
      });
    }

    const agent = createAgent(moduleType);
    const results = [];

    for (const dataset of datasets) {
      const result = await agent.analyzeData(dataset.data, analysisType || 'general');
      results.push({
        id: dataset.id,
        name: dataset.name,
        ...result
      });
    }

    res.json({
      success: true,
      results,
      total: results.length
    });
  } catch (error) {
    console.error(`Error bulk analyzing for ${req.params.moduleType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk analyze data',
      message: error.message
    });
  }
});

// Health check for AI agents
router.get('/health', async (req, res) => {
  try {
    const testAgent = createAgent('finance');
    const testResult = await testAgent.processQuery('Test connection', {});
    
    res.json({
      success: true,
      status: testResult.success ? 'healthy' : 'api_key_missing',
      openai_connection: testResult.success,
      available_modules: ['masterData', 'sales', 'inventory', 'purchase', 'production', 'finance', 'controlling'],
      message: testResult.success ? 'AI agents are operational' : 'OpenAI API key required for full functionality'
    });
  } catch (error) {
    console.error('AI Agent health check failed:', error);
    res.json({
      success: false,
      status: 'error',
      error: error.message,
      available_modules: ['masterData', 'sales', 'inventory', 'purchase', 'production', 'finance', 'controlling']
    });
  }
});

// Agent status endpoint
router.get('/agents/status', async (req, res) => {
  try {
    const agents = getAvailableAgents();
    const agentCount = agents.length;
    
    res.json({
      success: true,
      agents: agentCount,
      totalAgents: agentCount,
      status: 'operational',
      agentDetails: agents.map(agent => ({
        moduleType: agent.moduleType,
        name: agent.name,
        status: 'active',
        capabilities: agent.expertise?.length || 0
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status',
      message: error.message
    });
  }
});

export default router;