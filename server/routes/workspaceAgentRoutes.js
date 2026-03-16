import express from 'express';
import OpenAI from 'openai';
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Workspace agent query endpoint
router.post('/query', async (req, res) => {
  try {
    const { query, currentWorkspace, userActivity, availableTiles } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Analyze user context
    const contextAnalysis = analyzeUserContext(userActivity, availableTiles, currentWorkspace);
    
    // Create system prompt for workspace assistance
    const systemPrompt = `You are an expert ERP Workspace Agent helping users optimize their business process workflows. 

Available tiles cover these modules:
- Master Data (A001-A006): Company setup, chart of accounts, business partners
- Sales (S001-S004): Order-to-cash process 
- Procurement (P001-P005): Procure-to-pay process
- Inventory (I001-I004): Stock management and valuation
- Production (M001-M003): Manufacturing orders and execution
- Finance (F001-F007): Accounts payable/receivable, payments
- Controlling (C001-C004): Cost allocation and profitability
- Reporting (R001-R003): Financial and operational reports

Current context:
- Active workspace: ${currentWorkspace}
- Available tiles: ${availableTiles.length} total tiles
- User focus areas: ${contextAnalysis.focusAreas.join(', ')}

Provide specific, actionable advice about:
1. Tile recommendations based on user needs
2. Optimal workflow sequences
3. Workspace organization
4. Process efficiency improvements

Keep responses concise and practical.`;

    const userPrompt = `User question: "${query}"

Context: ${contextAnalysis.summary}

Please provide helpful workspace guidance.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const agentResponse = completion.choices[0].message.content;

    // Generate contextual suggestions based on the query
    const suggestions = generateContextualSuggestions(query, availableTiles, contextAnalysis);

    res.json({
      response: agentResponse,
      suggestions: suggestions,
      context: contextAnalysis
    });

  } catch (error) {
    console.error('Workspace Agent Error:', error);
    res.status(500).json({ 
      error: 'Failed to process agent query',
      response: "I'm here to help with workspace management. Try asking about tile organization, workflow optimization, or specific business processes."
    });
  }
});

// Get workspace recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const { userRole, currentTiles, businessProcess } = req.body;

    const recommendations = generateWorkspaceRecommendations(userRole, currentTiles, businessProcess);
    
    res.json({
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        basedOn: { userRole, tileCount: currentTiles?.length || 0, businessProcess }
      }
    });

  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Analyze workspace efficiency
router.post('/analyze', async (req, res) => {
  try {
    const { workspaceConfig, userActivity, businessObjectives } = req.body;

    const analysis = analyzeWorkspaceEfficiency(workspaceConfig, userActivity, businessObjectives);
    
    res.json({
      analysis,
      suggestions: analysis.optimizationSuggestions,
      metrics: analysis.efficiencyMetrics
    });

  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze workspace' });
  }
});

// Helper function to analyze user context
function analyzeUserContext(userActivity, availableTiles, currentWorkspace) {
  const tilesByModule = groupTilesByModule(availableTiles);
  const activityPatterns = analyzeActivityPatterns(userActivity);
  
  return {
    focusAreas: determineFocusAreas(activityPatterns, tilesByModule),
    workflowStage: determineWorkflowStage(currentWorkspace, activityPatterns),
    summary: generateContextSummary(currentWorkspace, activityPatterns, tilesByModule),
    recommendations: generateQuickRecommendations(activityPatterns, tilesByModule)
  };
}

// Helper function to group tiles by module
function groupTilesByModule(tiles) {
  const modules = {};
  
  tiles.forEach(tile => {
    const module = tile.functionalArea || 'Other';
    if (!modules[module]) {
      modules[module] = [];
    }
    modules[module].push(tile);
  });
  
  return modules;
}

// Helper function to analyze activity patterns
function analyzeActivityPatterns(userActivity) {
  if (!userActivity || userActivity.length === 0) {
    return {
      mostActive: 'Master Data',
      recentFocus: ['Setup', 'Configuration'],
      sessionPattern: 'getting-started'
    };
  }

  const moduleActivity = {};
  const recentActivity = userActivity.slice(-10);
  
  recentActivity.forEach(activity => {
    const module = determineModuleFromTileId(activity.tileId);
    moduleActivity[module] = (moduleActivity[module] || 0) + 1;
  });

  const mostActive = Object.keys(moduleActivity).reduce((a, b) => 
    moduleActivity[a] > moduleActivity[b] ? a : b
  );

  return {
    mostActive,
    recentFocus: Object.keys(moduleActivity),
    sessionPattern: determineSessionPattern(recentActivity)
  };
}

// Helper function to determine module from tile ID
function determineModuleFromTileId(tileId) {
  const prefix = tileId.charAt(0);
  const moduleMap = {
    'A': 'Master Data',
    'B': 'Business Partners',
    'C': 'Controlling',
    'S': 'Sales',
    'P': 'Procurement',
    'I': 'Inventory',
    'M': 'Production',
    'F': 'Finance',
    'R': 'Reporting',
    'L': 'Logistics'
  };
  return moduleMap[prefix] || 'Other';
}

// Helper function to determine workflow stage
function determineWorkflowStage(currentWorkspace, activityPatterns) {
  if (currentWorkspace === 'master-data' || activityPatterns.mostActive === 'Master Data') {
    return 'foundation-setup';
  }
  if (activityPatterns.mostActive === 'Sales' || activityPatterns.mostActive === 'Procurement') {
    return 'transaction-processing';
  }
  if (activityPatterns.mostActive === 'Finance' || activityPatterns.mostActive === 'Controlling') {
    return 'financial-management';
  }
  return 'operational-optimization';
}

// Helper function to determine focus areas
function determineFocusAreas(activityPatterns, tilesByModule) {
  const areas = [];
  
  if (activityPatterns.mostActive === 'Master Data') {
    areas.push('Data Foundation', 'System Setup');
  } else if (activityPatterns.mostActive === 'Sales') {
    areas.push('Revenue Generation', 'Customer Management');
  } else if (activityPatterns.mostActive === 'Procurement') {
    areas.push('Supplier Management', 'Cost Optimization');
  } else if (activityPatterns.mostActive === 'Finance') {
    areas.push('Financial Control', 'Cash Flow Management');
  }
  
  return areas.length > 0 ? areas : ['Process Optimization', 'Efficiency Improvement'];
}

// Helper function to generate context summary
function generateContextSummary(currentWorkspace, activityPatterns, tilesByModule) {
  const workspaceDescription = {
    'all-modules': 'exploring the complete system',
    'master-data': 'setting up foundational data',
    'sales-inventory': 'managing sales and stock processes',
    'finance-controlling': 'handling financial operations',
    'procurement-production': 'managing procurement and manufacturing',
    'reporting': 'analyzing business performance'
  };

  return `User is currently ${workspaceDescription[currentWorkspace] || 'working with business processes'} with primary focus on ${activityPatterns.mostActive}. Session pattern indicates ${activityPatterns.sessionPattern} stage.`;
}

// Helper function to determine session pattern
function determineSessionPattern(recentActivity) {
  if (recentActivity.length < 3) return 'getting-started';
  
  const tileTypes = recentActivity.map(activity => activity.tileId.charAt(0));
  const uniqueTypes = new Set(tileTypes);
  
  if (uniqueTypes.size === 1) return 'focused-work';
  if (uniqueTypes.size > 3) return 'exploration';
  return 'process-flow';
}

// Helper function to generate quick recommendations
function generateQuickRecommendations(activityPatterns, tilesByModule) {
  const recommendations = [];
  
  if (activityPatterns.mostActive === 'Master Data') {
    recommendations.push('Complete company code setup before proceeding to transactions');
    recommendations.push('Ensure chart of accounts is configured for all business areas');
  } else if (activityPatterns.mostActive === 'Sales') {
    recommendations.push('Set up customer master data before creating sales orders');
    recommendations.push('Configure pricing and credit management');
  } else if (activityPatterns.mostActive === 'Procurement') {
    recommendations.push('Establish vendor master records and purchasing organizations');
    recommendations.push('Define approval workflows for purchase requisitions');
  }
  
  return recommendations;
}

// Helper function to generate contextual suggestions
function generateContextualSuggestions(query, availableTiles, contextAnalysis) {
  const suggestions = [];
  const queryLower = query.toLowerCase();
  
  // Workflow-based suggestions
  if (queryLower.includes('sales') || queryLower.includes('order') || queryLower.includes('customer')) {
    suggestions.push({
      id: 'sales-workflow',
      type: 'workflow',
      title: 'Complete Sales Process',
      description: 'Set up end-to-end sales workflow from quotation to invoice',
      priority: 'high',
      tiles: ['S001', 'S002', 'S003', 'S004'],
      confidence: 0.92
    });
  }
  
  if (queryLower.includes('setup') || queryLower.includes('start') || queryLower.includes('begin')) {
    suggestions.push({
      id: 'foundation-setup',
      type: 'workspace',
      title: 'Foundation Setup Workspace',
      description: 'Essential master data configuration before transactions',
      priority: 'high',
      tiles: ['A001', 'A002', 'A003', 'B001', 'B002'],
      confidence: 0.95
    });
  }
  
  if (queryLower.includes('finance') || queryLower.includes('accounting') || queryLower.includes('payment')) {
    suggestions.push({
      id: 'financial-management',
      type: 'optimization',
      title: 'Financial Management Optimization',
      description: 'Streamline accounts payable and receivable processes',
      priority: 'medium',
      tiles: ['F005', 'F006', 'F007', 'C001', 'C002'],
      confidence: 0.88
    });
  }
  
  if (queryLower.includes('inventory') || queryLower.includes('stock') || queryLower.includes('warehouse')) {
    suggestions.push({
      id: 'inventory-control',
      type: 'tile',
      title: 'Inventory Control System',
      description: 'Comprehensive stock management and valuation',
      priority: 'medium',
      tiles: ['I001', 'I002', 'I003', 'I004'],
      confidence: 0.85
    });
  }
  
  return suggestions;
}

// Helper function to generate workspace recommendations
function generateWorkspaceRecommendations(userRole, currentTiles, businessProcess) {
  const recommendations = [];
  
  const roleBasedTiles = {
    'admin': ['A001', 'A002', 'A003', 'A004', 'A005', 'A006'],
    'sales_manager': ['S001', 'S002', 'S003', 'S004', 'B001'],
    'purchase_manager': ['P001', 'P002', 'P003', 'P004', 'P005', 'B002'],
    'finance_manager': ['F001', 'F002', 'F003', 'F005', 'F006', 'F007'],
    'warehouse_manager': ['I001', 'I002', 'I003', 'I004'],
    'production_manager': ['M001', 'M002', 'M003']
  };
  
  const suggestedTiles = roleBasedTiles[userRole] || [];
  
  recommendations.push({
    type: 'role-based',
    title: `Optimized ${userRole} Workspace`,
    description: `Tiles specifically curated for ${userRole} responsibilities`,
    tiles: suggestedTiles,
    priority: 'high',
    confidence: 0.9
  });
  
  return recommendations;
}

// Helper function to analyze workspace efficiency
function analyzeWorkspaceEfficiency(workspaceConfig, userActivity, businessObjectives) {
  const efficiencyMetrics = {
    tileUtilization: calculateTileUtilization(workspaceConfig, userActivity),
    workflowCompleteness: assessWorkflowCompleteness(workspaceConfig),
    processAlignment: evaluateProcessAlignment(workspaceConfig, businessObjectives),
    overallScore: 0
  };
  
  efficiencyMetrics.overallScore = Math.round(
    (efficiencyMetrics.tileUtilization + 
     efficiencyMetrics.workflowCompleteness + 
     efficiencyMetrics.processAlignment) / 3
  );
  
  const optimizationSuggestions = generateOptimizationSuggestions(efficiencyMetrics, workspaceConfig);
  
  return {
    efficiencyMetrics,
    optimizationSuggestions,
    analysisDate: new Date().toISOString()
  };
}

// Helper functions for efficiency analysis
function calculateTileUtilization(workspaceConfig, userActivity) {
  // Mock calculation - in real implementation, this would analyze actual usage patterns
  return Math.floor(Math.random() * 30) + 70; // 70-100%
}

function assessWorkflowCompleteness(workspaceConfig) {
  // Mock assessment - in real implementation, this would check for complete process flows
  return Math.floor(Math.random() * 25) + 75; // 75-100%
}

function evaluateProcessAlignment(workspaceConfig, businessObjectives) {
  // Mock evaluation - in real implementation, this would align with business goals
  return Math.floor(Math.random() * 20) + 80; // 80-100%
}

function generateOptimizationSuggestions(metrics, workspaceConfig) {
  const suggestions = [];
  
  if (metrics.tileUtilization < 80) {
    suggestions.push({
      type: 'utilization',
      title: 'Remove Unused Tiles',
      description: 'Consider removing tiles that are rarely accessed to streamline workspace',
      impact: 'medium'
    });
  }
  
  if (metrics.workflowCompleteness < 85) {
    suggestions.push({
      type: 'workflow',
      title: 'Complete Process Flows',
      description: 'Add missing tiles to complete end-to-end business processes',
      impact: 'high'
    });
  }
  
  return suggestions;
}

export default router;