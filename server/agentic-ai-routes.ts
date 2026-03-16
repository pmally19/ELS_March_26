import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import AgenticAISystem from './agentic-ai-system';

const router = Router();
let agenticAISystem: AgenticAISystem;

// Initialize the Agentic AI System
function initializeAgenticAI(pool: Pool): void {
  agenticAISystem = new AgenticAISystem(pool);
  console.log('🤖 Agentic AI System initialized successfully');
}

/**
 * Process natural language request through AI agents
 */
router.post('/process', async (req, res) => {
  try {
    const { request, context } = req.body;
    
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Request text is required'
      });
    }

    const result = await agenticAISystem.processRequest(request, context);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Agentic AI processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    });
  }
});

/**
 * Get agent status and capabilities
 */
router.get('/status', async (req, res) => {
  try {
    const status = agenticAISystem.getAgentStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Status retrieval failed'
    });
  }
});

/**
 * Get inter-agent communication logs
 */
router.get('/communications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const communications = agenticAISystem.getCommunicationLogs(limit);
    
    res.json({
      success: true,
      communications,
      total: communications.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Communication logs error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve communications'
    });
  }
});

/**
 * Get task execution history
 */
router.get('/tasks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tasks = agenticAISystem.getTaskHistory(limit);
    
    res.json({
      success: true,
      tasks,
      total: tasks.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Task history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve task history'
    });
  }
});

/**
 * Facilitate inter-agent communication
 */
router.post('/communicate', async (req, res) => {
  try {
    const { from_agent, to_agent, message, type = 'request' } = req.body;
    
    if (!from_agent || !to_agent || !message) {
      return res.status(400).json({
        success: false,
        error: 'from_agent, to_agent, and message are required'
      });
    }

    const result = await agenticAISystem.facilitateAgentCommunication(
      from_agent, 
      to_agent, 
      message, 
      type
    );
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Agent communication error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Communication failed'
    });
  }
});

/**
 * Get available agent capabilities
 */
router.get('/capabilities', async (req, res) => {
  try {
    const status = agenticAISystem.getAgentStatus();
    
    const capabilities = {
      total_agents: status.total_agents,
      active_agents: status.active_agents,
      agent_types: status.agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        specialization: agent.specialization,
        capabilities: agent.capabilities,
        model_type: agent.model_type,
        autonomous: agent.autonomous,
        memory_enabled: agent.memory_enabled
      })),
      supported_tasks: [
        'data_analysis',
        'process_automation',
        'customer_support',
        'financial_analysis',
        'inventory_management',
        'sales_support',
        'reporting',
        'optimization',
        'integration'
      ],
      features: [
        'Natural language processing',
        'Multi-agent collaboration',
        'Real-time ERP integration',
        'Autonomous task execution',
        'Persistent memory',
        'Local and cloud AI models',
        'Inter-agent communication',
        'Context-aware responses'
      ]
    };
    
    res.json({
      success: true,
      capabilities,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Capabilities error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve capabilities'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const status = agenticAISystem.getAgentStatus();
    
    const health = {
      system_status: 'operational',
      agents_active: status.active_agents,
      total_agents: status.total_agents,
      task_queue_health: status.task_queue_length < 100 ? 'healthy' : 'high_load',
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      health,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

export { router as agenticAIRoutes, initializeAgenticAI };