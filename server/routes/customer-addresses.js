import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get customer addresses
router.get('/:customerId/addresses', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const query = `
      SELECT 
        id, customer_code, name, email, phone,
        -- Main address (sold-to)
        address, city, state, country, postal_code, region,
        
        -- Additional customer fields
        type, description, tax_id, industry, segment,
        website, currency, payment_terms, payment_method,
        credit_limit, credit_rating, discount_group, price_group,
        incoterms, shipping_method, delivery_terms, delivery_route,
        sales_rep_id, parent_customer_id, status, is_b2b, is_b2c, is_vip,
        notes, tags, company_code_id, version,
        
        -- Timestamps
        created_at, updated_at, created_by, updated_by
      FROM erp_customers 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [customerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching customer addresses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customer addresses' 
    });
  }
});

// Update customer addresses
router.put('/:customerId/addresses', async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      // Main address
      address, city, state, country, postal_code, region, phone, email,
      
      // Customer details
      name, type, description, tax_id, industry, segment,
      website, currency, payment_terms, payment_method,
      credit_limit, credit_rating, discount_group, price_group,
      incoterms, shipping_method, delivery_terms, delivery_route,
      sales_rep_id, parent_customer_id, status, is_b2b, is_b2c, is_vip,
      notes, tags, company_code_id
    } = req.body;
    
    const query = `
      UPDATE erp_customers SET
        -- Main address
        address = $2, city = $3, state = $4, country = $5, postal_code = $6, region = $7,
        phone = $8, email = $9,
        
        -- Customer details
        name = $10, type = $11, description = $12, tax_id = $13, industry = $14, segment = $15,
        website = $16, currency = $17, payment_terms = $18, payment_method = $19,
        credit_limit = $20, credit_rating = $21, discount_group = $22, price_group = $23,
        incoterms = $24, shipping_method = $25, delivery_terms = $26, delivery_route = $27,
        sales_rep_id = $28, parent_customer_id = $29, status = $30, is_b2b = $31, is_b2c = $32, is_vip = $33,
        notes = $34, tags = $35, company_code_id = $36,
        
        updated_at = CURRENT_TIMESTAMP, updated_by = 1
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
    
    const values = [
      customerId,
      address, city, state, country, postal_code, region, phone, email,
      name, type, description, tax_id, industry, segment,
      website, currency, payment_terms, payment_method,
      credit_limit, credit_rating, discount_group, price_group,
      incoterms, shipping_method, delivery_terms, delivery_route,
      sales_rep_id, parent_customer_id, status, is_b2b, is_b2c, is_vip,
      notes, tags, company_code_id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Customer addresses updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating customer addresses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update customer addresses' 
    });
  }
});

// Get address by type for a customer
router.get('/:customerId/address/:type', async (req, res) => {
  try {
    const { customerId, type } = req.params;
    
    if (!['sold_to', 'ship_to', 'bill_to', 'payer_to'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid address type. Must be sold_to, ship_to, bill_to, or payer_to' 
      });
    }
    
    // For sold_to, return main customer address from erp_customers
    if (type === 'sold_to') {
      const query = `
        SELECT 
          id, customer_code, name, email, phone,
          address, city, state, country, postal_code, region,
          type, description, tax_id, industry, segment,
          website, currency, payment_terms, payment_method,
          credit_limit, credit_rating, status, is_b2b, is_b2c, is_vip,
          notes, tags, company_code_id
        FROM erp_customers 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await pool.query(query, [customerId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Customer not found' 
        });
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // For other address types, check customer_addresses table
    const query = `
      SELECT 
        id, customer_id, address_type, address_name, contact_person, company_name,
        address_line_1, address_line_2, city, state, country, postal_code, region,
        phone, email, is_primary, is_active, notes, created_at, updated_at
      FROM customer_addresses 
      WHERE customer_id = $1 AND address_type = $2 AND is_active = true
      ORDER BY is_primary DESC, address_name
    `;
    
    const result = await pool.query(query, [customerId, type]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Address not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching customer address:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customer address' 
    });
  }
});

// Get all customers with their address setup summary
router.get('/address-summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        ec.id, ec.name, ec.customer_code, ec.type, ec.status,
        ec.address, ec.city, ec.state, ec.country, ec.postal_code,
        ec.phone, ec.email, ec.currency, ec.payment_terms,
        ec.credit_limit, ec.credit_rating, ec.company_code_id,
        
        -- Count addresses by type
        COUNT(CASE WHEN ca.address_type = 'sold_to' THEN 1 END) as sold_to_count,
        COUNT(CASE WHEN ca.address_type = 'bill_to' THEN 1 END) as bill_to_count,
        COUNT(CASE WHEN ca.address_type = 'ship_to' THEN 1 END) as ship_to_count,
        COUNT(CASE WHEN ca.address_type = 'payer_to' THEN 1 END) as payer_to_count,
        COUNT(ca.id) as total_addresses,
        
        -- Address complexity based on multiple addresses
        CASE 
          WHEN COUNT(ca.id) > 3 THEN 'Multi-Location'
          WHEN COUNT(ca.id) > 1 THEN 'Partial Separation'
          ELSE 'Standard'
        END as address_complexity
      FROM erp_customers ec
      LEFT JOIN customer_addresses ca ON ec.id = ca.customer_id AND ca.is_active = true
      WHERE ec.is_active = true
      GROUP BY ec.id, ec.name, ec.customer_code, ec.type, ec.status,
               ec.address, ec.city, ec.state, ec.country, ec.postal_code,
               ec.phone, ec.email, ec.currency, ec.payment_terms,
               ec.credit_limit, ec.credit_rating, ec.company_code_id
      ORDER BY ec.name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching address summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch address summary' 
    });
  }
});

export default router;
