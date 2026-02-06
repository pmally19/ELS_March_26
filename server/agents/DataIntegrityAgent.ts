import OpenAI from 'openai';
import { pool } from '../db';
import { errorLogger } from '../utils/errorLogger';

interface IntegrityIssue {
  type: 'constraint' | 'foreign_key' | 'data_type' | 'missing_reference' | 'duplicate';
  table: string;
  column?: string;
  constraint?: string;
  error: string;
  suggestedFix: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ValidationResult {
  isValid: boolean;
  issues: IntegrityIssue[];
  autoFixApplied: boolean;
  recommendations: string[];
}

export class DataIntegrityAgent {
  private openai: OpenAI;
  private isMonitoring: boolean = false;
  private validationRules: Map<string, any[]> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.initializeValidationRules();
  }

  private initializeValidationRules() {
    // Define cross-module validation rules
    this.validationRules.set('company_codes', [
      { field: 'code', maxLength: 10, required: true, unique: true },
      { field: 'name', maxLength: 255, required: true },
      { field: 'country', maxLength: 100, required: false },
      { field: 'currency', maxLength: 3, required: false, pattern: /^[A-Z]{3}$/ }
    ]);

    this.validationRules.set('plants', [
      { field: 'code', maxLength: 4, required: true, unique: true },
      { field: 'name', maxLength: 255, required: true },
      { field: 'company_code', required: true, foreignKey: 'company_codes.code' }
    ]);

    this.validationRules.set('materials', [
      { field: 'code', maxLength: 18, required: true, unique: true },
      { field: 'name', maxLength: 255, required: true },
      { field: 'plant_code', required: true, foreignKey: 'plants.code' }
    ]);

    this.validationRules.set('customers', [
      { field: 'code', maxLength: 10, required: true, unique: true },
      { field: 'name', maxLength: 255, required: true },
      { field: 'company_code', required: true, foreignKey: 'company_codes.code' }
    ]);

    this.validationRules.set('vendors', [
      { field: 'code', maxLength: 10, required: true, unique: true },
      { field: 'name', maxLength: 255, required: true },
      { field: 'company_code', required: true, foreignKey: 'company_codes.code' }
    ]);
  }

  async validateData(tableName: string, data: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      issues: [],
      autoFixApplied: false,
      recommendations: []
    };

    try {
      const rules = this.validationRules.get(tableName);
      if (!rules) {
        result.recommendations.push(`No validation rules defined for table: ${tableName}`);
        return result;
      }

      for (const rule of rules) {
        const value = data[rule.field];
        
        if (rule.required && (value === null || value === undefined || value === '')) {
          result.issues.push({
            type: 'missing_reference',
            table: tableName,
            column: rule.field,
            error: `Required field '${rule.field}' is missing or empty`,
            suggestedFix: `Provide a valid value for '${rule.field}'`,
            severity: 'critical'
          });
          result.isValid = false;
        }

        if (value && rule.maxLength && String(value).length > rule.maxLength) {
          result.issues.push({
            type: 'data_type',
            table: tableName,
            column: rule.field,
            error: `Field '${rule.field}' exceeds maximum length of ${rule.maxLength}`,
            suggestedFix: `Truncate or increase column size to accommodate ${String(value).length} characters`,
            severity: 'high'
          });
          result.isValid = false;
        }

        if (value && rule.pattern && !rule.pattern.test(String(value))) {
          result.issues.push({
            type: 'data_type',
            table: tableName,
            column: rule.field,
            error: `Field '${rule.field}' does not match required pattern`,
            suggestedFix: `Ensure '${rule.field}' follows the correct format`,
            severity: 'medium'
          });
          result.isValid = false;
        }

        if (value && rule.foreignKey) {
          const [refTable, refColumn] = rule.foreignKey.split('.');
          const isValidRef = await this.validateForeignKey(refTable, refColumn, value);
          if (!isValidRef) {
            result.issues.push({
              type: 'foreign_key',
              table: tableName,
              column: rule.field,
              error: `Foreign key reference '${value}' not found in ${rule.foreignKey}`,
              suggestedFix: `Create the referenced record in ${refTable} or use an existing ${refColumn}`,
              severity: 'critical'
            });
            result.isValid = false;
          }
        }

        if (value && rule.unique) {
          const isDuplicate = await this.checkDuplicate(tableName, rule.field, value, data.id);
          if (isDuplicate) {
            result.issues.push({
              type: 'duplicate',
              table: tableName,
              column: rule.field,
              error: `Duplicate value '${value}' found for unique field '${rule.field}'`,
              suggestedFix: `Use a unique value for '${rule.field}' or update the existing record`,
              severity: 'critical'
            });
            result.isValid = false;
          }
        }
      }

      await errorLogger.log('info', 'DataIntegrityAgent', 
        `Validation completed for ${tableName}`, {
          isValid: result.isValid,
          issueCount: result.issues.length,
          data: data
        });

      return result;

    } catch (error) {
      await errorLogger.log('error', 'DataIntegrityAgent', 
        `Validation failed for ${tableName}`, {
          error: error.message,
          data: data
        });
      
      result.isValid = false;
      result.issues.push({
        type: 'constraint',
        table: tableName,
        error: `Validation error: ${error.message}`,
        suggestedFix: 'Review data structure and validation rules',
        severity: 'critical'
      });
      
      return result;
    }
  }

  private async validateForeignKey(table: string, column: string, value: any): Promise<boolean> {
    try {
      const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = $1`;
      const result = await pool.query(query, [value]);
      return result.rows[0].count > 0;
    } catch (error: any) {
      await errorLogger.logError('DataIntegrityAgent', 
        `Foreign key validation failed: ${table}.${column}`, error, { value });
      return false;
    }
  }

  private async checkDuplicate(table: string, column: string, value: any, excludeId?: number): Promise<boolean> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = $1`;
      const params = [value];
      
      if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
      }
      
      const result = await db.query(query, params);
      return result.rows[0].count > 0;
    } catch (error) {
      await errorLogger.log('error', 'DataIntegrityAgent', 
        `Duplicate check failed: ${table}.${column}`, { error: error.message, value });
      return false;
    }
  }

  async autoFixConstraints(tableName: string, issues: IntegrityIssue[]): Promise<boolean> {
    let fixesApplied = 0;

    for (const issue of issues) {
      try {
        if (issue.type === 'data_type' && issue.column) {
          const currentLength = await this.getColumnLength(tableName, issue.column);
          const requiredLength = this.calculateRequiredLength(issue.error);
          
          if (requiredLength > currentLength) {
            await this.expandColumn(tableName, issue.column, requiredLength);
            fixesApplied++;
            
            await errorLogger.log('info', 'DataIntegrityAgent', 
              `Auto-fixed column length: ${tableName}.${issue.column}`, {
                oldLength: currentLength,
                newLength: requiredLength
              });
          }
        }
      } catch (error) {
        await errorLogger.log('error', 'DataIntegrityAgent', 
          `Auto-fix failed for ${tableName}.${issue.column}`, {
            issue: issue,
            error: error.message
          });
      }
    }

    return fixesApplied > 0;
  }

  private async getColumnLength(tableName: string, columnName: string): Promise<number> {
    const query = `
      SELECT character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `;
    const result = await db.query(query, [tableName, columnName]);
    return result.rows[0]?.character_maximum_length || 0;
  }

  private calculateRequiredLength(error: string): number {
    const match = error.match(/accommodate (\d+) characters/);
    if (match) {
      return parseInt(match[1]) + 50;
    }
    return 255;
  }

  private async expandColumn(tableName: string, columnName: string, newLength: number): Promise<void> {
    const query = `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(${newLength})`;
    await db.query(query);
  }

  startMonitoring() {
    this.isMonitoring = true;
    console.log('Data Integrity Agent monitoring started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Data Integrity Agent monitoring stopped');
  }
}

export const dataIntegrityAgent = new DataIntegrityAgent();