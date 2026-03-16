/**
 * AI Agent Actions - Execute Real Database Operations
 * 
 * This module enables AI agents to perform actual database operations
 * based on user requests and role permissions
 */

import pkg from 'pg';
const { Pool } = pkg;

class AIAgentActions {
  constructor(dbPool, userRole = 'rookie') {
    this.dbPool = dbPool;
    this.userRole = userRole;
    this.permissions = this.getRolePermissions(userRole);
  }

  getRolePermissions(role) {
    const permissions = {
      rookie: ['read'],
      coach: ['read', 'create'],
      player: ['read', 'create', 'update'],
      chief: ['read', 'create', 'update', 'delete', 'admin']
    };
    return permissions[role] || ['read'];
  }

  canPerformAction(action) {
    return this.permissions.includes(action);
  }

  // SALES ACTIONS
  async searchCustomers(searchTerm) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to search customers' };
    }

    try {
      const query = `
        SELECT c.id, c.name, c.email, c.phone, c.address, c.type,
               c.credit_limit, c.outstanding_balance, c.created_at, c.is_active
        FROM customers c 
        WHERE c.name ILIKE $1 
           OR c.email ILIKE $1 
           OR c.address ILIKE $1
        ORDER BY c.name
        LIMIT 20
      `;
      
      const result = await this.dbPool.query(query, [`%${searchTerm}%`]);
      
      // Format concise response for interactive display
      let displayText = `📋 **Customers** (${result.rows.length} found)\n\n`;
      
      if (result.rows.length === 0) {
        displayText += `No customers found. Use "create customer [name]" to add new customer.`;
      } else {
        // Show first 5 customers with essential info only
        const displayCount = Math.min(5, result.rows.length);
        result.rows.slice(0, displayCount).forEach((customer, index) => {
          displayText += `**${index + 1}. ${customer.name}** - ${customer.type || 'Standard'} - $${customer.credit_limit || '0'} limit\n`;
        });
        
        if (result.rows.length > 5) {
          displayText += `\n...and ${result.rows.length - 5} more. Use "take me to customer page" for full management.`;
        }
      }
      
      return {
        success: true,
        action: 'search_customers',
        data: result.rows,
        count: result.rows.length,
        message: displayText
      };
    } catch (error) {
      console.error('Error searching customers:', error);
      return { error: 'Failed to search customers', details: error.message };
    }
  }

  async searchVendors(searchTerm) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to search vendors' };
    }

    try {
      const query = `
        SELECT v.id, v.vendor_code, v.name, v.evaluation_score, 
               v.lead_time, v.minimum_order_value, v.is_active, v.created_at
        FROM erp_vendors v 
        WHERE v.name ILIKE $1 
           OR v.vendor_code ILIKE $1 
        ORDER BY v.name
        LIMIT 10
      `;
      
      const result = await this.dbPool.query(query, [`%${searchTerm}%`]);
      
      // Format concise vendor response
      let displayText = `🏢 **Vendor Information**\n\n`;
      
      if (result.rows.length === 0) {
        displayText += `No vendors found. Navigate to Purchase module for vendor management.`;
      } else {
        displayText += `Found ${result.rows.length} vendors:\n\n`;
        
        const displayCount = Math.min(5, result.rows.length);
        result.rows.slice(0, displayCount).forEach((vendor, index) => {
          displayText += `**${index + 1}. ${vendor.name}** (${vendor.vendor_code}) - Score: ${vendor.evaluation_score || 'N/A'}\n`;
        });
        
        if (result.rows.length > 5) {
          displayText += `\n...and ${result.rows.length - 5} more vendors.`;
        }
        
        displayText += `Use "take me to vendor page" to manage vendors.`;
      }
      
      return {
        success: true,
        action: 'search_vendors',
        data: result.rows,
        count: result.rows.length,
        message: displayText
      };
    } catch (error) {
      console.error('Error searching vendors:', error);
      return { error: 'Failed to search vendors', details: error.message };
    }
  }

  async createCustomer(customerData) {
    console.log(`🔑 CreateCustomer - Role: ${this.userRole}, Permissions: ${this.permissions}, Can create: ${this.canPerformAction('create')}`);
    if (!this.canPerformAction('create')) {
      return { error: 'Insufficient permissions to create customers' };
    }

    try {
      const query = `
        INSERT INTO customers (name, email, phone, address, type, credit_limit)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        customerData.name,
        customerData.email,
        customerData.phone,
        customerData.address,
        customerData.type || 'Regular',
        customerData.creditLimit || 10000
      ];
      
      const result = await this.dbPool.query(query, values);
      
      const newCustomer = result.rows[0];
      
      // Format interactive response for customer creation
      let displayText = `✅ **Customer Created Successfully**\n\n`;
      displayText += `**New Customer Details:**\n`;
      displayText += `🏢 Name: ${newCustomer.name}\n`;
      displayText += `📧 Email: ${newCustomer.email}\n`;
      displayText += `📞 Phone: ${newCustomer.phone}\n`;
      displayText += `📍 Address: ${newCustomer.address}\n`;
      displayText += `🏷️ Type: ${newCustomer.type}\n`;
      displayText += `💳 Credit Limit: $${newCustomer.credit_limit}\n`;
      displayText += `🆔 Customer ID: ${newCustomer.id}\n\n`;
      displayText += `**What would you like to do next?**\n`;
      displayText += `• "Create sales order for ${newCustomer.name}" - Start new order\n`;
      displayText += `• "Edit customer ${newCustomer.name}" - Modify details\n`;
      displayText += `• "Show all customers" - View customer list\n`;
      displayText += `• "Create another customer" - Add more customers`;
      
      return {
        success: true,
        action: 'create_customer',
        data: newCustomer,
        message: displayText
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { error: 'Failed to create customer', details: error.message };
    }
  }

  async searchSalesOrders(searchTerm) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to search sales orders' };
    }

    try {
      const query = `
        SELECT so.id, so.order_number, so.customer_id, c.customer_name,
               so.order_date, so.delivery_date, so.total_amount, so.status,
               so.payment_terms, so.shipping_method
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.order_number ILIKE $1 
           OR c.customer_name ILIKE $1
           OR so.status ILIKE $1
        ORDER BY so.order_date DESC
        LIMIT 20
      `;
      
      const result = await this.dbPool.query(query, [`%${searchTerm}%`]);
      
      return {
        success: true,
        action: 'search_sales_orders',
        data: result.rows,
        count: result.rows.length,
        message: `Found ${result.rows.length} sales orders matching "${searchTerm}"`
      };
    } catch (error) {
      console.error('Error searching sales orders:', error);
      return { error: 'Failed to search sales orders', details: error.message };
    }
  }

  // INVENTORY ACTIONS
  async searchMaterials(searchTerm) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to search materials' };
    }

    try {
      const query = `
        SELECT m.id, m.code, m.name, m.type,
               m.description, m.base_unit_price, m.cost, m.created_at
        FROM materials m 
        WHERE m.code ILIKE $1 
           OR m.name ILIKE $1 
           OR m.description ILIKE $1
           OR m.type ILIKE $1
        ORDER BY m.code
        LIMIT 20
      `;
      
      const result = await this.dbPool.query(query, [`%${searchTerm}%`]);
      
      return {
        success: true,
        action: 'search_materials',
        data: result.rows,
        count: result.rows.length,
        message: `Found ${result.rows.length} materials matching "${searchTerm}"`
      };
    } catch (error) {
      console.error('Error searching materials:', error);
      return { error: 'Failed to search materials', details: error.message };
    }
  }

  async checkStockLevels(materialId) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to check stock levels' };
    }

    try {
      const query = `
        SELECT sl.storage_location_id, sl.plant_id, p.plant_name,
               sl.location_name, sl.unrestricted_stock, sl.quality_inspection_stock,
               sl.blocked_stock, sl.reserved_stock
        FROM storage_locations sl
        LEFT JOIN plants p ON sl.plant_id = p.id
        WHERE sl.material_id = $1
        ORDER BY sl.plant_id, sl.location_name
      `;
      
      const result = await this.dbPool.query(query, [materialId]);
      
      return {
        success: true,
        action: 'check_stock_levels',
        data: result.rows,
        count: result.rows.length,
        message: `Stock levels for material ID ${materialId} across ${result.rows.length} locations`
      };
    } catch (error) {
      console.error('Error checking stock levels:', error);
      return { error: 'Failed to check stock levels', details: error.message };
    }
  }

  // FINANCE ACTIONS
  async searchGLAccounts(searchTerm) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to search GL accounts' };
    }

    try {
      const query = `
        SELECT gl.id, gl.account_number, gl.account_name, gl.account_type,
               gl.balance_sheet_account, gl.pl_account, gl.created_at
        FROM gl_accounts gl 
        WHERE gl.account_number ILIKE $1 
           OR gl.account_name ILIKE $1 
           OR gl.account_type ILIKE $1
        ORDER BY gl.account_number
        LIMIT 20
      `;
      
      const result = await this.dbPool.query(query, [`%${searchTerm}%`]);
      
      return {
        success: true,
        action: 'search_gl_accounts',
        data: result.rows,
        count: result.rows.length,
        message: `Found ${result.rows.length} GL accounts matching "${searchTerm}"`
      };
    } catch (error) {
      console.error('Error searching GL accounts:', error);
      return { error: 'Failed to search GL accounts', details: error.message };
    }
  }

  async createJournalEntry(entryData) {
    if (!this.canPerformAction('create')) {
      return { error: 'Insufficient permissions to create journal entries' };
    }

    try {
      const query = `
        INSERT INTO journal_entries (document_number, posting_date, document_date, 
                                   reference, header_text, currency_code, exchange_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        entryData.documentNumber || `JE${Date.now()}`,
        entryData.postingDate || new Date(),
        entryData.documentDate || new Date(),
        entryData.reference,
        entryData.headerText,
        entryData.currency || 'USD',
        entryData.exchangeRate || 1.0
      ];
      
      const result = await this.dbPool.query(query, values);
      
      return {
        success: true,
        action: 'create_journal_entry',
        data: result.rows[0],
        message: `Successfully created journal entry: ${result.rows[0].document_number}`
      };
    } catch (error) {
      console.error('Error creating journal entry:', error);
      return { error: 'Failed to create journal entry', details: error.message };
    }
  }

  // GENERAL DATA DISPLAY
  async getRecentActivity(moduleType, limit = 10) {
    if (!this.canPerformAction('read')) {
      return { error: 'Insufficient permissions to view recent activity' };
    }

    try {
      let query;
      let tableName;
      
      switch (moduleType) {
        case 'sales':
          query = `
            SELECT 'sales_order' as type, id, order_number as reference, 
                   order_date as date, total_amount as amount, status
            FROM sales_orders 
            ORDER BY order_date DESC 
            LIMIT $1
          `;
          break;
        case 'inventory':
          query = `
            SELECT 'stock_movement' as type, id, movement_type as reference,
                   posting_date as date, quantity as amount, 'Completed' as status
            FROM stock_movements 
            ORDER BY posting_date DESC 
            LIMIT $1
          `;
          break;
        case 'finance':
          query = `
            SELECT 'journal_entry' as type, id, document_number as reference,
                   posting_date as date, 0 as amount, 'Posted' as status
            FROM journal_entries 
            ORDER BY posting_date DESC 
            LIMIT $1
          `;
          break;
        default:
          return { error: 'Unknown module type for recent activity' };
      }
      
      const result = await this.dbPool.query(query, [limit]);
      
      return {
        success: true,
        action: 'get_recent_activity',
        data: result.rows,
        count: result.rows.length,
        message: `Recent ${moduleType} activity (${result.rows.length} items)`
      };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return { error: 'Failed to get recent activity', details: error.message };
    }
  }

  // INTELLIGENT ACTION PARSER
  async parseAndExecuteAction(userInput, moduleType) {
    const input = userInput.toLowerCase();
    
    // Search operations - handle vendors and customers
    if (input.includes('search') || input.includes('find') || input.includes('show') || input.includes('display') || input.includes('list')) {
      if (input.includes('vendor')) {
        const searchTerm = this.extractSearchTerm(input, 'vendor');
        return await this.searchVendors(searchTerm);
      }
      
      if (input.includes('customer')) {
        const searchTerm = this.extractSearchTerm(input, 'customer');
        return await this.searchCustomers(searchTerm);
      }
      
      if (input.includes('sales order') || input.includes('order')) {
        const searchTerm = this.extractSearchTerm(input, 'order');
        return await this.searchSalesOrders(searchTerm);
      }
      
      if (input.includes('material') || input.includes('product')) {
        const searchTerm = this.extractSearchTerm(input, 'material');
        return await this.searchMaterials(searchTerm);
      }
      
      if (input.includes('gl account') || input.includes('account')) {
        const searchTerm = this.extractSearchTerm(input, 'account');
        return await this.searchGLAccounts(searchTerm);
      }
      
      if (input.includes('stock') || input.includes('inventory')) {
        const materialId = this.extractMaterialId(input);
        if (materialId) {
          return await this.checkStockLevels(materialId);
        }
      }
    }
    
    // Create operations - more flexible matching
    if ((input.includes('create') && input.includes('customer')) || 
        (input.includes('add') && input.includes('customer')) || 
        (input.includes('new') && input.includes('customer'))) {
      const customerData = this.extractCustomerData(input);
      return await this.createCustomer(customerData);
    }
    
    if ((input.includes('create') && input.includes('journal')) || 
        (input.includes('add') && input.includes('journal')) || 
        (input.includes('new') && input.includes('journal'))) {
      const entryData = this.extractJournalEntryData(input);
      return await this.createJournalEntry(entryData);
    }
    
    // Display recent activity
    if (input.includes('recent') || input.includes('activity') || input.includes('latest')) {
      return await this.getRecentActivity(moduleType);
    }
    
    return { 
      error: 'Could not understand the requested action',
      suggestion: 'Try: "search customers", "show recent sales orders", "create new customer", etc.'
    };
  }

  extractSearchTerm(input, type) {
    // Extract search term after keywords
    const patterns = [
      new RegExp(`search ${type}s? for (.+)`, 'i'),
      new RegExp(`find ${type}s? (.+)`, 'i'),
      new RegExp(`show ${type}s? (.+)`, 'i'),
      new RegExp(`${type}s? (.+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'all';
  }

  extractMaterialId(input) {
    const match = input.match(/material\s+(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  extractCustomerData(input) {
    const customerData = {
      name: 'New Customer',
      email: 'customer@example.com',
      phone: '555-0000',
      address: '123 Main St',
      type: 'Regular',
      creditLimit: 10000
    };

    // Extract customer name
    const nameMatch = input.match(/create (?:new )?customer (\w+)/i);
    if (nameMatch) {
      customerData.name = nameMatch[1];
    }

    // Extract email
    const emailMatch = input.match(/(?:with )?email (\S+@\S+\.\S+)/i);
    if (emailMatch) {
      customerData.email = emailMatch[1];
    }

    // Extract phone
    const phoneMatch = input.match(/(?:phone|tel|telephone) ([\d\-\(\) ]+)/i);
    if (phoneMatch) {
      customerData.phone = phoneMatch[1];
    }

    // Extract type
    if (input.includes('corporate')) {
      customerData.type = 'Corporate';
    } else if (input.includes('premium')) {
      customerData.type = 'Premium';
    }

    return customerData;
  }

  extractJournalEntryData(input) {
    return {
      reference: 'AI Generated Entry',
      headerText: 'Created by AI Agent',
      currency: 'USD',
      exchangeRate: 1.0
    };
  }
}

export default AIAgentActions;