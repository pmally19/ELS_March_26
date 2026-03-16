/**
 * SYSTEM ANALYSIS API ROUTES
 * Provides endpoints for real codebase analysis and "existing vs missing" comparison
 */

import { Router, Request, Response } from 'express';
import { SystemAnalysisAgent } from '../services/system-analysis-agent';

const router = Router();
const systemAgent = new SystemAnalysisAgent();

/**
 * GET /api/system-analysis/overview
 * Get complete system overview with database, API, and UI statistics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Starting system overview analysis...');
    const analysis = await systemAgent.analyzeSystem();
    
    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in system overview analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze system overview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-analysis/module/:moduleName
 * Get detailed analysis for a specific module
 */
router.get('/module/:moduleName', async (req: Request, res: Response) => {
  try {
    const { moduleName } = req.params;
    console.log(`🔍 Analyzing module: ${moduleName}`);
    
    const analysis = await systemAgent.analyzeSystem(moduleName);
    const moduleData = analysis.modules[moduleName];
    
    if (!moduleData) {
      return res.status(404).json({
        success: false,
        error: `Module '${moduleName}' not found`
      });
    }
    
    res.json({
      success: true,
      data: {
        module: moduleData,
        overview: analysis.overview,
        recommendations: analysis.recommendations.filter(r => 
          r.toLowerCase().includes(moduleName)
        )
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error analyzing module ${req.params.moduleName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze module',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-analysis/compare
 * Compare document requirements against actual system capabilities
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { documentAnalysis, targetModule } = req.body;
    
    console.log(`🔍 Comparing requirements against system${targetModule ? ` (module: ${targetModule})` : ''}`);
    
    const comparison = await systemAgent.compareWithDocument(documentAnalysis, targetModule);
    
    res.json({
      success: true,
      data: comparison,
      metadata: {
        totalRequirements: (comparison.alreadyHave.length + comparison.needToAdd.length),
        implementationRate: Math.round((comparison.alreadyHave.length / (comparison.alreadyHave.length + comparison.needToAdd.length)) * 100),
        targetModule: targetModule || 'all'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in requirements comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare requirements',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-analysis/database
 * Get detailed database analysis
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Analyzing database structure...');
    
    // Get full system analysis but focus on database
    const analysis = await systemAgent.analyzeSystem();
    
    // Aggregate database information across all modules
    const allTables = Object.values(analysis.modules).flatMap(module => 
      module.components.database
    );
    
    // Group by module
    const tablesByModule: Record<string, any[]> = {};
    for (const [moduleName, module] of Object.entries(analysis.modules)) {
      tablesByModule[moduleName] = module.components.database;
    }
    
    res.json({
      success: true,
      data: {
        overview: analysis.overview.database,
        tablesByModule,
        allTables: allTables.length,
        tablesWithData: allTables.filter(t => t.has_data).length,
        totalRecords: allTables.reduce((sum, t) => sum + t.record_count, 0)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze database',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-analysis/api
 * Get detailed API endpoints analysis
 */
router.get('/api', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Analyzing API endpoints...');
    
    const analysis = await systemAgent.analyzeSystem();
    
    // Aggregate API information
    const allAPIs = Object.values(analysis.modules).flatMap(module => 
      module.components.api
    );
    
    // Group by module and method
    const apisByModule: Record<string, any[]> = {};
    const apisByMethod: Record<string, any[]> = {};
    
    for (const [moduleName, module] of Object.entries(analysis.modules)) {
      apisByModule[moduleName] = module.components.api;
    }
    
    for (const api of allAPIs) {
      if (!apisByMethod[api.method]) {
        apisByMethod[api.method] = [];
      }
      apisByMethod[api.method].push(api);
    }
    
    res.json({
      success: true,
      data: {
        overview: analysis.overview.api,
        apisByModule,
        apisByMethod,
        totalEndpoints: allAPIs.length,
        uniqueFiles: Array.from(new Set(allAPIs.map(a => a.file))).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing API endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze API endpoints',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-analysis/ui
 * Get detailed UI components analysis
 */
router.get('/ui', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Analyzing UI components...');
    
    const analysis = await systemAgent.analyzeSystem();
    
    // Aggregate UI information
    const allComponents = Object.values(analysis.modules).flatMap(module => 
      module.components.ui
    );
    
    // Group by module and type
    const componentsByModule: Record<string, any[]> = {};
    const componentsByType: Record<string, any[]> = {};
    
    for (const [moduleName, module] of Object.entries(analysis.modules)) {
      componentsByModule[moduleName] = module.components.ui;
    }
    
    for (const component of allComponents) {
      if (!componentsByType[component.type]) {
        componentsByType[component.type] = [];
      }
      componentsByType[component.type].push(component);
    }
    
    res.json({
      success: true,
      data: {
        overview: analysis.overview.ui,
        componentsByModule,
        componentsByType,
        totalComponents: allComponents.length,
        pages: allComponents.filter(c => c.type === 'page').length,
        components: allComponents.filter(c => c.type === 'component').length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing UI components:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze UI components',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-analysis/health
 * Get system health and capability scores
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Checking system health...');
    
    const analysis = await systemAgent.analyzeSystem();
    
    // Calculate health scores
    const moduleHealth = Object.entries(analysis.modules).map(([name, module]) => ({
      name,
      status: module.status,
      confidence: module.confidence,
      components: {
        database: module.components.database.length,
        api: module.components.api.length,
        ui: module.components.ui.length
      }
    }));
    
    const overallHealth = {
      implementation: moduleHealth.filter(m => m.status === 'implemented').length,
      partial: moduleHealth.filter(m => m.status === 'partial').length,
      missing: moduleHealth.filter(m => m.status === 'missing').length,
      averageConfidence: Math.round(
        moduleHealth.reduce((sum, m) => sum + m.confidence, 0) / moduleHealth.length
      )
    };
    
    res.json({
      success: true,
      data: {
        overallHealth,
        moduleHealth,
        recommendations: analysis.recommendations,
        systemOverview: analysis.overview
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;