import { db } from '../db';
import { apOpenItems } from '@shared/finance-schema';
import { sql, eq } from 'drizzle-orm';

export class APOpenItemsService {
  /**
   * Create AP open item when vendor invoice is posted
   */
  async createAPOpenItem(data: {
    vendorId: number;
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
    purchaseOrderId?: number;
    active: boolean;
  }): Promise<number> {
    try {
      const now = new Date();
      
      const [openItem] = await db
        .insert(apOpenItems)
        .values({
          vendorId: data.vendorId,
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
          purchaseOrderId: data.purchaseOrderId || null,
          createdAt: now,
          active: data.active,
        } as any)
        .returning();

      if (!openItem) {
        throw new Error('Failed to create AP open item');
      }

      return openItem.id;
    } catch (error: any) {
      console.error('Error creating AP open item:', error);
      throw new Error(`Failed to create AP open item: ${error.message}`);
    }
  }

  /**
   * Update outstanding amount when payment is made
   */
  async updateOutstandingAmount(
    openItemId: number,
    paymentAmount: number
  ): Promise<void> {
    try {
      const openItem = await db
        .select()
        .from(apOpenItems)
        .where(eq(apOpenItems.id, openItemId))
        .limit(1);

      if (openItem.length === 0) {
        throw new Error(`AP open item ${openItemId} not found`);
      }

      const currentOutstanding = parseFloat(openItem[0].outstandingAmount.toString());
      const newOutstanding = currentOutstanding - paymentAmount;

      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ap_status_cleared' AND active = true LIMIT 1) as cleared_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ap_status_partial' AND active = true LIMIT 1) as partial_status
      `);
      
      const clearedStatus = statusConfigResult.rows[0]?.cleared_status || null;
      const partialStatus = statusConfigResult.rows[0]?.partial_status || null;
      
      if (!clearedStatus || !partialStatus) {
        throw new Error('AP status configuration not found. Please configure ap_status_cleared and ap_status_partial in system_configuration');
      }

      let newStatus = openItem[0].status;
      if (newOutstanding <= 0) {
        newStatus = clearedStatus;
      } else if (newOutstanding < currentOutstanding) {
        newStatus = partialStatus;
      }

      await db
        .update(apOpenItems)
        .set({
          outstandingAmount: newOutstanding.toString(),
          status: newStatus,
          lastPaymentDate: new Date(),
        } as any)
        .where(eq(apOpenItems.id, openItemId));
    } catch (error: any) {
      console.error('Error updating AP open item outstanding amount:', error);
      throw new Error(`Failed to update AP open item: ${error.message}`);
    }
  }

  /**
   * Get AP open items by vendor
   */
  async getOpenItemsByVendor(vendorId: number): Promise<any[]> {
    try {
      const items = await db
        .select()
        .from(apOpenItems)
        .where(eq(apOpenItems.vendorId, vendorId))
        .where(eq(apOpenItems.active, true));

      return items;
    } catch (error: any) {
      console.error('Error fetching AP open items:', error);
      throw new Error(`Failed to fetch AP open items: ${error.message}`);
    }
  }

  /**
   * Get AP open item by invoice number
   */
  async getOpenItemByInvoiceNumber(invoiceNumber: string): Promise<any | null> {
    try {
      const items = await db.execute(sql`
        SELECT * FROM ap_open_items
        WHERE invoice_number = ${invoiceNumber}
          AND active = true
        LIMIT 1
      `);

      return items.rows[0] || null;
    } catch (error: any) {
      console.error('Error fetching AP open item by invoice number:', error);
      throw new Error(`Failed to fetch AP open item: ${error.message}`);
    }
  }
}

export const apOpenItemsService = new APOpenItemsService();

