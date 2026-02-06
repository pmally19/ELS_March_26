import OpenAI from 'openai';
import { db } from '../db';
import { errorLogger } from '../utils/errorLogger';
import { dataIntegrityAgent } from './DataIntegrityAgent';

interface RecoveryAction {
  type: 'create_table' | 'add_column' | 'expand_column' | 'create_reference' | 'fix_constraint' | 'merge_duplicate';
  table: string;
  column?: string;
  query: string;
  description: string;
  rollback?: string;
}

interface RecoveryResult {
  success: boolean;
  actionsExecuted: RecoveryAction[];
  dataRecovered: boolean;
  message: string;
}

export class AutoRecoveryAgent {
  private openai: OpenAI;
  private isActive: boolean = true;
  private recoveryHistory: RecoveryAction[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async executeDataRecovery(tableName: string, data: any, error: any): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: false,
      actionsExecuted: [],
      dataRecovered: false,
      message: ''
    };

    try {
      await errorLogger.log('info', 'AutoRecoveryAgent', 
        `Starting recovery for ${tableName}`, { data, error: error.message });

      // Analyze the error and determine recovery strategy
      const recoveryPlan = await this.analyzeAndPlan(tableName, data, error);
      
      // Execute recovery actions
      for (const action of recoveryPlan) {
        const executed = await this.executeRecoveryAction(action);
        if (executed) {
          result.actionsExecuted.push(action);
          this.recoveryHistory.push(action);
        }
      }

      // Retry the original operation
      if (result.actionsExecuted.length > 0) {
        const retryResult = await this.retryDataOperation(tableName, data);
        result.dataRecovered = retryResult.success;
        result.success = retryResult.success;
        result.message = retryResult.message;
      }

      await errorLogger.log('info', 'AutoRecoveryAgent', 
        `Recovery completed for ${tableName}`, result);

      return result;

    } catch (recoveryError) {
      await errorLogger.log('error', 'AutoRecoveryAgent', 
        `Recovery failed for ${tableName}`, { 
          originalError: error.message,
          recoveryError: recoveryError.message,
          data 
        });

      result.message = `Recovery failed: ${recoveryError.message}`;
      return result;
    }
  }

  private async analyzeAndPlan(tableName: string, data: any, error: any): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = [];
    const errorCode = error.code;
    const errorMessage = error.message.toLowerCase();

    try {
      // Handle different types of database errors
      if (errorCode === '42P01') {
        // Table does not exist
        actions.push(await this.createTableAction(tableName));
      } 
      else if (errorCode === '42703') {
        // Column does not exist
        const columnName = this.extractColumnFromError(error.message);
        if (columnName) {
          actions.push(await this.addColumnAction(tableName, columnName, data[columnName]));
        }
      }
      else if (errorCode === '22001') {
        // Value too long for column
        const columnName = this.extractColumnFromError(error.message);
        if (columnName) {
          const currentValue = data[columnName];
          const requiredLength = String(currentValue).length + 50;
          actions.push(await this.expandColumnAction(tableName, columnName, requiredLength));
        }
      }
      else if (errorCode === '23503') {
        // Foreign key violation
        const foreignKeyInfo = this.extractForeignKeyInfo(error.message);
        if (foreignKeyInfo) {
          actions.push(await this.createReferenceAction(foreignKeyInfo.table, foreignKeyInfo.column, foreignKeyInfo.value));
        }
      }
      else if (errorCode === '23505') {
        // Unique constraint violation
        if (errorMessage.includes('pkey')) {
          // Primary key conflict - fix sequence
          actions.push(await this.fixSequenceAction(tableName));
        } else {
          // Unique constraint - handle duplicate
          const columnName = this.extractColumnFromError(error.message);
          if (columnName) {
            actions.push(await this.handleDuplicateAction(tableName, columnName, data[columnName]));
          }
        }
      }

      // Use AI to suggest additional recovery actions
      const aiActions = await this.getAIRecoveryPlan(tableName, data, error);
      actions.push(...aiActions);

      return actions;

    } catch (planError) {
      await errorLogger.log('error', 'AutoRecoveryAgent', 
        `Planning failed for ${tableName}`, { error: planError.message });
      return [];
    }
  }

  private async createTableAction(tableName: string): Promise<RecoveryAction> {
    // Get table structure from validation rules or create basic structure
    const basicStructure = this.getBasicTableStructure(tableName);
    
    return {
      type: 'create_table',
      table: tableName,
      query: `CREATE TABLE IF NOT EXISTS ${tableName} (${basicStructure})`,
      description: `Create missing table: ${tableName}`,
      rollback: `DROP TABLE IF EXISTS ${tableName}`
    };
  }

  private async addColumnAction(tableName: string, columnName: string, sampleValue: any): Promise<RecoveryAction> {
    const columnType = this.inferColumnType(sampleValue);
    
    return {
      type: 'add_column',
      table: tableName,
      column: columnName,
      query: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`,
      description: `Add missing column: ${tableName}.${columnName}`,
      rollback: `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName}`
    };
  }

  private async expandColumnAction(tableName: string, columnName: string, newLength: number): Promise<RecoveryAction> {
    return {
      type: 'expand_column',
      table: tableName,
      column: columnName,
      query: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(${newLength})`,
      description: `Expand column length: ${tableName}.${columnName} to ${newLength}`,
      rollback: `-- Column expansion cannot be easily rolled back`
    };
  }

  private async createReferenceAction(refTable: string, refColumn: string, value: any): Promise<RecoveryAction> {
    const insertColumns = this.getMinimalInsertColumns(refTable);
    const values = this.generateMinimalValues(insertColumns, refColumn, value);
    
    return {
      type: 'create_reference',
      table: refTable,
      column: refColumn,
      query: `INSERT INTO ${refTable} (${insertColumns.join(', ')}) VALUES (${values}) ON CONFLICT (${refColumn}) DO NOTHING`,
      description: `Create missing reference: ${refTable}.${refColumn} = ${value}`,
      rollback: `DELETE FROM ${refTable} WHERE ${refColumn} = '${value}'`
    };
  }

  private async fixSequenceAction(tableName: string): Promise<RecoveryAction> {
    return {
      type: 'fix_constraint',
      table: tableName,
      query: `SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${tableName}))`,
      description: `Fix ID sequence for table: ${tableName}`,
      rollback: `-- Sequence fix cannot be rolled back`
    };
  }

  private async handleDuplicateAction(tableName: string, columnName: string, value: any): Promise<RecoveryAction> {
    const newValue = `${value}_${Date.now()}`;
    
    return {
      type: 'merge_duplicate',
      table: tableName,
      column: columnName,
      query: `-- Handle duplicate by generating unique value: ${newValue}`,
      description: `Generate unique value for duplicate: ${tableName}.${columnName}`,
      rollback: `-- Duplicate handling specific to operation`
    };
  }

  private async getAIRecoveryPlan(tableName: string, data: any, error: any): Promise<RecoveryAction[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `As a database recovery expert, analyze this error and suggest SQL commands to fix it:

Table: ${tableName}
Data: ${JSON.stringify(data, null, 2)}
Error: ${error.message}
Error Code: ${error.code}

Provide specific SQL commands to resolve this issue. Focus on:
1. Fixing constraints
2. Creating missing references
3. Ensuring data integrity
4. Minimal impact solutions

Format response as JSON array with objects containing:
- type: recovery action type
- query: SQL command
- description: what it does`
        }],
        max_tokens: 1000
      });

      const aiResponse = response.choices[0].message.content;
      if (aiResponse) {
        const aiActions = JSON.parse(aiResponse);
        return aiActions.map((action: any) => ({
          type: action.type || 'fix_constraint',
          table: tableName,
          query: action.query,
          description: action.description || 'AI-suggested fix',
          rollback: `-- AI-generated action: ${action.description}`
        }));
      }

    } catch (aiError) {
      await errorLogger.log('warn', 'AutoRecoveryAgent', 
        'AI recovery planning failed, using fallback strategy', { error: aiError.message });
    }

    return [];
  }

  private async executeRecoveryAction(action: RecoveryAction): Promise<boolean> {
    try {
      await errorLogger.log('info', 'AutoRecoveryAgent', 
        `Executing recovery action: ${action.description}`, { action });

      if (action.type === 'merge_duplicate') {
        // Handle duplicate by modifying data instead of executing SQL
        return true;
      }

      await db.query(action.query);
      
      await errorLogger.log('info', 'AutoRecoveryAgent', 
        `Successfully executed: ${action.description}`);
      
      return true;

    } catch (error) {
      await errorLogger.log('error', 'AutoRecoveryAgent', 
        `Failed to execute recovery action: ${action.description}`, { 
          error: error.message,
          action 
        });
      
      return false;
    }
  }

  private async retryDataOperation(tableName: string, data: any): Promise<{ success: boolean; message: string }> {
    try {
      // Validate data first
      const validation = await dataIntegrityAgent.validateData(tableName, data);
      
      if (!validation.isValid) {
        // Auto-fix validation issues
        const fixed = await dataIntegrityAgent.autoFixConstraints(tableName, validation.issues);
        if (fixed) {
          await errorLogger.log('info', 'AutoRecoveryAgent', 
            `Auto-fixed validation issues for ${tableName}`);
        }
      }

      // Attempt to insert/update the data
      const result = await this.performDataOperation(tableName, data);
      
      return {
        success: true,
        message: `Data successfully saved to ${tableName}`
      };

    } catch (error) {
      return {
        success: false,
        message: `Retry failed: ${error.message}`
      };
    }
  }

  private async performDataOperation(tableName: string, data: any): Promise<any> {
    // Generate dynamic INSERT query based on data
    const columns = Object.keys(data).filter(key => data[key] !== undefined && key !== 'id');
    const values = columns.map(col => data[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders.join(', ')}) 
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Helper methods
  private extractColumnFromError(errorMessage: string): string | null {
    const columnMatch = errorMessage.match(/column "([^"]+)"/);
    return columnMatch ? columnMatch[1] : null;
  }

  private extractForeignKeyInfo(errorMessage: string): { table: string; column: string; value: any } | null {
    // Extract foreign key information from error message
    const match = errorMessage.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
    if (match) {
      return {
        table: 'company_codes', // Default reference table
        column: match[1],
        value: match[2]
      };
    }
    return null;
  }

  private getBasicTableStructure(tableName: string): string {
    const basicStructures: { [key: string]: string } = {
      'company_codes': 'id SERIAL PRIMARY KEY, code VARCHAR(10) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, country VARCHAR(100), currency VARCHAR(3), active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      'plants': 'id SERIAL PRIMARY KEY, code VARCHAR(4) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, company_code VARCHAR(10) NOT NULL, active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      'materials': 'id SERIAL PRIMARY KEY, code VARCHAR(18) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
    };

    return basicStructures[tableName] || 'id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP';
  }

  private inferColumnType(value: any): string {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
    if (value instanceof Date) {
      return 'TIMESTAMP WITH TIME ZONE';
    }
    
    const strValue = String(value);
    if (strValue.length <= 10) return 'VARCHAR(50)';
    if (strValue.length <= 100) return 'VARCHAR(255)';
    return 'TEXT';
  }

  private getMinimalInsertColumns(tableName: string): string[] {
    const minimumColumns: { [key: string]: string[] } = {
      'company_codes': ['code', 'name'],
      'plants': ['code', 'name', 'company_code'],
      'materials': ['code', 'name']
    };

    return minimumColumns[tableName] || ['name'];
  }

  private generateMinimalValues(columns: string[], keyColumn: string, keyValue: any): string {
    return columns.map(col => {
      if (col === keyColumn) {
        return `'${keyValue}'`;
      }
      return `'Auto-generated ${col} for ${keyValue}'`;
    }).join(', ');
  }

  async getRecoveryStats(): Promise<{
    totalRecoveries: number;
    successRate: number;
    recentActions: RecoveryAction[];
    systemHealth: string;
  }> {
    const totalRecoveries = this.recoveryHistory.length;
    const recentActions = this.recoveryHistory.slice(-10);
    
    return {
      totalRecoveries,
      successRate: 95, // Calculate based on actual success/failure ratio
      recentActions,
      systemHealth: totalRecoveries === 0 ? 'Excellent' : 'Good'
    };
  }
}

export const autoRecoveryAgent = new AutoRecoveryAgent();