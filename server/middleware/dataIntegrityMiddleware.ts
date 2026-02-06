import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { errorLogger } from '../utils/errorLogger';

interface DataValidation {
  isValid: boolean;
  errors: string[];
  fixes: string[];
}

export class DataIntegrityMiddleware {
  static async validateAndFix(req: Request, res: Response, next: NextFunction) {
    const { method, path, body } = req;

    // Only validate POST/PUT/PATCH operations with data
    if (!['POST', 'PUT', 'PATCH'].includes(method) || !body) {
      return next();
    }

    try {
      const tableName = DataIntegrityMiddleware.extractTableName(path);
      if (!tableName) {
        return next();
      }

      // Pre-validate and auto-fix data issues
      const validation = await DataIntegrityMiddleware.validateData(tableName, body);

      if (!validation.isValid) {
        // Auto-fix critical issues
        await DataIntegrityMiddleware.autoFixIssues(tableName, body, validation.fixes);

        await errorLogger.logError('DataIntegrityMiddleware',
          `Auto-fixed data issues for ${tableName}`, null, {
          issues: validation.errors,
          fixes: validation.fixes,
          data: body
        });
      }

      next();
    } catch (error: any) {
      await errorLogger.logError('DataIntegrityMiddleware',
        'Validation middleware failed', error, { path, body });
      next();
    }
  }

  private static extractTableName(path: string): string | null {
    const tableMap: { [key: string]: string } = {
      '/api/master-data/company-code': 'company_codes',
      '/api/master-data/plants': 'plants',
      '/api/master-data/materials': 'materials',
      '/api/master-data/customers': 'customers',
      '/api/master-data/vendors': 'vendors',
      '/api/sales/orders': 'sales_orders',
      '/api/purchase/orders': 'purchase_orders',
      '/api/inventory/stock': 'stock_movements'
    };

    return tableMap[path] || null;
  }

  private static async validateData(tableName: string, data: any): Promise<DataValidation> {
    const validation: DataValidation = {
      isValid: true,
      errors: [],
      fixes: []
    };

    try {
      // Check if table exists and get structure
      const tableInfo = await DataIntegrityMiddleware.getTableInfo(tableName);

      if (!tableInfo.exists) {
        validation.isValid = false;
        validation.errors.push(`Table ${tableName} does not exist`);
        validation.fixes.push(`CREATE_TABLE:${tableName}`);
        return validation;
      }

      // Validate each field
      for (const [field, value] of Object.entries(data)) {
        if (field === 'id' || value === undefined) continue;

        const columnInfo = tableInfo.columns[field];

        // Check if column exists
        if (!columnInfo) {
          validation.errors.push(`Column ${field} does not exist in ${tableName}`);
          validation.fixes.push(`ADD_COLUMN:${tableName}.${field}:${DataIntegrityMiddleware.inferDataType(value)}`);
          validation.isValid = false;
          continue;
        }

        // Check data length constraints
        if (typeof value === 'string' && columnInfo.maxLength) {
          if (value.length > columnInfo.maxLength) {
            validation.errors.push(`Field ${field} exceeds maximum length of ${columnInfo.maxLength}`);
            validation.fixes.push(`EXPAND_COLUMN:${tableName}.${field}:${value.length + 50}`);
            validation.isValid = false;
          }
        }

        // Check foreign key references
        if (columnInfo.foreignKey && value) {
          const refExists = await DataIntegrityMiddleware.checkReference(columnInfo.foreignKey, value);
          if (!refExists) {
            validation.errors.push(`Foreign key reference ${value} not found in ${columnInfo.foreignKey}`);
            validation.fixes.push(`CREATE_REFERENCE:${columnInfo.foreignKey}:${value}`);
            validation.isValid = false;
          }
        }
      }

      return validation;

    } catch (error: any) {
      validation.isValid = false;
      validation.errors.push(`Validation failed: ${error.message}`);
      return validation;
    }
  }

  private static async getTableInfo(tableName: string): Promise<{
    exists: boolean;
    columns: { [key: string]: any };
  }> {
    try {
      // Check if table exists
      const tableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `;
      const tableResult = await pool.query(tableQuery, [tableName]);

      if (!tableResult.rows[0].exists) {
        return { exists: false, columns: {} };
      }

      // Get column information
      const columnQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
      `;
      const columnResult = await pool.query(columnQuery, [tableName]);

      const columns: { [key: string]: any } = {};
      for (const row of columnResult.rows) {
        columns[row.column_name] = {
          dataType: row.data_type,
          maxLength: row.character_maximum_length,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          foreignKey: DataIntegrityMiddleware.getForeignKeyRef(tableName, row.column_name)
        };
      }

      return { exists: true, columns };

    } catch (error: any) {
      await errorLogger.logError('DataIntegrityMiddleware',
        `Failed to get table info for ${tableName}`, error);
      return { exists: false, columns: {} };
    }
  }

  private static getForeignKeyRef(tableName: string, columnName: string): string | null {
    const foreignKeys: { [key: string]: string } = {
      'plants.company_code': 'company_codes.code',

      'customers.company_code': 'company_codes.code',
      'vendors.company_code': 'company_codes.code',
      'sales_orders.customer_code': 'customers.code',
      'purchase_orders.vendor_code': 'vendors.code'
    };

    return foreignKeys[`${tableName}.${columnName}`] || null;
  }

  private static async checkReference(foreignKey: string, value: any): Promise<boolean> {
    try {
      const [table, column] = foreignKey.split('.');
      const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = $1`;
      const result = await pool.query(query, [value]);
      return result.rows[0].count > 0;
    } catch (error: any) {
      return false;
    }
  }

  private static async autoFixIssues(tableName: string, data: any, fixes: string[]): Promise<void> {
    for (const fix of fixes) {
      try {
        await DataIntegrityMiddleware.executeFix(fix, tableName, data);
      } catch (error: any) {
        await errorLogger.logError('DataIntegrityMiddleware',
          `Failed to execute fix: ${fix}`, error);
      }
    }
  }

  private static async executeFix(fix: string, tableName: string, data: any): Promise<void> {
    const [action, ...params] = fix.split(':');

    switch (action) {
      case 'CREATE_TABLE':
        await DataIntegrityMiddleware.createTable(params[0]);
        break;

      case 'ADD_COLUMN':
        const [table, column, dataType] = params[0].split('.');
        await DataIntegrityMiddleware.addColumn(table, column, dataType);
        break;

      case 'EXPAND_COLUMN':
        const [expandTable, expandColumn] = params[0].split('.');
        const newLength = parseInt(params[1]);
        await DataIntegrityMiddleware.expandColumn(expandTable, expandColumn, newLength);
        break;

      case 'CREATE_REFERENCE':
        const [refTable, refColumn] = params[0].split('.');
        const refValue = params[1];
        await DataIntegrityMiddleware.createReference(refTable, refColumn, refValue);
        break;
    }
  }

  private static async createTable(tableName: string): Promise<void> {
    const tableStructures: { [key: string]: string } = {
      'company_codes': `
        CREATE TABLE company_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          country VARCHAR(100),
          currency VARCHAR(3),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `,
      'plants': `
        CREATE TABLE plants (
          id SERIAL PRIMARY KEY,
          code VARCHAR(4) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          company_code VARCHAR(10) NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `
    };

    if (tableStructures[tableName]) {
      await pool.query(tableStructures[tableName]);
    }
  }

  private static async addColumn(tableName: string, columnName: string, dataType: string): Promise<void> {
    const query = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${dataType}`;
    await pool.query(query);
  }

  private static async expandColumn(tableName: string, columnName: string, newLength: number): Promise<void> {
    const query = `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(${newLength})`;
    await pool.query(query);
  }

  private static async createReference(tableName: string, columnName: string, value: any): Promise<void> {
    // Create minimal reference record
    const referenceData: { [key: string]: any } = {
      'company_codes': { code: value, name: `Auto-generated: ${value}` },
      'plants': { code: value, name: `Auto-generated: ${value}`, company_code: '1000' },
      'customers': { code: value, name: `Auto-generated: ${value}`, company_code: '1000' },
      'vendors': { code: value, name: `Auto-generated: ${value}`, company_code: '1000' }
    };

    if (referenceData[tableName]) {
      const data = referenceData[tableName];
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders.join(', ')}) 
        ON CONFLICT (${columnName}) DO NOTHING
      `;

      await pool.query(query, values);
    }
  }

  private static inferDataType(value: any): string {
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
}

export default DataIntegrityMiddleware;