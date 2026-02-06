import express from 'express';
import { db } from '../db';
import { apiKeys } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = express.Router();

// Test all AI agents and Jr Assistant with current API keys
router.post('/test-production-readiness', async (req, res) => {
  try {
    console.log('🧪 Starting comprehensive production readiness test...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      activeProvider: 'unknown',
      providers: {
        openai: { available: false, working: false, error: null },
        deepseek: { available: false, working: false, error: null },
        gemini: { available: false, working: false, error: null },
        grok: { available: false, working: false, error: null }
      },
      components: {
        designerAgent: { status: 'unknown', responseTime: 0, error: null },
        jrAssistant: { status: 'unknown', responseTime: 0, error: null },
        aiAgents: { status: 'unknown', responseTime: 0, error: null },
        chiefAgents: { status: 'unknown', responseTime: 0, error: null }
      },
      overallHealth: 'unknown'
    };

    // 1. Test Provider Availability
    try {
      const providerResponse = await fetch('http://localhost:5000/api/designer-agent/provider-status');
      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        testResults.providers = providerData.providers || {};
        testResults.activeProvider = providerData.activeProvider || 'openai';
      }
    } catch (error) {
      console.error('Provider status check failed:', error);
    }

    // 2. Test Designer Agent
    const designerStart = Date.now();
    try {
      const designerResponse = await fetch('http://localhost:5000/api/designer-agent/enhanced-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: "Test sales order processing functionality",
          documentType: "business_requirement"
        })
      });
      
      testResults.components.designerAgent.responseTime = Date.now() - designerStart;
      
      if (designerResponse.ok) {
        testResults.components.designerAgent.status = 'working';
      } else {
        const errorData = await designerResponse.json();
        testResults.components.designerAgent.status = 'failed';
        testResults.components.designerAgent.error = errorData.message || 'Unknown error';
      }
    } catch (error) {
      testResults.components.designerAgent.status = 'failed';
      testResults.components.designerAgent.error = error.message;
      testResults.components.designerAgent.responseTime = Date.now() - designerStart;
    }

    // 3. Test Jr Assistant
    const jrStart = Date.now();
    try {
      const jrResponse = await fetch('http://localhost:5000/api/jr/enhanced-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "How many customers do we have in the system?"
        })
      });
      
      testResults.components.jrAssistant.responseTime = Date.now() - jrStart;
      
      if (jrResponse.ok) {
        const jrData = await jrResponse.json();
        testResults.components.jrAssistant.status = jrData.response ? 'working' : 'partial';
      } else {
        testResults.components.jrAssistant.status = 'failed';
        const errorData = await jrResponse.json();
        testResults.components.jrAssistant.error = errorData.message || 'Unknown error';
      }
    } catch (error) {
      testResults.components.jrAssistant.status = 'failed';
      testResults.components.jrAssistant.error = error.message;
      testResults.components.jrAssistant.responseTime = Date.now() - jrStart;
    }

    // 4. Test AI Agents System
    const agentsStart = Date.now();
    try {
      const agentsResponse = await fetch('http://localhost:5000/api/enhanced-ai/agents/status');
      testResults.components.aiAgents.responseTime = Date.now() - agentsStart;
      
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        testResults.components.aiAgents.status = agentsData.totalAgents > 0 ? 'working' : 'partial';
      } else {
        testResults.components.aiAgents.status = 'failed';
      }
    } catch (error) {
      testResults.components.aiAgents.status = 'failed';
      testResults.components.aiAgents.error = error.message;
      testResults.components.aiAgents.responseTime = Date.now() - agentsStart;
    }

    // 5. Test Chief Agents
    const chiefStart = Date.now();
    try {
      const chiefResponse = await fetch('http://localhost:5000/api/enhanced-ai/agents/chief-sales/status');
      testResults.components.chiefAgents.responseTime = Date.now() - chiefStart;
      
      if (chiefResponse.ok) {
        testResults.components.chiefAgents.status = 'working';
      } else {
        testResults.components.chiefAgents.status = 'failed';
      }
    } catch (error) {
      testResults.components.chiefAgents.status = 'failed';
      testResults.components.chiefAgents.error = error.message;
      testResults.components.chiefAgents.responseTime = Date.now() - chiefStart;
    }

    // Calculate overall health
    const workingComponents = Object.values(testResults.components).filter(c => c.status === 'working').length;
    const totalComponents = Object.keys(testResults.components).length;
    const healthPercentage = (workingComponents / totalComponents) * 100;
    
    if (healthPercentage >= 75) {
      testResults.overallHealth = 'excellent';
    } else if (healthPercentage >= 50) {
      testResults.overallHealth = 'good';
    } else if (healthPercentage >= 25) {
      testResults.overallHealth = 'partial';
    } else {
      testResults.overallHealth = 'critical';
    }

    console.log('🧪 Production readiness test completed:', {
      activeProvider: testResults.activeProvider,
      workingComponents,
      totalComponents,
      healthPercentage: `${healthPercentage}%`,
      overallHealth: testResults.overallHealth
    });

    res.json({
      success: true,
      message: 'Production readiness test completed',
      testResults,
      summary: {
        activeProvider: testResults.activeProvider,
        workingComponents,
        totalComponents,
        healthPercentage: Math.round(healthPercentage),
        overallHealth: testResults.overallHealth,
        productionReady: healthPercentage >= 75
      }
    });

  } catch (error) {
    console.error('Production readiness test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Production readiness test failed',
      message: error.message
    });
  }
});

// Get current active provider information
router.get('/active-provider', async (req, res) => {
  try {
    // Check which provider is currently working
    const providerResponse = await fetch('http://localhost:5000/api/designer-agent/provider-status');
    
    if (providerResponse.ok) {
      const data = await providerResponse.json();
      
      // Determine active provider based on availability
      let activeProvider = 'openai'; // default
      
      if (data.providers?.openai?.available) {
        activeProvider = 'openai';
      } else if (data.providers?.deepseek?.configured) {
        activeProvider = 'deepseek';
      } else if (data.providers?.gemini?.configured) {
        activeProvider = 'gemini';
      } else if (data.providers?.grok?.configured) {
        activeProvider = 'grok';
      }
      
      res.json({
        success: true,
        activeProvider,
        providers: data.providers,
        fallbackHierarchy: ['openai', 'deepseek', 'gemini', 'grok']
      });
    } else {
      throw new Error('Unable to determine active provider');
    }
  } catch (error) {
    console.error('Active provider check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to determine active provider',
      message: error.message
    });
  }
});

export default router;