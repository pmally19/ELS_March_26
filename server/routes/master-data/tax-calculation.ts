import { Router } from 'express';
import { taxCalculationService } from '../../services/tax-calculation-service';

const router = Router();

/**
 * Calculate tax for a transaction
 * POST /api/master-data/tax-calculation/calculate
 * 
 * Body: {
 *   profileCode?: string,
 *   materialCode: string,
 *   customerCode?: string,
 *   shipToCountry?: string,
 *   shipToState?: string,
 *   shipToCounty?: string,
 *   shipToCity?: string,
 *   baseAmount: number,
 *   quantity: number,
 *   transactionDate: Date,
 *   taxType: 'INPUT' | 'OUTPUT' | 'WITHHOLDING'
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const calculationRequest = req.body;
    
    // Validate required fields
    if (!calculationRequest.materialCode || !calculationRequest.baseAmount) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'materialCode and baseAmount are required' 
      });
    }

    // Set default values
    if (!calculationRequest.transactionDate) {
      calculationRequest.transactionDate = new Date();
    }
    if (!calculationRequest.quantity) {
      calculationRequest.quantity = 1;
    }
    if (!calculationRequest.taxType) {
      calculationRequest.taxType = 'OUTPUT';
    }

    const result = await taxCalculationService.calculateTax(calculationRequest);
    
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Tax calculation failed', 
      details: e?.message 
    });
  }
});

/**
 * Get tax rate for a specific combination
 * GET /api/master-data/tax-calculation/rate?profileCode=US01&ruleCode=VAT01
 */
router.get('/rate', async (req, res) => {
  try {
    const { profileCode, ruleCode } = req.query as { profileCode: string; ruleCode: string };

    if (!profileCode || !ruleCode) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        details: 'profileCode and ruleCode are required' 
      });
    }

    const rate = await taxCalculationService.getTaxRate(profileCode, ruleCode);
    
    return res.json({ rate });
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Failed to get tax rate', 
      details: e?.message 
    });
  }
});

/**
 * Validate tax setup
 * GET /api/master-data/tax-calculation/validate
 */
router.get('/validate', async (req, res) => {
  try {
    const validation = await taxCalculationService.validateTaxSetup();
    
    return res.json(validation);
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Validation failed', 
      details: e?.message 
    });
  }
});

/**
 * Get all tax profiles with details
 * GET /api/master-data/tax-calculation/profiles
 */
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await taxCalculationService.getAllTaxProfilesWithDetails();
    
    return res.json(profiles);
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch tax profiles', 
      details: e?.message 
    });
  }
});

export default router;

