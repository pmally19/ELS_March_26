import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

interface ChangeContext {
  userName: string;
  userRole?: string;
  sessionId?: string;
  transactionCode?: string;
  changeReason?: string;
  businessProcess?: string;
  referenceDocument?: string;
  clientIp?: string;
  userAgent?: string;
  applicationModule: string;
}

interface FieldChange {
  fieldName: string;
  fieldLabel?: string;
  dataType?: string;
  oldValue: any;
  newValue: any;
  oldValueFormatted?: string;
  newValueFormatted?: string;
  valueUnit?: string;
  valueCurrency?: string;
  referenceTable?: string;
  referenceField?: string;
  referenceValue?: string;
  businessImpact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval?: boolean;
  complianceFlag?: boolean;
}

interface ChangeDocument {
  objectClass: string;
  objectId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  tableName: string;
  fieldChanges: FieldChange[];
  context: ChangeContext;
}

export class ChangeLogService {
  private pool: any;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Records a complete change document with all field changes
   */
  async recordChange(changeDoc: ChangeDocument): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create change document header
      const changeDocumentId = uuidv4();
      const headerResult = await client.query(`
        INSERT INTO change_document_headers (
          change_document_id, object_class, object_id, change_type,
          user_name, user_role, session_id, transaction_code,
          change_reason, business_process, reference_document,
          client_ip, user_agent, application_module,
          change_category, version_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING change_number
      `, [
        changeDocumentId,
        changeDoc.objectClass,
        changeDoc.objectId,
        changeDoc.changeType,
        changeDoc.context.userName,
        changeDoc.context.userRole || 'USER',
        changeDoc.context.sessionId,
        changeDoc.context.transactionCode,
        changeDoc.context.changeReason,
        changeDoc.context.businessProcess,
        changeDoc.context.referenceDocument,
        changeDoc.context.clientIp,
        changeDoc.context.userAgent,
        changeDoc.context.applicationModule,
        this.determineChangeCategory(changeDoc.objectClass),
        1
      ]);

      const changeNumber = headerResult.rows[0].change_number;

      // Record each field change
      for (let i = 0; i < changeDoc.fieldChanges.length; i++) {
        const fieldChange = changeDoc.fieldChanges[i];
        
        await client.query(`
          INSERT INTO change_document_positions (
            change_document_id, position_number, table_name, field_name,
            field_label, data_type, old_value, new_value,
            old_value_formatted, new_value_formatted, value_unit, value_currency,
            change_indicator, change_magnitude, change_percentage,
            reference_table, reference_field, reference_value,
            business_impact, requires_approval, compliance_flag,
            validation_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          changeDocumentId,
          i + 1,
          changeDoc.tableName,
          fieldChange.fieldName,
          fieldChange.fieldLabel || fieldChange.fieldName,
          fieldChange.dataType || 'TEXT',
          this.formatValue(fieldChange.oldValue),
          this.formatValue(fieldChange.newValue),
          fieldChange.oldValueFormatted || this.formatValue(fieldChange.oldValue),
          fieldChange.newValueFormatted || this.formatValue(fieldChange.newValue),
          fieldChange.valueUnit,
          fieldChange.valueCurrency,
          this.determineChangeIndicator(fieldChange.oldValue, fieldChange.newValue),
          this.calculateChangeMagnitude(fieldChange.oldValue, fieldChange.newValue),
          this.calculateChangePercentage(fieldChange.oldValue, fieldChange.newValue),
          fieldChange.referenceTable,
          fieldChange.referenceField,
          fieldChange.referenceValue,
          fieldChange.businessImpact || 'LOW',
          fieldChange.requiresApproval || false,
          fieldChange.complianceFlag || false,
          'VALID'
        ]);
      }

      await client.query('COMMIT');
      return changeNumber;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording change document:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Records a simple field change for quick logging
   */
  async recordFieldChange(
    objectClass: string,
    objectId: string,
    tableName: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    context: ChangeContext
  ): Promise<string> {
    const changeDoc: ChangeDocument = {
      objectClass,
      objectId,
      changeType: oldValue === null ? 'CREATE' : 'UPDATE',
      tableName,
      fieldChanges: [{
        fieldName,
        oldValue,
        newValue,
        businessImpact: 'LOW'
      }],
      context
    };

    return await this.recordChange(changeDoc);
  }

  /**
   * Records multiple related changes as a single transaction
   */
  async recordBulkChanges(changes: ChangeDocument[]): Promise<string[]> {
    const client = await this.pool.connect();
    const changeNumbers: string[] = [];

    try {
      await client.query('BEGIN');

      for (const changeDoc of changes) {
        const changeNumber = await this.recordChange(changeDoc);
        changeNumbers.push(changeNumber);
      }

      // Record relationships between changes
      for (let i = 0; i < changeNumbers.length - 1; i++) {
        await this.recordChangeRelation(
          changeNumbers[i],
          changeNumbers[i + 1],
          'TRIGGERS',
          'Bulk operation sequence'
        );
      }

      await client.query('COMMIT');
      return changeNumbers;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Records a relationship between two change documents
   */
  async recordChangeRelation(
    sourceChangeNumber: string,
    targetChangeNumber: string,
    relationType: string,
    businessContext?: string
  ): Promise<void> {
    await this.pool.query(`
      INSERT INTO change_document_relations (
        source_change_id, target_change_id, relation_type, business_context
      )
      SELECT 
        s.change_document_id,
        t.change_document_id,
        $3,
        $4
      FROM change_document_headers s, change_document_headers t
      WHERE s.change_number = $1 AND t.change_number = $2
    `, [sourceChangeNumber, targetChangeNumber, relationType, businessContext]);
  }

  /**
   * Gets change history for a specific object
   */
  async getChangeHistory(
    objectClass: string,
    objectId: string,
    limit: number = 100
  ): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        h.change_number,
        h.change_type,
        h.user_name,
        h.change_timestamp,
        h.business_process,
        h.change_reason,
        p.field_name,
        p.field_label,
        p.old_value_formatted,
        p.new_value_formatted,
        p.change_indicator,
        p.business_impact
      FROM change_document_headers h
      LEFT JOIN change_document_positions p ON h.change_document_id = p.change_document_id
      WHERE h.object_class = $1 AND h.object_id = $2
      ORDER BY h.change_timestamp DESC, p.position_number ASC
      LIMIT $3
    `, [objectClass, objectId, limit]);

    return this.groupChangesByDocument(result.rows);
  }

  /**
   * Gets change analytics for a specific period
   */
  async getChangeAnalytics(
    applicationModule: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await this.pool.query(`
      SELECT 
        h.object_class,
        h.change_type,
        COUNT(*) as change_count,
        COUNT(DISTINCT h.user_name) as unique_users,
        AVG(array_length(string_to_array(h.change_document_id::text, ''), 1)) as avg_fields_changed,
        COUNT(CASE WHEN p.business_impact = 'HIGH' THEN 1 END) as high_impact_changes,
        COUNT(CASE WHEN p.requires_approval THEN 1 END) as approval_required_changes
      FROM change_document_headers h
      LEFT JOIN change_document_positions p ON h.change_document_id = p.change_document_id
      WHERE h.application_module = $1 
        AND h.change_timestamp BETWEEN $2 AND $3
      GROUP BY h.object_class, h.change_type
      ORDER BY change_count DESC
    `, [applicationModule, startDate, endDate]);

    return result.rows;
  }

  /**
   * Validates data integrity across change documents
   */
  async validateChangeIntegrity(changeNumber: string): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT 
          h.change_document_id,
          h.object_class,
          h.object_id,
          COUNT(p.id) as position_count,
          COUNT(CASE WHEN p.validation_status = 'VALID' THEN 1 END) as valid_positions
        FROM change_document_headers h
        LEFT JOIN change_document_positions p ON h.change_document_id = p.change_document_id
        WHERE h.change_number = $1
        GROUP BY h.change_document_id, h.object_class, h.object_id
      `, [changeNumber]);

      if (result.rows.length === 0) return false;
      
      const row = result.rows[0];
      return row.position_count === row.valid_positions;

    } catch (error) {
      console.error('Error validating change integrity:', error);
      return false;
    }
  }

  // Helper methods
  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private determineChangeIndicator(oldValue: any, newValue: any): string {
    if (oldValue === null || oldValue === undefined) return 'INSERT';
    if (newValue === null || newValue === undefined) return 'DELETE';
    return 'UPDATE';
  }

  private calculateChangeMagnitude(oldValue: any, newValue: any): number | null {
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      return Math.abs(newValue - oldValue);
    }
    return null;
  }

  private calculateChangePercentage(oldValue: any, newValue: any): number | null {
    if (typeof oldValue === 'number' && typeof newValue === 'number' && oldValue !== 0) {
      return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
    }
    return null;
  }

  private determineChangeCategory(objectClass: string): string {
    const masterDataObjects = ['CUSTOMER', 'VENDOR', 'MATERIAL', 'COMPANY_CODE', 'PLANT'];
    const transactionObjects = ['SALES_ORDER', 'PURCHASE_ORDER', 'INVOICE', 'PAYMENT'];
    
    if (masterDataObjects.includes(objectClass)) return 'MASTER_DATA';
    if (transactionObjects.includes(objectClass)) return 'TRANSACTION';
    return 'CONFIGURATION';
  }

  private groupChangesByDocument(rows: any[]): any[] {
    const grouped = new Map();
    
    rows.forEach(row => {
      if (!grouped.has(row.change_number)) {
        grouped.set(row.change_number, {
          changeNumber: row.change_number,
          changeType: row.change_type,
          userName: row.user_name,
          changeTimestamp: row.change_timestamp,
          businessProcess: row.business_process,
          changeReason: row.change_reason,
          fieldChanges: []
        });
      }
      
      if (row.field_name) {
        grouped.get(row.change_number).fieldChanges.push({
          fieldName: row.field_name,
          fieldLabel: row.field_label,
          oldValue: row.old_value_formatted,
          newValue: row.new_value_formatted,
          changeIndicator: row.change_indicator,
          businessImpact: row.business_impact
        });
      }
    });

    return Array.from(grouped.values());
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default ChangeLogService;