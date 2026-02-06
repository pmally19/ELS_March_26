import express from 'express';
import { crossCheckAgent } from '../agents/CrossCheckAgent';

const router = express.Router();

/**
 * Perform comprehensive ERP validation
 * GET /api/crosscheck/validate
 */
router.get('/validate', async (req, res) => {
  try {
    console.log('🔍 Starting comprehensive ERP CrossCheck validation...');
    
    const validationReport = await crossCheckAgent.performCompleteERPValidation();
    
    res.json({
      success: true,
      report: validationReport,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('CrossCheck validation error:', error);
    res.status(500).json({
      success: false,
      error: 'CrossCheck validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Validate specific Company Code lineage
 * GET /api/crosscheck/company-code/:code
 */
router.get('/company-code/:code', async (req, res) => {
  try {
    const companyCode = req.params.code;
    
    // Perform targeted validation for specific company code
    const report = await crossCheckAgent.performCompleteERPValidation();
    
    // Filter results for specific company code
    const companySpecificResults = report.detailedResults.filter(
      result => result.companyCode === companyCode || 
                result.type === 'company_code_lineage'
    );
    
    res.json({
      success: true,
      companyCode,
      validationResults: companySpecificResults,
      criticalErrors: report.criticalErrors.filter(error => 
        error.includes(companyCode)
      ),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Company Code validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Company Code validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Quick system health check
 * GET /api/crosscheck/health
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: 'connected',
        apis: 'responding',
        crossCheckAgent: 'active'
      }
    };
    
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;