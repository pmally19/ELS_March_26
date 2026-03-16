/**
 * Intelligent Workflow Automation Engine for MallyERP
 * Automates business processes, approvals, and cross-module operations
 */

import pkg from 'pg';
const { Pool } = pkg;
import OpenAI from "openai";

class WorkflowAutomation {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    this.initializeWorkflowTables();
    this.setupAutomationRules();
  }

  async initializeWorkflowTables() {
    try {
      // Workflow definitions table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_definitions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          module VARCHAR(100),
          trigger_type VARCHAR(100),
          trigger_conditions JSONB,
          workflow_steps JSONB,
          approval_chain JSONB,
          automation_level VARCHAR(50) DEFAULT 'manual',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Workflow instances table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_instances (
          id SERIAL PRIMARY KEY,
          workflow_id INTEGER REFERENCES workflow_definitions(id),
          entity_type VARCHAR(100),
          entity_id VARCHAR(100),
          current_step INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          assigned_to VARCHAR(100),
          workflow_data JSONB,
          step_history JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )
      `);

      // Automation rules table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS automation_rules (
          id SERIAL PRIMARY KEY,
          rule_name VARCHAR(255),
          module VARCHAR(100),
          trigger_event VARCHAR(100),
          conditions JSONB,
          actions JSONB,
          priority INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Workflow automation tables initialized');
    } catch (error) {
      console.error('Failed to initialize workflow tables:', error);
    }
  }

  async setupAutomationRules() {
    const defaultRules = [
      {
        rule_name: 'Auto-approve small purchases',
        module: 'purchasing',
        trigger_event: 'purchase_order_created',
        conditions: { amount: { '$lt': 1000 }, vendor_rating: { '$gte': 4 } },
        actions: [
          { type: 'approve', target: 'purchase_order' },
          { type: 'notify', recipient: 'purchasing_manager', message: 'PO auto-approved' }
        ]
      },
      {
        rule_name: 'Low inventory alert',
        module: 'inventory',
        trigger_event: 'stock_level_check',
        conditions: { quantity: { '$lt': 'reorder_point' } },
        actions: [
          { type: 'create', target: 'purchase_requisition' },
          { type: 'notify', recipient: 'inventory_manager', message: 'Auto-generated purchase requisition' }
        ]
      },
      {
        rule_name: 'Customer credit check',
        module: 'sales',
        trigger_event: 'sales_order_created',
        conditions: { amount: { '$gt': 'credit_limit' } },
        actions: [
          { type: 'hold', target: 'sales_order' },
          { type: 'notify', recipient: 'credit_manager', message: 'Credit limit exceeded' }
        ]
      },
      {
        rule_name: 'Quality inspection required',
        module: 'production',
        trigger_event: 'production_completed',
        conditions: { product_category: 'critical' },
        actions: [
          { type: 'create', target: 'quality_inspection' },
          { type: 'hold', target: 'goods_receipt' }
        ]
      },
      {
        rule_name: 'Invoice payment overdue',
        module: 'finance',
        trigger_event: 'daily_check',
        conditions: { days_overdue: { '$gt': 30 } },
        actions: [
          { type: 'create', target: 'dunning_notice' },
          { type: 'notify', recipient: 'accounts_receivable', message: 'Overdue payment detected' }
        ]
      }
    ];

    for (const rule of defaultRules) {
      try {
        const existing = await this.pool.query(`
          SELECT id FROM automation_rules WHERE rule_name = $1
        `, [rule.rule_name]);
        
        if (existing.rows.length === 0) {
          await this.pool.query(`
            INSERT INTO automation_rules (rule_name, module, trigger_event, conditions, actions, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [rule.rule_name, rule.module, rule.trigger_event, JSON.stringify(rule.conditions), JSON.stringify(rule.actions)]);
        }
      } catch (error) {
        console.error('Failed to setup automation rule:', rule.rule_name, error);
      }
    }
  }

  async processAutomationTrigger(module, event, data) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM automation_rules 
        WHERE module = $1 AND trigger_event = $2 AND is_active = true
        ORDER BY priority DESC
      `, [module, event]);

      const applicableRules = result.rows;
      
      for (const rule of applicableRules) {
        if (this.evaluateConditions(rule.conditions, data)) {
          await this.executeAutomationActions(rule, data);
        }
      }
    } catch (error) {
      console.error('Failed to process automation trigger:', error);
    }
  }

  evaluateConditions(conditions, data) {
    try {
      for (const [field, condition] of Object.entries(conditions)) {
        const value = data[field];
        
        if (typeof condition === 'object') {
          for (const [operator, threshold] of Object.entries(condition)) {
            switch (operator) {
              case '$gt':
                if (!(value > threshold)) return false;
                break;
              case '$lt':
                if (!(value < threshold)) return false;
                break;
              case '$gte':
                if (!(value >= threshold)) return false;
                break;
              case '$lte':
                if (!(value <= threshold)) return false;
                break;
              case '$eq':
                if (value !== threshold) return false;
                break;
              case '$ne':
                if (value === threshold) return false;
                break;
            }
          }
        } else {
          if (value !== condition) return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Condition evaluation failed:', error);
      return false;
    }
  }

  async executeAutomationActions(rule, data) {
    try {
      for (const action of rule.actions) {
        switch (action.type) {
          case 'approve':
            await this.performApproval(action.target, data);
            break;
          case 'create':
            await this.performCreation(action.target, data);
            break;
          case 'notify':
            await this.sendNotification(action.recipient, action.message, data);
            break;
          case 'hold':
            await this.performHold(action.target, data);
            break;
          case 'calculate':
            await this.performCalculation(action.formula, data);
            break;
        }
      }

      await this.pool.query(`
        UPDATE automation_rules 
        SET success_count = success_count + 1 
        WHERE id = $1
      `, [rule.id]);

    } catch (error) {
      console.error('Action execution failed:', error);
      
      await this.pool.query(`
        UPDATE automation_rules 
        SET failure_count = failure_count + 1 
        WHERE id = $1
      `, [rule.id]);
    }
  }

  async performApproval(target, data) {
    const approvalMap = {
      'purchase_order': 'purchase_orders',
      'sales_order': 'sales_orders',
      'invoice': 'invoices'
    };
    
    const table = approvalMap[target];
    if (table && data.id) {
      await this.pool.query(`
        UPDATE ${table} 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = 'system'
        WHERE id = $1
      `, [data.id]);
    }
  }

  async performCreation(target, data) {
    switch (target) {
      case 'purchase_requisition':
        await this.createPurchaseRequisition(data);
        break;
      case 'quality_inspection':
        await this.createQualityInspection(data);
        break;
      case 'dunning_notice':
        await this.createDunningNotice(data);
        break;
    }
  }

  async createPurchaseRequisition(data) {
    try {
      await this.pool.query(`
        INSERT INTO purchase_requisitions (
          material_id, quantity, requested_by, priority, 
          justification, created_at, status
        ) VALUES ($1, $2, 'system', 'normal', 'Auto-generated due to low stock', CURRENT_TIMESTAMP, 'pending')
      `, [data.material_id, data.reorder_quantity || 100]);
    } catch (error) {
      console.error('Failed to create purchase requisition:', error);
    }
  }

  async createQualityInspection(data) {
    try {
      await this.pool.query(`
        INSERT INTO quality_inspections (
          production_order_id, inspector_id, inspection_type,
          status, created_at
        ) VALUES ($1, 'system', 'automated', 'pending', CURRENT_TIMESTAMP)
      `, [data.production_order_id]);
    } catch (error) {
      console.error('Failed to create quality inspection:', error);
    }
  }

  async sendNotification(recipient, message, data) {
    try {
      await this.pool.query(`
        INSERT INTO notifications (
          recipient, message, notification_type, 
          related_data, created_at, is_read
        ) VALUES ($1, $2, 'automation', $3, CURRENT_TIMESTAMP, false)
      `, [recipient, message, JSON.stringify(data)]);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async performHold(target, data) {
    const holdMap = {
      'sales_order': 'sales_orders',
      'goods_receipt': 'goods_receipts'
    };
    
    const table = holdMap[target];
    if (table && data.id) {
      await this.pool.query(`
        UPDATE ${table} 
        SET status = 'hold', hold_reason = 'Automated hold due to business rules'
        WHERE id = $1
      `, [data.id]);
    }
  }

  async getWorkflowStatus(entityType, entityId) {
    try {
      const result = await this.pool.query(`
        SELECT wi.*, wd.name as workflow_name, wd.workflow_steps
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.entity_type = $1 AND wi.entity_id = $2
        ORDER BY wi.created_at DESC
        LIMIT 1
      `, [entityType, entityId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return null;
    }
  }

  async getAutomationMetrics() {
    try {
      const result = await this.pool.query(`
        SELECT 
          module,
          COUNT(*) as total_rules,
          SUM(success_count) as total_successes,
          SUM(failure_count) as total_failures,
          AVG(CASE WHEN success_count + failure_count > 0 
              THEN success_count::float / (success_count + failure_count) 
              ELSE 0 END) as success_rate
        FROM automation_rules
        WHERE is_active = true
        GROUP BY module
      `);

      return result.rows;
    } catch (error) {
      console.error('Failed to get automation metrics:', error);
      return [];
    }
  }
}

export default WorkflowAutomation;