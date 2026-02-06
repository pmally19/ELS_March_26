/**
 * REAL AI Agent Automation System
 * This actually executes database operations instead of just pretending
 */

import { db } from '../db';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class RealAIAutomation {
  private async executeAction(action: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      console.log(`🤖 EXECUTING REAL ACTION: ${action.type}`, action.data);
      
      switch (action.type) {
        case 'create_customer':
          return await this.createCustomer(action.data);
        case 'create_lead':
          return await this.createLead(action.data);
        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      console.error('❌ ACTION EXECUTION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async createCustomer(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const customerName = data.name || data.customer_name || 'Unknown Customer';
      const customerEmail = data.email || `contact@${customerName.toLowerCase().replace(/\s+/g, '')}.com`;
      const customerCode = data.code || `CUST-${Date.now()}`;
      
      const result = await db.execute(`
        INSERT INTO customers 
        (name, email, phone, address, notes, code, type, company_code_id, credit_limit, credit_rating, outstanding_balance, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        customerName,
        customerEmail,
        data.phone || '+1-555-0000',
        data.address || 'Not provided',
        data.notes || `Created by AI Agent on ${new Date().toISOString()}`,
        customerCode,
        data.type || 'STANDARD',
        data.company_code_id || 1,
        data.credit_limit || 50000.00,
        data.credit_rating || 'B',
        0.00,
        true
      ]);

      const newCustomer = result.rows[0];
      console.log('✅ CUSTOMER CREATED:', newCustomer);
      
      return { 
        success: true, 
        result: newCustomer
      };
    } catch (error) {
      console.error('❌ CUSTOMER CREATION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async createLead(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const leadData = {
        company_name: data.company_name || data.name || 'Unknown Company',
        contact_person: data.contact_person || data.contact || 'Unknown Contact',
        email: data.email || `contact@${data.company_name?.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: data.phone || '+1-555-0000',
        source: data.source || 'AI Agent',
        status: data.status || 'New',
        notes: data.notes || `Created by AI Agent on ${new Date().toISOString()}`,
        estimated_value: data.estimated_value || 10000.00,
        is_active: true
      };

      const [newLead] = await db.insert(leads).values(leadData).returning();
      console.log('✅ LEAD CREATED:', newLead);
      
      return { 
        success: true, 
        result: newLead,
        message: `Lead "${newLead.company_name}" created successfully with ID ${newLead.id}`
      };
    } catch (error) {
      console.error('❌ LEAD CREATION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async createSalesOrder(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const orderData = {
        customer_id: data.customer_id || 1,
        order_number: data.order_number || `SO-${Date.now()}`,
        order_date: new Date(),
        delivery_date: data.delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        total_amount: data.total_amount || 1000.00,
        currency: data.currency || 'USD',
        status: data.status || 'Open',
        notes: data.notes || `Created by AI Agent on ${new Date().toISOString()}`,
        is_active: true
      };

      const [newOrder] = await db.insert(sales_orders).values(orderData).returning();
      console.log('✅ SALES ORDER CREATED:', newOrder);
      
      return { 
        success: true, 
        result: newOrder,
        message: `Sales Order "${newOrder.order_number}" created successfully with ID ${newOrder.id}`
      };
    } catch (error) {
      console.error('❌ SALES ORDER CREATION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async createMaterial(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const materialData = {
        material_code: data.material_code || `MAT-${Date.now()}`,
        description: data.description || data.name || 'Unknown Material',
        material_type: data.material_type || 'FERT',
        base_unit: data.base_unit || 'EA',
        material_group: data.material_group || 'GENERAL',
        gross_weight: data.gross_weight || 1.0,
        net_weight: data.net_weight || 1.0,
        weight_unit: data.weight_unit || 'KG',
        price: data.price || 100.00,
        currency: data.currency || 'USD',
        is_active: true
      };

      const [newMaterial] = await db.insert(materials).values(materialData).returning();
      console.log('✅ MATERIAL CREATED:', newMaterial);
      
      return { 
        success: true, 
        result: newMaterial,
        message: `Material "${newMaterial.description}" created successfully with code ${newMaterial.material_code}`
      };
    } catch (error) {
      console.error('❌ MATERIAL CREATION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async createVendor(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const vendorData = {
        vendor_code: data.vendor_code || `VEND-${Date.now()}`,
        name: data.name || data.vendor_name || 'Unknown Vendor',
        contact_person: data.contact_person || data.contact || 'Unknown Contact',
        email: data.email || `contact@${data.name?.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: data.phone || '+1-555-0000',
        address: data.address || 'Not provided',
        vendor_type: data.vendor_type || 'STANDARD',
        payment_terms: data.payment_terms || 'NET30',
        currency: data.currency || 'USD',
        is_active: true
      };

      const [newVendor] = await db.insert(vendors).values(vendorData).returning();
      console.log('✅ VENDOR CREATED:', newVendor);
      
      return { 
        success: true, 
        result: newVendor,
        message: `Vendor "${newVendor.name}" created successfully with code ${newVendor.vendor_code}`
      };
    } catch (error) {
      console.error('❌ VENDOR CREATION FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async updateCustomer(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const updateData = {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.address && { address: data.address }),
        ...(data.credit_limit && { credit_limit: data.credit_limit }),
        ...(data.credit_rating && { credit_rating: data.credit_rating }),
        updated_at: new Date()
      };

      const [updatedCustomer] = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, data.id))
        .returning();

      console.log('✅ CUSTOMER UPDATED:', updatedCustomer);
      
      return { 
        success: true, 
        result: updatedCustomer,
        message: `Customer "${updatedCustomer.name}" updated successfully`
      };
    } catch (error) {
      console.error('❌ CUSTOMER UPDATE FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  private async updateLead(data: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const updateData = {
        ...(data.company_name && { company_name: data.company_name }),
        ...(data.contact_person && { contact_person: data.contact_person }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
        ...(data.estimated_value && { estimated_value: data.estimated_value }),
        updated_at: new Date()
      };

      const [updatedLead] = await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, data.id))
        .returning();

      console.log('✅ LEAD UPDATED:', updatedLead);
      
      return { 
        success: true, 
        result: updatedLead,
        message: `Lead "${updatedLead.company_name}" updated successfully`
      };
    } catch (error) {
      console.error('❌ LEAD UPDATE FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process user message and execute real actions
   */
  async processMessage(message: string, context: any = {}): Promise<{
    response: string;
    executedActions: any[];
    success: boolean;
  }> {
    try {
      // Use OpenAI to understand the request and generate actions
      const systemPrompt = `You are a REAL AI automation system for MallyERP. 
      Your job is to understand user requests and generate ACTUAL database operations.
      
      Current system state:
      - Customers: ${context.customer_count || 0}
      - Leads: ${context.lead_count || 0}
      - Sales Orders: ${context.order_count || 0}
      - Materials: ${context.material_count || 0}
      - Vendors: ${context.vendor_count || 0}
      
      When user asks to create something, respond with:
      1. A natural language confirmation
      2. A list of actions to execute
      
      Available actions:
      - create_customer: { name, email, phone, address, type, credit_limit }
      - create_lead: { company_name, contact_person, email, phone, source, status, estimated_value }
      - create_sales_order: { customer_id, total_amount, currency, status, notes }
      - create_material: { material_code, description, material_type, base_unit, price }
      - create_vendor: { name, contact_person, email, phone, vendor_type, payment_terms }
      - update_customer: { id, name, email, phone, address, credit_limit, credit_rating }
      - update_lead: { id, company_name, contact_person, email, phone, status, notes }
      
      Respond with JSON format:
      {
        "response": "Natural language response to user",
        "actions": [
          {
            "type": "create_customer",
            "data": { "name": "TestCorp", "email": "test@testcorp.com", "phone": "+1-555-0123" }
          }
        ]
      }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content);
      console.log('🤖 AI RESPONSE:', aiResponse);

      // Execute all actions
      const executedActions = [];
      for (const action of aiResponse.actions || []) {
        const result = await this.executeAction(action);
        executedActions.push({
          action,
          result,
          success: result.success
        });
      }

      return {
        response: aiResponse.response,
        executedActions,
        success: executedActions.length > 0 ? executedActions.every(a => a.success) : true
      };

    } catch (error) {
      console.error('❌ REAL AI AUTOMATION FAILED:', error);
      return {
        response: `I encountered an error: ${error.message}`,
        executedActions: [],
        success: false
      };
    }
  }
}

export const realAIAutomation = new RealAIAutomation();