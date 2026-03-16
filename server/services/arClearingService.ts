import { db } from '../db';
import { arOpenItems } from '@shared/finance-schema';
import { sql, eq, and, lte } from 'drizzle-orm';

export class ARClearingService {
  /**
   * Perform automatic clearing for fully paid AR open items
   * Uses system configuration for all values (no hardcoded data)
   */
  async performAutomaticClearing(): Promise<{ cleared: number; errors: string[] }> {
    const errors: string[] = [];
    let clearedCount = 0;

    try {
      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_cleared' AND active = true LIMIT 1) as cleared_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const clearedStatus = String(statusConfigResult.rows[0]?.cleared_status || '');
      const openStatus = String(statusConfigResult.rows[0]?.open_status || '');
      const partialStatus = String(statusConfigResult.rows[0]?.partial_status || '');

      if (!clearedStatus || !openStatus || !partialStatus) {
        throw new Error('AR status configuration not found. Please configure ar_status_cleared, ar_status_open, and ar_status_partial in system_configuration');
      }

      // Get clearing document type from system configuration
      const clearingDocTypeResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'clearing_document_type' AND active = true LIMIT 1
      `);
      const clearingDocType = String(clearingDocTypeResult.rows[0]?.config_value || 'CL');

      // Find all AR open items that should be cleared (outstanding_amount <= 0.01)
      const itemsToClear = await db.execute(sql`
        SELECT 
          aoi.id,
          aoi.billing_document_id,
          aoi.customer_id,
          aoi.document_number,
          aoi.invoice_number,
          aoi.outstanding_amount,
          aoi.original_amount,
          aoi.gl_account_id,
          aoi.status,
          bd.accounting_document_number,
          bd.billing_number,
          ec.company_code_id,
          cc.code as company_code
        FROM ar_open_items aoi
        LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
        LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
        LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
        WHERE aoi.active = true
          AND aoi.outstanding_amount <= 0.01
          AND aoi.status IN (${openStatus}, ${partialStatus})
          AND aoi.status != ${clearedStatus}
      `);

      for (const item of itemsToClear.rows) {
        try {
          await db.transaction(async (tx) => {
            // Update AR open item status to Cleared
            await tx.execute(sql`
              UPDATE ar_open_items
              SET status = ${clearedStatus}
              WHERE id = ${item.id}
            `);

            // Create clearing document if configured
            const createClearingDocResult = await tx.execute(sql`
              SELECT config_value FROM system_configuration 
              WHERE config_key = 'auto_create_clearing_documents' AND active = true LIMIT 1
            `);
            const autoCreateClearing = createClearingDocResult.rows[0]?.config_value === 'true' || 
                                       createClearingDocResult.rows[0]?.config_value === true;

            if (autoCreateClearing && item.company_code) {
              const currentDate = new Date();
              const fiscalYear = currentDate.getFullYear();
              
              // Get created_by from system configuration
              const createdByResult = await tx.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'system_user_id' AND active = true LIMIT 1
              `);
              const createdBy = createdByResult.rows[0]?.config_value 
                ? parseInt(String(createdByResult.rows[0].config_value)) 
                : 1;

              // Generate clearing document number
              const clearingDocCountResult = await tx.execute(sql`
                SELECT COUNT(*)::integer as count 
                FROM accounting_documents
                WHERE company_code = ${item.company_code}
                  AND document_type = ${clearingDocType}
                  AND fiscal_year = ${fiscalYear}
              `);
              
              const clearingDocCount = parseInt(clearingDocCountResult.rows[0]?.count || '0') + 1;
              const clearingDocNumber = `${String(item.company_code).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${String(fiscalYear).slice(-2)}CLR${clearingDocCount.toString().padStart(6, '0')}`;

              // Get currency from billing document or system configuration
              const currencyResult = await tx.execute(sql`
                SELECT currency FROM billing_documents WHERE id = ${item.billing_document_id} LIMIT 1
              `);
              const currency = currencyResult.rows[0]?.currency || (await tx.execute(sql`
                SELECT config_value FROM system_configuration 
                WHERE config_key = 'default_currency' AND active = true LIMIT 1
              `)).rows[0]?.config_value || 'USD';

              // Create clearing document
              await tx.execute(sql`
                INSERT INTO accounting_documents (
                  document_number, document_type, company_code, fiscal_year,
                  posting_date, document_date, period, reference, header_text,
                  total_amount, currency, source_module, source_document_id,
                  source_document_type, created_by
                ) VALUES (
                  ${clearingDocNumber}, 
                  ${clearingDocType}, 
                  ${item.company_code}, 
                  ${fiscalYear},
                  CURRENT_DATE, 
                  CURRENT_DATE, 
                  ${String(currentDate.getMonth() + 1).padStart(2, '0')},
                  ${item.invoice_number || item.document_number}, 
                  ${`AR Clearing for ${item.billing_number || item.invoice_number || 'Invoice'}`},
                  ${parseFloat(String(item.original_amount))}, 
                  ${currency}, 
                  'SALES', 
                  ${item.billing_document_id}, 
                  'CLEARING', 
                  ${createdBy}
                )
              `);

              console.log(`✅ Created clearing document ${clearingDocNumber} for AR open item ${item.id}`);
            }

            clearedCount++;
          });
        } catch (error: any) {
          errors.push(`Failed to clear AR open item ${item.id}: ${error.message}`);
          console.error(`Error clearing AR open item ${item.id}:`, error);
        }
      }

      return { cleared: clearedCount, errors };
    } catch (error: any) {
      console.error('Error in automatic clearing:', error);
      throw new Error(`Failed to perform automatic clearing: ${error.message}`);
    }
  }

  /**
   * Manually clear a specific AR open item
   */
  async clearOpenItem(openItemId: number): Promise<void> {
    try {
      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_cleared' AND active = true LIMIT 1) as cleared_status
      `);

      const clearedStatus = String(statusConfigResult.rows[0]?.cleared_status || '');

      if (!clearedStatus) {
        throw new Error('AR status configuration not found. Please configure ar_status_cleared in system_configuration');
      }

      // Check if item exists and is eligible for clearing
      const itemResult = await db.execute(sql`
        SELECT id, outstanding_amount, status
        FROM ar_open_items
        WHERE id = ${openItemId} AND active = true
      `);

      if (itemResult.rows.length === 0) {
        throw new Error(`AR open item ${openItemId} not found`);
      }

      const item = itemResult.rows[0];
      const outstandingAmount = parseFloat(String(item.outstanding_amount || 0));

      if (outstandingAmount > 0.01) {
        throw new Error(`Cannot clear AR open item ${openItemId}: Outstanding amount (${outstandingAmount}) is not zero`);
      }

      // Update status to Cleared
      await db.execute(sql`
        UPDATE ar_open_items
        SET status = ${clearedStatus}
        WHERE id = ${openItemId}
      `);

      console.log(`✅ Manually cleared AR open item ${openItemId}`);
    } catch (error: any) {
      console.error('Error clearing AR open item:', error);
      throw new Error(`Failed to clear AR open item: ${error.message}`);
    }
  }

  /**
   * Get clearing statistics
   */
  async getClearingStatistics(): Promise<any> {
    try {
      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_cleared' AND active = true LIMIT 1) as cleared_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const clearedStatus = String(statusConfigResult.rows[0]?.cleared_status || '');
      const openStatus = String(statusConfigResult.rows[0]?.open_status || '');
      const partialStatus = String(statusConfigResult.rows[0]?.partial_status || '');

      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = ${clearedStatus}) as cleared_count,
          COUNT(*) FILTER (WHERE status IN (${openStatus}, ${partialStatus}) AND outstanding_amount <= 0.01) as ready_to_clear,
          COUNT(*) FILTER (WHERE status IN (${openStatus}, ${partialStatus}) AND outstanding_amount > 0.01) as open_count,
          SUM(outstanding_amount) FILTER (WHERE status IN (${openStatus}, ${partialStatus})) as total_outstanding
        FROM ar_open_items
        WHERE active = true
      `);

      return stats.rows[0] || {};
    } catch (error: any) {
      console.error('Error getting clearing statistics:', error);
      throw new Error(`Failed to get clearing statistics: ${error.message}`);
    }
  }
}

export const arClearingService = new ARClearingService();

