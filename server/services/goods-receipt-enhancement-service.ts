import pkg from 'pg';
const { Pool } = pkg;
import { MMFIIntegrationService } from './mm-fi-integration-service';

/**
 * Goods Receipt Enhancement Service
 * Integrates three-way matching and purchase commitment release with goods receipt process
 * All values fetched from database - no hardcoded data
 */
export class GoodsReceiptEnhancementService {
  private pool: Pool;
  private mmfiService: MMFIIntegrationService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.mmfiService = new MMFIIntegrationService();
  }

  /**
   * Perform three-way matching when goods receipt is posted
   * Matches Purchase Order, Goods Receipt, and Vendor Invoice
   */
  async performThreeWayMatchOnReceipt(params: {
    purchaseOrderId: number;
    goodsReceiptId: number;
    invoiceId?: number;
  }): Promise<{
    matchStatus: string;
    priceVariance: number;
    quantityVariance: number;
    variancePostingRequired: boolean;
    glDocumentNumber?: string;
  }> {
    try {
      // Get purchase order details
      const poResult = await this.pool.query(`
        SELECT 
          po.id,
          po.order_number,
          poi.material_id,
          poi.material_code,
          poi.quantity as ordered_quantity,
          poi.unit_price as po_unit_price,
          poi.received_quantity,
          poi.invoiced_quantity
        FROM purchase_orders po
        JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE po.id = $1 AND poi.active = true
        LIMIT 1
      `, [params.purchaseOrderId]);

      if (poResult.rows.length === 0) {
        throw new Error(`Purchase order ${params.purchaseOrderId} not found`);
      }

      const po = poResult.rows[0];

      // Get goods receipt details
      const grResult = await this.pool.query(`
        SELECT 
          id,
          material_code,
          quantity as received_quantity,
          unit_price as gr_unit_price,
          purchase_order_id
        FROM goods_receipts
        WHERE id = $1 AND posted = true
      `, [params.goodsReceiptId]);

      if (grResult.rows.length === 0) {
        throw new Error(`Goods receipt ${params.goodsReceiptId} not found or not posted`);
      }

      const gr = grResult.rows[0];

      // Get invoice details if provided
      let invoicePrice = po.po_unit_price;
      let invoiceQuantity = gr.received_quantity;
      
      if (params.invoiceId) {
        const invoiceResult = await this.pool.query(`
          SELECT 
            line_items->0->>'unit_price' as unit_price,
            line_items->0->>'quantity' as quantity
          FROM ap_invoices
          WHERE id = $1 AND status = 'POSTED'
        `, [params.invoiceId]);

        if (invoiceResult.rows.length > 0) {
          invoicePrice = parseFloat(invoiceResult.rows[0].unit_price || String(po.po_unit_price));
          invoiceQuantity = parseFloat(invoiceResult.rows[0].quantity || String(gr.received_quantity));
        }
      }

      // Calculate variances
      const priceVariance = (invoicePrice - po.po_unit_price) * gr.received_quantity;
      const quantityVariance = (gr.received_quantity - po.ordered_quantity) * po.po_unit_price;

      // Get tolerance from system configuration
      const toleranceResult = await this.pool.query(`
        SELECT config_value::numeric as tolerance_percentage
        FROM system_configuration
        WHERE config_key = 'three_way_match_tolerance_percentage' AND active = true
        LIMIT 1
      `);

      const tolerancePercentage = toleranceResult.rows.length > 0 
        ? parseFloat(toleranceResult.rows[0].tolerance_percentage || '5')
        : 5.0;

      const expectedAmount = po.po_unit_price * gr.received_quantity;
      const priceVariancePercentage = expectedAmount > 0 
        ? (Math.abs(priceVariance) / expectedAmount) * 100 
        : 0;

      let matchStatus = 'MATCHED';
      let variancePostingRequired = false;

      if (Math.abs(priceVariancePercentage) > tolerancePercentage || Math.abs(quantityVariance) > 0) {
        matchStatus = 'VARIANCE';
        variancePostingRequired = true;
      }

      // Post variance to inventory if required
      let glDocumentNumber: string | undefined;
      if (variancePostingRequired) {
        glDocumentNumber = await this.postVarianceToInventory({
          purchaseOrderId: params.purchaseOrderId,
          goodsReceiptId: params.goodsReceiptId,
          priceVariance,
          quantityVariance,
          materialCode: gr.material_code
        });
      }

      // Update three-way match record
      await this.pool.query(`
        INSERT INTO three_way_matches (
          purchase_order_id,
          goods_receipt_id,
          invoice_id,
          material_id,
          po_quantity,
          gr_quantity,
          invoice_quantity,
          po_price,
          gr_price,
          invoice_price,
          price_variance,
          quantity_variance,
          status,
          variance_gl_document
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (purchase_order_id, goods_receipt_id) 
        DO UPDATE SET
          invoice_id = COALESCE(EXCLUDED.invoice_id, three_way_matches.invoice_id),
          invoice_quantity = COALESCE(EXCLUDED.invoice_quantity, three_way_matches.invoice_quantity),
          invoice_price = COALESCE(EXCLUDED.invoice_price, three_way_matches.invoice_price),
          price_variance = EXCLUDED.price_variance,
          quantity_variance = EXCLUDED.quantity_variance,
          status = EXCLUDED.status,
          variance_gl_document = COALESCE(EXCLUDED.variance_gl_document, three_way_matches.variance_gl_document),
          updated_at = CURRENT_TIMESTAMP
      `, [
        params.purchaseOrderId,
        params.goodsReceiptId,
        params.invoiceId || null,
        po.material_id,
        po.ordered_quantity,
        gr.received_quantity,
        invoiceQuantity,
        po.po_unit_price,
        gr.gr_unit_price,
        invoicePrice,
        priceVariance,
        quantityVariance,
        matchStatus,
        glDocumentNumber || null
      ]);

      return {
        matchStatus,
        priceVariance,
        quantityVariance,
        variancePostingRequired,
        glDocumentNumber
      };
    } catch (error: any) {
      console.error('Error performing three-way match on receipt:', error);
      throw new Error(`Three-way matching failed: ${error.message}`);
    }
  }

  /**
   * Post variance to inventory value
   */
  private async postVarianceToInventory(params: {
    purchaseOrderId: number;
    goodsReceiptId: number;
    priceVariance: number;
    quantityVariance: number;
    materialCode: string;
  }): Promise<string> {
    // Generate GL document number
    const currentYear = new Date().getFullYear();
    const docCountResult = await this.pool.query(`
      SELECT COUNT(*) as count 
      FROM accounting_documents 
      WHERE document_number LIKE $1
    `, [`GL-${currentYear}-%`]);
    const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
    const glDocumentNumber = `GL-${currentYear}-${docCount.toString().padStart(6, '0')}`;

    // Get variance GL accounts from account_determination_rules
    const varianceAccountResult = await this.pool.query(`
      SELECT debit_account, credit_account
      FROM account_determination_rules
      WHERE movement_type = 'VARIANCE'
        AND is_active = true
      LIMIT 1
    `);

    if (varianceAccountResult.rows.length === 0) {
      throw new Error('Variance GL accounts not configured. Please set up account_determination_rules for movement_type = VARIANCE');
    }

    const varianceDebitAccount = varianceAccountResult.rows[0].debit_account;
    const varianceCreditAccount = varianceAccountResult.rows[0].credit_account;

    // Create accounting document for variance
    await this.pool.query(`
      INSERT INTO accounting_documents (
        document_number,
        document_type,
        document_date,
        posting_date,
        reference,
        currency,
        total_amount,
        status,
        created_at
      ) VALUES ($1, 'INVENTORY_VARIANCE', CURRENT_DATE, CURRENT_DATE, $2, 
        (SELECT currency FROM materials WHERE code = $3 LIMIT 1), 
        $4, 'POSTED', NOW())
    `, [glDocumentNumber, `PO-${params.purchaseOrderId}`, params.materialCode, Math.abs(params.priceVariance)]);

    // Post variance to inventory if price variance exists
    if (params.priceVariance !== 0) {
      const varianceAmount = Math.abs(params.priceVariance);
      
      // Debit/Credit based on variance type
      if (params.priceVariance > 0) {
        // Unfavorable variance: Debit variance account, Credit inventory
        await this.pool.query(`
          INSERT INTO journal_entries (
            document_id,
            gl_account,
            debit_amount,
            credit_amount,
            description,
            reference,
            created_at
          ) VALUES (
            (SELECT id FROM accounting_documents WHERE document_number = $1),
            $2, $3, 0, $4, $5, NOW()
          )
        `, [glDocumentNumber, varianceDebitAccount, varianceAmount, 
          `Price variance for PO ${params.purchaseOrderId}`, `GR-${params.goodsReceiptId}`]);

        // Get inventory account for material
        const inventoryAccountResult = await this.pool.query(`
          SELECT gl_account FROM materials WHERE code = $1 LIMIT 1
        `, [params.materialCode]);

        if (inventoryAccountResult.rows.length > 0 && inventoryAccountResult.rows[0].gl_account) {
          await this.pool.query(`
            INSERT INTO journal_entries (
              document_id,
              gl_account,
              debit_amount,
              credit_amount,
              description,
              reference,
              created_at
            ) VALUES (
              (SELECT id FROM accounting_documents WHERE document_number = $1),
              $2, 0, $3, $4, $5, NOW()
            )
          `, [glDocumentNumber, inventoryAccountResult.rows[0].gl_account, varianceAmount,
            `Price variance adjustment for ${params.materialCode}`, `GR-${params.goodsReceiptId}`]);
        }
      } else {
        // Favorable variance: Debit inventory, Credit variance account
        const inventoryAccountResult = await this.pool.query(`
          SELECT gl_account FROM materials WHERE code = $1 LIMIT 1
        `, [params.materialCode]);

        if (inventoryAccountResult.rows.length > 0 && inventoryAccountResult.rows[0].gl_account) {
          await this.pool.query(`
            INSERT INTO journal_entries (
              document_id,
              gl_account,
              debit_amount,
              credit_amount,
              description,
              reference,
              created_at
            ) VALUES (
              (SELECT id FROM accounting_documents WHERE document_number = $1),
              $2, $3, 0, $4, $5, NOW()
            )
          `, [glDocumentNumber, inventoryAccountResult.rows[0].gl_account, varianceAmount,
            `Favorable price variance for ${params.materialCode}`, `GR-${params.goodsReceiptId}`]);

          await this.pool.query(`
            INSERT INTO journal_entries (
              document_id,
              gl_account,
              debit_amount,
              credit_amount,
              description,
              reference,
              created_at
            ) VALUES (
              (SELECT id FROM accounting_documents WHERE document_number = $1),
              $2, 0, $3, $4, $5, NOW()
            )
          `, [glDocumentNumber, varianceCreditAccount, varianceAmount,
            `Favorable variance for PO ${params.purchaseOrderId}`, `GR-${params.goodsReceiptId}`]);
        }
      }
    }

    return glDocumentNumber;
  }

  /**
   * Release purchase commitment when goods receipt is posted
   */
  async releasePurchaseCommitment(params: {
    purchaseOrderId: number;
    goodsReceiptId: number;
    receivedQuantity: number;
  }): Promise<{
    releasedAmount: number;
    remainingCommitment: number;
    glDocumentNumber?: string;
  }> {
    try {
      // Get purchase commitments for this PO
      const commitmentResult = await this.pool.query(`
        SELECT 
          id,
          purchase_order_id,
          total_value,
          quantity,
          status,
          gl_account
        FROM purchase_commitments
        WHERE purchase_order_id = $1 
          AND status IN ('open', 'partial')
        ORDER BY id
        LIMIT 1
      `, [params.purchaseOrderId]);

      if (commitmentResult.rows.length === 0) {
        // No commitment to release
        return {
          releasedAmount: 0,
          remainingCommitment: 0
        };
      }

      const commitment = commitmentResult.rows[0];
      const commitmentValue = parseFloat(commitment.total_value || '0');
      const commitmentQuantity = parseFloat(commitment.quantity || '0');

      // Calculate release amount based on received quantity
      const releasePercentage = commitmentQuantity > 0 
        ? params.receivedQuantity / commitmentQuantity 
        : 1.0;
      const releasedAmount = commitmentValue * Math.min(releasePercentage, 1.0);
      const remainingCommitment = commitmentValue - releasedAmount;

      // Update commitment status
      const newStatus = remainingCommitment <= 0.01 ? 'closed' : 'partial';
      await this.pool.query(`
        UPDATE purchase_commitments
        SET 
          status = $1,
          actual_delivery = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newStatus, commitment.id]);

      // Generate GL document number for commitment release
      const currentYear = new Date().getFullYear();
      const docCountResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM accounting_documents 
        WHERE document_number LIKE $1
      `, [`GL-${currentYear}-%`]);
      const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
      const glDocumentNumber = `GL-${currentYear}-${docCount.toString().padStart(6, '0')}`;

      // Get commitment offset account (reverse of commitment posting)
      const offsetAccountResult = await this.pool.query(`
        SELECT account_number 
        FROM gl_accounts 
        WHERE account_type = 'ASSETS' 
          AND (account_name ILIKE '%commitment%' OR account_name ILIKE '%offset%')
          AND is_active = true 
        ORDER BY account_number 
        LIMIT 1
      `);

      if (offsetAccountResult.rows.length === 0) {
        throw new Error('Commitment offset GL account not configured');
      }

      const offsetAccount = offsetAccountResult.rows[0].account_number;
      const commitmentAccount = commitment.gl_account;

      // Create accounting document for commitment release
      await this.pool.query(`
        INSERT INTO accounting_documents (
          document_number,
          document_type,
          document_date,
          posting_date,
          reference,
          currency,
          total_amount,
          status,
          created_at
        ) VALUES ($1, 'COMMITMENT_RELEASE', CURRENT_DATE, CURRENT_DATE, $2, 
          (SELECT currency FROM purchase_orders WHERE id = $3 LIMIT 1), 
          $4, 'POSTED', NOW())
      `, [glDocumentNumber, `PO-${params.purchaseOrderId}`, params.purchaseOrderId, releasedAmount]);

      // Reverse commitment entry: Debit commitment account, Credit offset account
      await this.pool.query(`
        INSERT INTO journal_entries (
          document_id,
          gl_account,
          debit_amount,
          credit_amount,
          description,
          reference,
          created_at
        ) VALUES (
          (SELECT id FROM accounting_documents WHERE document_number = $1),
          $2, $3, 0, $4, $5, NOW()
        )
      `, [glDocumentNumber, commitmentAccount, releasedAmount,
        `Commitment release for PO ${params.purchaseOrderId}`, `GR-${params.goodsReceiptId}`]);

      await this.pool.query(`
        INSERT INTO journal_entries (
          document_id,
          gl_account,
          debit_amount,
          credit_amount,
          description,
          reference,
          created_at
        ) VALUES (
          (SELECT id FROM accounting_documents WHERE document_number = $1),
          $2, 0, $3, $4, $5, NOW()
        )
      `, [glDocumentNumber, offsetAccount, releasedAmount,
        `Commitment offset release for PO ${params.purchaseOrderId}`, `GR-${params.goodsReceiptId}`]);

      return {
        releasedAmount,
        remainingCommitment,
        glDocumentNumber
      };
    } catch (error: any) {
      console.error('Error releasing purchase commitment:', error);
      throw new Error(`Purchase commitment release failed: ${error.message}`);
    }
  }
}

