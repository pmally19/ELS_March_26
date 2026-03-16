import { Router } from 'express';
import { db } from '../db';
import { advancedAIAssistant } from '../services/advanced-ai-assistant';

const router = Router();

// Jr. Assistant Integration for Condition Types
router.get('/conditions/show', async (req, res) => {
  try {
    const { company_code = 'DOM01' } = req.query;
    
    // Get complete condition types with relationships
    const result = await db.execute(`
      SELECT 
        ct.condition_code,
        ct.condition_name,
        cc.category_name,
        cm.method_name,
        cm.calculation_type,
        tj.jurisdiction_name,
        ct.default_value,
        ct.sequence_number,
        ct.is_mandatory,
        ct.is_active,
        ct.description,
        company.name as company_name
      FROM condition_types ct
      JOIN condition_categories cc ON ct.category_id = cc.id
      JOIN calculation_methods cm ON ct.calculation_method_id = cm.id
      LEFT JOIN tax_jurisdictions tj ON ct.tax_jurisdiction_id = tj.id
      JOIN company_codes company ON ct.company_code_id = company.id
      WHERE company.code = '${company_code}' AND ct.is_active = true
      ORDER BY ct.sequence_number, ct.condition_code
    `);

    const conditions = result.rows;
    
    // Format response for Jr. Assistant
    const response = {
      success: true,
      company: company_code,
      total_conditions: conditions.length,
      conditions: conditions.map(condition => ({
        code: condition.condition_code,
        name: condition.condition_name,
        category: condition.category_name,
        calculation: condition.calculation_type,
        value: condition.default_value,
        sequence: condition.sequence_number,
        mandatory: condition.is_mandatory,
        description: condition.description,
        jurisdiction: condition.jurisdiction_name || 'N/A'
      })),
      summary: {
        revenue_conditions: conditions.filter(c => c.category_name === 'Revenue').length,
        cost_conditions: conditions.filter(c => c.category_name === 'Cost').length,
        discount_conditions: conditions.filter(c => c.category_name === 'Discount').length,
        tax_conditions: conditions.filter(c => c.category_name === 'Tax').length,
        fee_conditions: conditions.filter(c => c.category_name === 'Fee').length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Jr. Integration Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve condition types',
      message: 'Jr. could not access the condition data'
    });
  }
});

// Jr. Assistant - Bring up condition screen
router.get('/conditions/screen', async (req, res) => {
  try {
    const { company_code = 'DOM01' } = req.query;
    
    // Get screen navigation information
    const screenInfo = {
      success: true,
      screen_name: 'Condition Types Management',
      url_path: '/condition-types-management',
      company: company_code,
      available_actions: [
        'View all condition types',
        'Create new condition type',
        'Edit existing conditions',
        'Set calculation dependencies',
        'Configure access rules'
      ],
      quick_access: {
        api_endpoint: `/api/condition-types?company_code=${company_code}`,
        frontend_route: '/condition-types-management',
        data_endpoint: `/api/jr/conditions/show?company_code=${company_code}`
      }
    };

    res.json(screenInfo);
  } catch (error) {
    console.error('Jr. Screen Integration Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to access condition screen'
    });
  }
});

// Jr. Assistant - Get condition details by code
router.get('/conditions/:condition_code', async (req, res) => {
  try {
    const { condition_code } = req.params;
    const { company_code = 'DOM01' } = req.query;
    
    const result = await db.execute(`
      SELECT 
        ct.*,
        cc.category_name,
        cm.method_name,
        cm.calculation_type,
        tj.jurisdiction_name,
        company.name as company_name
      FROM condition_types ct
      JOIN condition_categories cc ON ct.category_id = cc.id
      JOIN calculation_methods cm ON ct.calculation_method_id = cm.id
      LEFT JOIN tax_jurisdictions tj ON ct.tax_jurisdiction_id = tj.id
      JOIN company_codes company ON ct.company_code_id = company.id
      WHERE ct.condition_code = '${condition_code}' AND company.code = '${company_code}'
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Condition type '${condition_code}' not found for company ${company_code}`
      });
    }

    const condition = result.rows[0];
    
    res.json({
      success: true,
      condition: {
        code: condition.condition_code,
        name: condition.condition_name,
        category: condition.category_name,
        calculation_method: condition.method_name,
        calculation_type: condition.calculation_type,
        default_value: condition.default_value,
        min_value: condition.min_value,
        max_value: condition.max_value,
        sequence: condition.sequence_number,
        mandatory: condition.is_mandatory,
        active: condition.is_active,
        description: condition.description,
        jurisdiction: condition.jurisdiction_name,
        company: condition.company_name
      }
    });
  } catch (error) {
    console.error('Jr. Condition Detail Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve condition details'
    });
  }
});

// Jr. Assistant - Help commands
router.get('/help', async (req, res) => {
  res.json({
    success: true,
    available_commands: {
      'show conditions': 'GET /api/jr/conditions/show?company_code=DOM01',
      'bring condition screen': 'GET /api/jr/conditions/screen?company_code=DOM01',
      'get condition details': 'GET /api/jr/conditions/{condition_code}?company_code=DOM01'
    },
    examples: [
      'Jr., show me the defined conditions for Dominos',
      'Jr., bring up the condition screen',
      'Jr., get details for PIZZA_BASE condition',
      'Jr., show me all tax conditions'
    ]
  });
});

// Enhanced AI Assistant Route for Jr.
router.post('/enhanced-chat', async (req, res) => {
  try {
    const { message, context = {}, pageContext = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Process with Advanced AI Assistant
    const result = await advancedAIAssistant.processAdvancedQuery(message, {
      userRole: context.userRole || 'User',
      currentPage: pageContext,
      // timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      response: result.response,
      actions: result.actions || [],
      suggestions: result.suggestions || [],
      metadata: {
        aiModel: 'gpt-4o',
        intelligence: 'enhanced',
        processingTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Enhanced Jr. AI Error:', error);
    res.status(500).json({
      success: false,
      error: 'Enhanced AI processing failed',
      fallback: 'Jr. Assistant is experiencing enhanced AI issues. Please try a simpler query.'
    });
  }
});

export default router;