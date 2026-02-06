import { db } from '../db';
import { arOpenItems } from '@shared/finance-schema';
import { sql, eq } from 'drizzle-orm';

export class AROpenItemsService {
  /**
   * Create AR open item when billing document is posted
   */
  async createAROpenItem(data: {
    billingDocumentId: number;
    customerId: number;
    documentNumber: string;
    invoiceNumber: string;
    documentType: string;
    postingDate: Date;
    dueDate: Date;
    originalAmount: number;
    outstandingAmount: number;
    currencyId: number;
    paymentTerms?: string;
    status: string;
    glAccountId: number;
    salesOrderId?: number;
    active: boolean;
  }): Promise<number> {
    try {
      const now = new Date();
      
      const [openItem] = await db
        .insert(arOpenItems)
        .values({
          billingDocumentId: data.billingDocumentId,
          customerId: data.customerId,
          documentNumber: data.documentNumber,
          invoiceNumber: data.invoiceNumber,
          documentType: data.documentType,
          postingDate: data.postingDate,
          dueDate: data.dueDate,
          originalAmount: data.originalAmount.toString(),
          outstandingAmount: data.outstandingAmount.toString(),
          currencyId: data.currencyId,
          paymentTerms: data.paymentTerms || null,
          status: data.status,
          glAccountId: data.glAccountId,
          salesOrderId: data.salesOrderId || null,
          createdAt: now,
          active: data.active,
        } as any)
        .returning();

      if (!openItem) {
        throw new Error('Failed to create AR open item');
      }

      return openItem.id;
    } catch (error: any) {
      console.error('Error creating AR open item:', error);
      throw new Error(`Failed to create AR open item: ${error.message}`);
    }
  }

  /**
   * Update outstanding amount when payment is received
   */
  async updateOutstandingAmount(
    openItemId: number,
    paymentAmount: number
  ): Promise<void> {
    try {
      const openItem = await db
        .select()
        .from(arOpenItems)
        .where(eq(arOpenItems.id, openItemId))
        .limit(1);

      if (openItem.length === 0) {
        throw new Error(`AR open item ${openItemId} not found`);
      }

      const currentOutstanding = parseFloat(openItem[0].outstandingAmount.toString());
      const newOutstanding = currentOutstanding - paymentAmount;

      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_cleared' AND active = true LIMIT 1) as cleared_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);
      
      const clearedStatus = statusConfigResult.rows[0]?.cleared_status || null;
      const partialStatus = statusConfigResult.rows[0]?.partial_status || null;
      
      if (!clearedStatus || !partialStatus) {
        throw new Error('AR status configuration not found. Please configure ar_status_cleared and ar_status_partial in system_configuration');
      }

      let newStatus = openItem[0].status;
      if (newOutstanding <= 0) {
        newStatus = clearedStatus;
      } else if (newOutstanding < currentOutstanding) {
        newStatus = partialStatus;
      }

      await db
        .update(arOpenItems)
        .set({
          outstandingAmount: newOutstanding.toString(),
          status: newStatus,
          lastPaymentDate: new Date(),
        } as any)
        .where(eq(arOpenItems.id, openItemId));
    } catch (error: any) {
      console.error('Error updating AR open item outstanding amount:', error);
      throw new Error(`Failed to update AR open item: ${error.message}`);
    }
  }

  /**
   * Get AR open items by customer
   */
  async getOpenItemsByCustomer(customerId: number): Promise<any[]> {
    try {
      const items = await db.execute(sql`
        SELECT 
          aoi.id,
          aoi.billing_document_id,
          aoi.customer_id,
          aoi.document_number,
          aoi.invoice_number,
          aoi.document_type,
          aoi.posting_date,
          aoi.due_date,
          aoi.original_amount::decimal as original_amount,
          aoi.outstanding_amount::decimal as outstanding_amount,
          aoi.currency_id,
          aoi.payment_terms,
          aoi.status,
          aoi.aging_bucket,
          aoi.last_payment_date,
          aoi.gl_account_id,
          aoi.sales_order_id,
          aoi.created_at,
          aoi.active,
          bd.billing_number,
          bd.billing_date,
          bd.total_amount,
          bd.net_amount,
          bd.tax_amount,
          bd.currency,
          ec.name as customer_name,
          ec.customer_code
        FROM ar_open_items aoi
        LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
        LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
        WHERE aoi.customer_id = ${customerId}
          AND aoi.active = true
        ORDER BY aoi.due_date ASC NULLS LAST, aoi.posting_date DESC
      `);

      return items.rows;
    } catch (error: any) {
      console.error('Error fetching AR open items:', error);
      throw new Error(`Failed to fetch AR open items: ${error.message}`);
    }
  }

  /**
   * Get AR open item by billing document ID
   */
  async getOpenItemByBillingDocument(billingDocumentId: number): Promise<any | null> {
    try {
      const items = await db.execute(sql`
        SELECT * FROM ar_open_items
        WHERE billing_document_id = ${billingDocumentId}
          AND active = true
        LIMIT 1
      `);

      return items.rows[0] || null;
    } catch (error: any) {
      console.error('Error fetching AR open item by billing document:', error);
      throw new Error(`Failed to fetch AR open item: ${error.message}`);
    }
  }
}

export const arOpenItemsService = new AROpenItemsService();

