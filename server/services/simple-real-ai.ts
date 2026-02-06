/**
 * SIMPLE REAL AI Agent - Actually executes database operations
 * No complex ORM, just raw SQL that works
 */

import { db } from '../db';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class SimpleRealAI {
  
  async createCustomer(name: string, contact: string = '', email: string = ''): Promise<any> {
    try {
      const customerCode = `CUST-${Date.now()}`;
      const customerEmail = email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
      
      const result = await db.execute(`
        INSERT INTO customers 
        (name, email, phone, code, type, company_code_id, credit_limit, credit_rating, outstanding_balance, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, name, email, code
      `, [
        name,
        customerEmail,
        '+1-555-0000',
        customerCode,
        'STANDARD',
        1,
        50000.00,
        'B',
        0.00,
        true
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Customer creation failed:', error);
      throw error;
    }
  }

  async createLead(companyName: string, contactPerson: string = '', email: string = ''): Promise<any> {
    try {
      const leadEmail = email || `${companyName.toLowerCase().replace(/\s+/g, '')}@example.com`;
      
      const result = await db.execute(`
        INSERT INTO leads 
        (company_name, contact_person, email, phone, status, source, estimated_value, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, company_name, contact_person, email, status
      `, [
        companyName,
        contactPerson || 'Unknown Contact',
        leadEmail,
        '+1-555-0000',
        'New',
        'AI Agent',
        10000.00,
        true
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Lead creation failed:', error);
      throw error;
    }
  }

  async getCurrentCounts(): Promise<any> {
    try {
      const result = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customer_count,
          (SELECT COUNT(*) FROM leads) as lead_count
      `);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Getting counts failed:', error);
      return { customer_count: 0, lead_count: 0 };
    }
  }

  async processMessage(message: string): Promise<{ 
    response: string; 
    executed: boolean; 
    result?: any; 
  }> {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Check for customer creation
      if (lowerMessage.includes('create') && lowerMessage.includes('customer')) {
        const nameMatch = message.match(/customer.*?called\s+([^with]+?)(?:\s+with|$)/i) ||
                         message.match(/create.*?customer\s+([^with]+?)(?:\s+with|$)/i);
        
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          const contactMatch = message.match(/contact.*?person\s+([^\.]+)/i) ||
                              message.match(/with\s+contact\s+([^\.]+)/i);
          const contactPerson = contactMatch ? contactMatch[1].trim() : '';
          
          const newCustomer = await this.createCustomer(customerName, contactPerson);
          
          return {
            response: `✅ I successfully created customer "${newCustomer.name}" with ID ${newCustomer.id}. Customer code: ${newCustomer.code}`,
            executed: true,
            result: newCustomer
          };
        }
      }
      
      // Check for lead creation
      if (lowerMessage.includes('create') && lowerMessage.includes('lead')) {
        const nameMatch = message.match(/lead.*?for\s+([^with]+?)(?:\s+with|$)/i) ||
                         message.match(/create.*?lead\s+([^with]+?)(?:\s+with|$)/i);
        
        if (nameMatch) {
          const companyName = nameMatch[1].trim();
          const contactMatch = message.match(/contact.*?person\s+([^\.]+)/i) ||
                              message.match(/with\s+contact\s+([^\.]+)/i);
          const contactPerson = contactMatch ? contactMatch[1].trim() : '';
          
          const newLead = await this.createLead(companyName, contactPerson);
          
          return {
            response: `✅ I successfully created lead for "${newLead.company_name}" with contact person "${newLead.contact_person}". Lead ID: ${newLead.id}`,
            executed: true,
            result: newLead
          };
        }
      }
      
      // Check for count queries
      if (lowerMessage.includes('how many') || lowerMessage.includes('count')) {
        const counts = await this.getCurrentCounts();
        
        if (lowerMessage.includes('customer')) {
          return {
            response: `There are currently ${counts.customer_count} customers in the system.`,
            executed: false
          };
        }
        
        if (lowerMessage.includes('lead')) {
          return {
            response: `There are currently ${counts.lead_count} leads in the system.`,
            executed: false
          };
        }
      }
      
      // Default response - try to be helpful
      const counts = await this.getCurrentCounts();
      return {
        response: `I understand you want to work with the system. Current data: ${counts.customer_count} customers, ${counts.lead_count} leads. I can create customers or leads - just ask! For example: "create customer TestCorp with contact John Smith"`,
        executed: false
      };
      
    } catch (error) {
      console.error('❌ Processing message failed:', error);
      return {
        response: `❌ I encountered an error: ${error.message}`,
        executed: false
      };
    }
  }
}

export const simpleRealAI = new SimpleRealAI();