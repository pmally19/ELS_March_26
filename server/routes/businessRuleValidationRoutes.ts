/**
 * Business Rule Validation API Routes
 * Handles business exception validation and error message generation
 */

import { Router } from 'express';
import { businessRuleValidator } from '../services/businessRuleValidation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const MultiCurrencyPaymentSchema = z.object({
  companyCode: z.string(),
  vendorCode: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.string()
});

const AccountClosureSchema = z.object({
  accountNumber: z.string(),
  companyCode: z.string(),
  closureDate: z.string().transform((str) => new Date(str)),
  reason: z.string()
});

const CrossBorderTaxSchema = z.object({
  companyCode: z.string(),
  vendorCountry: z.string().length(2),
  amount: z.number().positive(),
  currency: z.string().length(3),
  productCategory: z.string()
});

const PayrollProcessingSchema = z.object({
  companyCode: z.string(),
  payPeriod: z.string(),
  employeeCount: z.number().int().min(0),
  totalAmount: z.number().positive(),
  payrollAccountNumber: z.string()
});

/**
 * POST /api/business-rules/validate/multi-currency-payment
 * Validates multi-currency payment processing
 */
router.post('/validate/multi-currency-payment', async (req, res) => {
  try {
    const validatedData = MultiCurrencyPaymentSchema.parse(req.body);
    const exceptions = await businessRuleValidator.validateMultiCurrencyPayment(validatedData);
    
    res.json({
      success: true,
      exceptions,
      hasErrors: exceptions.some(e => e.severity === 'ERROR'),
      hasWarnings: exceptions.some(e => e.severity === 'WARNING')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      exceptions: [{
        code: 'VALIDATION_ERROR',
        message: 'Invalid payment data provided',
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * POST /api/business-rules/validate/account-closure
 * Validates account closure with business rules
 */
router.post('/validate/account-closure', async (req, res) => {
  try {
    const validatedData = AccountClosureSchema.parse(req.body);
    const exceptions = await businessRuleValidator.validateAccountClosure(validatedData);
    
    res.json({
      success: true,
      exceptions,
      hasErrors: exceptions.some(e => e.severity === 'ERROR'),
      hasWarnings: exceptions.some(e => e.severity === 'WARNING'),
      canClose: !exceptions.some(e => e.severity === 'ERROR')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      exceptions: [{
        code: 'VALIDATION_ERROR',
        message: 'Invalid account closure data provided',
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * POST /api/business-rules/validate/cross-border-tax
 * Validates cross-border tax compliance
 */
router.post('/validate/cross-border-tax', async (req, res) => {
  try {
    const validatedData = CrossBorderTaxSchema.parse(req.body);
    const exceptions = await businessRuleValidator.validateCrossBorderTaxCompliance(validatedData);
    
    res.json({
      success: true,
      exceptions,
      hasErrors: exceptions.some(e => e.severity === 'ERROR'),
      hasWarnings: exceptions.some(e => e.severity === 'WARNING'),
      requiresReview: exceptions.some(e => e.severity === 'WARNING')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      exceptions: [{
        code: 'VALIDATION_ERROR',
        message: 'Invalid tax compliance data provided',
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * POST /api/business-rules/validate/payroll-processing
 * Validates payroll processing rules
 */
router.post('/validate/payroll-processing', async (req, res) => {
  try {
    const validatedData = PayrollProcessingSchema.parse(req.body);
    const exceptions = await businessRuleValidator.validatePayrollProcessing(validatedData);
    
    res.json({
      success: true,
      exceptions,
      hasErrors: exceptions.some(e => e.severity === 'ERROR'),
      hasWarnings: exceptions.some(e => e.severity === 'WARNING'),
      canProcess: !exceptions.some(e => e.severity === 'ERROR')
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      exceptions: [{
        code: 'VALIDATION_ERROR',
        message: 'Invalid payroll data provided',
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * POST /api/business-rules/validate/general
 * General business rule validation endpoint
 */
router.post('/validate/general', async (req, res) => {
  try {
    const { ruleType, data } = req.body;
    
    if (!ruleType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Rule type and data are required',
        exceptions: [{
          code: 'MISSING_PARAMETERS',
          message: 'Rule type and data parameters are required',
          severity: 'ERROR'
        }]
      });
    }
    
    const exceptions = await businessRuleValidator.validateBusinessRule(ruleType, data);
    
    res.json({
      success: true,
      ruleType,
      exceptions,
      hasErrors: exceptions.some(e => e.severity === 'ERROR'),
      hasWarnings: exceptions.some(e => e.severity === 'WARNING')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      exceptions: [{
        code: 'VALIDATION_ERROR',
        message: 'Business rule validation failed',
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * GET /api/business-rules/test-scenarios
 * Get test scenarios for business rule validation
 */
router.get('/test-scenarios', async (req, res) => {
  const testScenarios = [
    {
      name: 'US Company paying Canadian supplier',
      ruleType: 'MULTI_CURRENCY_PAYMENT',
      data: {
        companyCode: 'US001',
        vendorCode: 'CA_SUPPLIER_001',
        amount: 15000,
        currency: 'CAD',
        paymentMethod: 'WIRE_TRANSFER'
      }
    },
    {
      name: 'Closing payroll account with unprocessed salaries',
      ruleType: 'ACCOUNT_CLOSURE',
      data: {
        accountNumber: '2100-PAYROLL',
        companyCode: 'US001',
        closureDate: '2025-07-15',
        reason: 'Account restructuring'
      }
    },
    {
      name: 'Large purchase from Mexico',
      ruleType: 'CROSS_BORDER_TAX',
      data: {
        companyCode: 'US001',
        vendorCountry: 'MX',
        amount: 25000,
        currency: 'MXN',
        productCategory: 'MANUFACTURED_GOODS'
      }
    },
    {
      name: 'Payroll processing with insufficient funds',
      ruleType: 'PAYROLL_PROCESSING',
      data: {
        companyCode: 'US001',
        payPeriod: '2025-07',
        employeeCount: 25,
        totalAmount: 125000,
        payrollAccountNumber: '2100-PAYROLL'
      }
    }
  ];
  
  res.json({
    success: true,
    scenarios: testScenarios
  });
});

export default router;