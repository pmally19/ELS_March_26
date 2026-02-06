import express from 'express';
import pg from 'pg';
const { Pool } = pg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Jr. Assistant True AI Navigation and Command Execution API
router.post('/execute', async (req, res) => {
  try {
    const { operation, entity, data, userRole, contextMode, currentPage } = req.body;
    
    // Permission check
    if (!userRole || userRole === 'rookie') {
      return res.json({
        success: false,
        error: 'Insufficient permissions for data operations'
      });
    }

    let result;
    
    // Smart navigation commands
    if (operation === 'navigate') {
      result = await handleSmartNavigation(entity, contextMode, currentPage);
    }
    // Data operations
    else {
      switch (entity) {
        case 'customer':
          result = await handleCustomerOperation(operation, data, userRole);
          break;
        case 'vendor':
          result = await handleVendorOperation(operation, data, userRole);
          break;
        case 'material':
          result = await handleMaterialOperation(operation, data, userRole);
          break;
        case 'employee':
          result = await handleEmployeeOperation(operation, data, userRole);
          break;
        case 'account':
          result = await handleAccountOperation(operation, data, userRole);
          break;
        default:
          result = { success: false, error: `Unknown entity: ${entity}` };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Jr. Actions Error:', error);
    res.json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Smart Navigation Handler - True AI Navigation
async function handleSmartNavigation(destination, contextMode, currentPage) {
  const navigationMap = {
    'report': '/reports',
    'reports': '/reports',
    'reporting': '/reports',
    'dashboard': '/',
    'home': '/',
    'sales': '/sales',
    'inventory': '/inventory',
    'finance': '/finance',
    'hr': '/hr',
    'production': '/production',
    'purchasing': '/purchasing',
    'master data': '/master-data',
    'masterdata': '/master-data',
    'general ledger': '/general-ledger',
    'gl': '/general-ledger',
    'tools': '/tools',
    'admin': '/admin',
    'designer': '/designer-agent'
  };

  const targetUrl = navigationMap[destination.toLowerCase()];
  
  if (targetUrl) {
    return {
      success: true,
      action: 'navigation',
      url: targetUrl,
      message: `Navigating to ${destination}...`,
      contextAware: contextMode === 'entire' ? 'Full application access' : `From ${currentPage}`
    };
  } else {
    return {
      success: false,
      message: `I couldn't find "${destination}". Available options: Reports, Dashboard, Sales, Inventory, Finance, HR, Production, Purchasing, Master Data, General Ledger, Tools, Admin, Designer Agent.`,
      suggestions: Object.keys(navigationMap).slice(0, 8)
    };
  }
}

router.post('/complete', async (req, res) => {
  try {
    const { operation, entity, data, userRole } = req.body;
    
    // Parse additional information and complete the operation
    const completeData = parseAdditionalInfo(data);
    
    let result;
    switch (entity) {
      case 'customer':
        result = await handleCustomerOperation(operation, completeData, userRole);
        break;
      case 'vendor':
        result = await handleVendorOperation(operation, completeData, userRole);
        break;
      case 'material':
        result = await handleMaterialOperation(operation, completeData, userRole);
        break;
      case 'employee':
        result = await handleEmployeeOperation(operation, completeData, userRole);
        break;
      case 'account':
        result = await handleAccountOperation(operation, completeData, userRole);
        break;
      default:
        result = { success: false, error: `Unknown entity: ${entity}` };
    }

    res.json(result);
  } catch (error) {
    console.error('Jr. Complete Action Error:', error);
    res.json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to parse additional information
function parseAdditionalInfo(data) {
  const completeData = { ...data };
  
  if (data.additionalInfo) {
    const info = data.additionalInfo.toLowerCase();
    
    // Extract name if not already present
    if (!completeData.name) {
      completeData.name = data.additionalInfo.trim();
    }
    
    // Extract specific field values
    const emailMatch = info.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      completeData.email = emailMatch[1];
    }
    
    const phoneMatch = info.match(/(\+?[\d\s\-\(\)]{10,})/);
    if (phoneMatch) {
      completeData.phone = phoneMatch[1].trim();
    }
    
    // Extract numeric values
    const numberMatch = info.match(/(\d[\d,.]*)$/);
    if (numberMatch && !completeData.credit_limit) {
      completeData.credit_limit = parseFloat(numberMatch[1].replace(/,/g, ''));
    }
  }
  
  return completeData;
}

// Customer operations
async function handleCustomerOperation(operation, data, userRole) {
  try {
    switch (operation) {
      case 'create':
        if (!data.name) {
          return { success: false, error: 'Customer name is required' };
        }
        
        const insertResult = await pool.query(`
          INSERT INTO erp_customers (name, email, phone, credit_limit, is_active)
          VALUES ($1, $2, $3, $4, true)
          RETURNING id, name, customer_code
        `, [
          data.name,
          data.email || null,
          data.phone || null,
          data.credit_limit || 0
        ]);
        
        return {
          success: true,
          message: `✅ Customer "${data.name}" created successfully with ID ${insertResult.rows[0].id}`,
          data: insertResult.rows[0]
        };
        
      case 'update':
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (data.email) {
          updates.push(`email = $${paramIndex++}`);
          values.push(data.email);
        }
        if (data.phone) {
          updates.push(`phone = $${paramIndex++}`);
          values.push(data.phone);
        }
        if (data.credit_limit !== undefined) {
          updates.push(`credit_limit = $${paramIndex++}`);
          values.push(data.credit_limit);
        }
        
        if (updates.length === 0) {
          return { success: false, error: 'No fields to update' };
        }
        
        // Find customer by name or ID
        const customerQuery = data.name ? 
          `WHERE name ILIKE $${paramIndex}` : 
          `WHERE id = $${paramIndex}`;
        values.push(data.name || data.id);
        
        const updateResult = await pool.query(`
          UPDATE erp_customers 
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          ${customerQuery}
          RETURNING id, name, customer_code
        `, values);
        
        if (updateResult.rows.length === 0) {
          return { success: false, error: 'Customer not found' };
        }
        
        return {
          success: true,
          message: `✅ Customer "${updateResult.rows[0].name}" updated successfully`,
          data: updateResult.rows[0]
        };
        
      default:
        return { success: false, error: `Operation "${operation}" not supported for customers` };
    }
  } catch (error) {
    console.error('Customer operation error:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

// Vendor operations
async function handleVendorOperation(operation, data, userRole) {
  try {
    switch (operation) {
      case 'create':
        if (!data.name) {
          return { success: false, error: 'Vendor name is required' };
        }
        
        const insertResult = await pool.query(`
          INSERT INTO erp_vendors (name, evaluation_score, lead_time, minimum_order_value, is_active)
          VALUES ($1, $2, $3, $4, true)
          RETURNING id, name, vendor_code
        `, [
          data.name,
          data.evaluation_score || 0,
          data.lead_time || 0,
          data.minimum_order_value || 0
        ]);
        
        return {
          success: true,
          message: `✅ Vendor "${data.name}" created successfully with ID ${insertResult.rows[0].id}`,
          data: insertResult.rows[0]
        };
        
      case 'update':
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (data.evaluation_score !== undefined) {
          updates.push(`evaluation_score = $${paramIndex++}`);
          values.push(data.evaluation_score);
        }
        if (data.lead_time !== undefined) {
          updates.push(`lead_time = $${paramIndex++}`);
          values.push(data.lead_time);
        }
        if (data.minimum_order_value !== undefined) {
          updates.push(`minimum_order_value = $${paramIndex++}`);
          values.push(data.minimum_order_value);
        }
        
        if (updates.length === 0) {
          return { success: false, error: 'No fields to update' };
        }
        
        const vendorQuery = data.name ? 
          `WHERE name ILIKE $${paramIndex}` : 
          `WHERE id = $${paramIndex}`;
        values.push(data.name || data.id);
        
        const updateResult = await pool.query(`
          UPDATE erp_vendors 
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          ${vendorQuery}
          RETURNING id, name, vendor_code
        `, values);
        
        if (updateResult.rows.length === 0) {
          return { success: false, error: 'Vendor not found' };
        }
        
        return {
          success: true,
          message: `✅ Vendor "${updateResult.rows[0].name}" updated successfully`,
          data: updateResult.rows[0]
        };
        
      default:
        return { success: false, error: `Operation "${operation}" not supported for vendors` };
    }
  } catch (error) {
    console.error('Vendor operation error:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

// Material operations
async function handleMaterialOperation(operation, data, userRole) {
  try {
    switch (operation) {
      case 'create':
        if (!data.name) {
          return { success: false, error: 'Material name is required' };
        }
        
        const insertResult = await pool.query(`
          INSERT INTO erp_materials (name, description, unit_price, is_active)
          VALUES ($1, $2, $3, true)
          RETURNING id, name, material_code
        `, [
          data.name,
          data.description || '',
          data.unit_price || 0
        ]);
        
        return {
          success: true,
          message: `✅ Material "${data.name}" created successfully with ID ${insertResult.rows[0].id}`,
          data: insertResult.rows[0]
        };
        
      default:
        return { success: false, error: `Operation "${operation}" not supported for materials` };
    }
  } catch (error) {
    console.error('Material operation error:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

// Employee operations (stub)
async function handleEmployeeOperation(operation, data, userRole) {
  return { success: false, error: 'Employee operations not yet implemented' };
}

// Account operations (stub)
async function handleAccountOperation(operation, data, userRole) {
  return { success: false, error: 'Account operations not yet implemented' };
}

export default router;