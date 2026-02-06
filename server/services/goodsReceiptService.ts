import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;
import { InventoryTrackingService } from './inventoryTrackingService.js';

interface GoodsReceiptData {
  grnNumber: string;
  materialCode: string;
  plantId: number;

  quantity: number;
  unitPrice: number;
  receiptType: 'PURCHASE_ORDER' | 'PRODUCTION' | 'TRANSFER' | 'RETURN';
  referenceDocument: string;
  vendorCode?: string;
  batchNumber?: string;
}

interface QualityInspectionResult {
  inspectionNumber: string;
  materialCode: string;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  qualityGrade: 'A' | 'B' | 'C' | 'REJECTED';
  inspectionResults: string;
}

export class GoodsReceiptService {
  private pool: PoolType;
  private inventoryTrackingService: InventoryTrackingService;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.inventoryTrackingService = new InventoryTrackingService(pool);
  }

  /**
   * Create goods receipt from purchase order
   * This implements the GRN process from your diagram
   */
  /**
   * Create goods receipt from purchase order
   * Supports both single item (legacy) and bulk items (array)
   */
  async createGoodsReceiptFromPO(
    purchaseOrderId: number,
    receiptData: {
      items?: Array<{
        materialId?: number;
        materialCode?: string;
        receivedQuantity: number;
        unitPrice: number;
        batchNumber?: string;
        qualityInspectionRequired?: boolean;
      }>;
      // Legacy single-item fields (for backward compatibility)
      materialId?: number;
      materialCode?: string;
      receivedQuantity?: number;
      unitPrice?: number;
      batchNumber?: string;
      qualityInspectionRequired?: boolean;

      deliveryNote?: string;
      billOfLading?: string;
    },
    receivedBy: string | null = null,
    providedClient?: any
  ): Promise<{ success: boolean; grnNumber?: string; grnId?: number; requiresQualityCheck?: boolean }> {
    const useProvidedClient = !!providedClient;
    const client = providedClient || await this.pool.connect();

    // Normalize input: Convert legacy single-item call to item array
    const items = receiptData.items || [];
    if (items.length === 0 && receiptData.materialId && receiptData.receivedQuantity !== undefined) {
      items.push({
        materialId: receiptData.materialId,
        materialCode: receiptData.materialCode,
        receivedQuantity: receiptData.receivedQuantity,
        unitPrice: receiptData.unitPrice || 0,
        batchNumber: receiptData.batchNumber,
        qualityInspectionRequired: receiptData.qualityInspectionRequired
      });
    }

    try {
      if (!useProvidedClient) {
        await client.query('BEGIN');
      }

      // Validate input
      if (items.length === 0) {
        throw new Error('At least one item is required to create a goods receipt');
      }

      // 1. Fetch PO Header Details (only once)
      const poHeaderResult = await client.query(`
        SELECT 
          po.id, po.order_number, po.vendor_id, po.plant_id, po.status,
          v.code as vendor_code
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = $1 AND po.status NOT IN ('CLOSED', 'CANCELLED')
      `, [purchaseOrderId]);

      if (poHeaderResult.rows.length === 0) {
        throw new Error(`Purchase order ${purchaseOrderId} not found or is closed/cancelled`);
      }
      const poData = poHeaderResult.rows[0];

      // Validate Plant - Check header first, then fallback to items
      let plantId = poData.plant_id;

      if (!plantId) {
        // Fallback 1: Try to get plant_id from the first item of this PO
        const itemPlantResult = await client.query(
          'SELECT plant_id, material_id FROM purchase_order_items WHERE purchase_order_id = $1 LIMIT 1',
          [purchaseOrderId]
        );

        if (itemPlantResult.rows.length > 0) {
          if (itemPlantResult.rows[0].plant_id) {
            plantId = itemPlantResult.rows[0].plant_id;
            console.log(`ℹ️ PO header has no plant_id, using plant_id ${plantId} from first item.`);
          } else if (itemPlantResult.rows[0].material_id) {
            // Fallback 2: Try to get plant from the material master of the first item
            const materialId = itemPlantResult.rows[0].material_id;
            console.log(`ℹ️ PO item has no plant_id, attempting to derive from material ${materialId}...`);

            const materialPlantResult = await client.query(
              'SELECT plant_code FROM materials WHERE id = $1',
              [materialId]
            );

            if (materialPlantResult.rows.length > 0 && materialPlantResult.rows[0].plant_code) {
              const plantCode = materialPlantResult.rows[0].plant_code;
              const plantIdResult = await client.query('SELECT id FROM plants WHERE code = $1', [plantCode]);

              if (plantIdResult.rows.length > 0) {
                plantId = plantIdResult.rows[0].id;
                console.log(`ℹ️ Derived plant_id ${plantId} (code: ${plantCode}) from material master.`);
              }
            }
          }
        }

        if (!plantId) {
          // Final Fallback: If company_code_id exists in PO, get the first plant for that company
          if (poData.company_code_id) {
            console.log(`ℹ️ Attempting to derive default plant for company_code_id ${poData.company_code_id}...`);
            const defaultPlantResult = await client.query(
              'SELECT id FROM plants WHERE company_code_id = $1 LIMIT 1',
              [poData.company_code_id]
            );
            if (defaultPlantResult.rows.length > 0) {
              plantId = defaultPlantResult.rows[0].id;
              console.log(`ℹ️ Using default plant_id ${plantId} for company code.`);
            }
          }
        }

        if (!plantId) {
          throw new Error(`Purchase Order ${purchaseOrderId} does not have a plant assigned (neither in header, items, material master, nor company default).`);
        }
      }

      // Get Plant Code
      const plantResult = await client.query('SELECT code, name FROM plants WHERE id = $1', [plantId]);
      const plantCode = plantResult.rows[0]?.code?.substring(0, 4);
      if (!plantCode) throw new Error(`Plant code not found for plant_id: ${plantId}`);

      // Validate Vendor Code (Required for Header)
      let vendorCode = poData.vendor_code ? poData.vendor_code.substring(0, 10) : null;
      if (!vendorCode) throw new Error(`Vendor code not found for vendor_id: ${poData.vendor_id}`);

      // NOTE: Storage location is retrieved at ITEM level (SAP standard)
      // Each material gets its storage location from purchase_order_items table
      // No warehouse_type_id needed at header level

      // Validate Received By
      let finalReceivedBy = receivedBy;
      if (!finalReceivedBy) {
        const settingsResult = await client.query(`SELECT setting_value FROM document_settings WHERE setting_key = 'default_received_by'`);
        finalReceivedBy = settingsResult.rows[0]?.setting_value;
        if (!finalReceivedBy) throw new Error('received_by is required.');
      }

      // 2. Create Header (goods_receipts)
      const grnNumber = `GRN${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Calculate Header Totals
      const totalQuantity = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
      const totalValue = items.reduce((sum, item) => sum + (item.receivedQuantity * item.unitPrice), 0);
      const headerStatus = 'COMPLETED'; // Simplified for bulk

      const headerQuery = `
        INSERT INTO goods_receipts (
          receipt_number, grn_number, purchase_order_id, vendor_code, plant_id, plant_code,
          warehouse_type_id, total_quantity, total_amount, 
          receipt_date, receipt_type, received_by, status,
          delivery_note, bill_of_lading,
          material_code, quantity, unit_price, total_value -- LEGACY HEADER FIELDS (Use first item or agg)
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, 'PURCHASE_ORDER', $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      // For legacy columns on header (material_code, quantity, etc.), we use the first item's data
      // This ensures backward compatibility if any systems read from header-level material info
      const firstItem = items[0];

      const headerValues = [
        grnNumber, purchaseOrderId, vendorCode, plantId, plantCode,
        null, // warehouse_type_id - deprecated, storage location now at item level
        totalQuantity, totalValue,
        finalReceivedBy, headerStatus,
        receiptData.deliveryNote || null, receiptData.billOfLading || null,
        firstItem.materialCode || 'BULK', totalQuantity, (totalValue / totalQuantity) || 0, totalValue
      ];

      const grHeaderResult = await client.query(headerQuery, headerValues);
      const grId = grHeaderResult.rows[0].id;
      console.log(`[GoodsReceipt] Created Header ID: ${grId} (GRN: ${grnNumber})`);

      // 3. Process Items
      let requiresQualityCheck = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Get PO item details including plant and storage location (SAP standard - item level)
        const poItemResult = await client.query(`
          SELECT 
            poi.plant_id as item_plant_id,
            poi.storage_location_id,
            sl.code as storage_location_code,
            p.code as item_plant_code
          FROM purchase_order_items poi
          LEFT JOIN storage_locations sl ON poi.storage_location_id = sl.id
          LEFT JOIN plants p ON poi.plant_id = p.id
          WHERE poi.purchase_order_id = $1 AND poi.material_id = $2
          LIMIT 1
        `, [purchaseOrderId, item.materialId]);

        let itemPlantId = plantId; // Default to header plant
        let itemPlantCode = plantCode; // Default to header plant code
        let itemStorageLocationCode: string | null = null;

        if (poItemResult.rows.length > 0) {
          const poItem = poItemResult.rows[0];
          // Use item-level plant if available, otherwise use header plant
          if (poItem.item_plant_id) {
            itemPlantId = poItem.item_plant_id;
            itemPlantCode = poItem.item_plant_code || plantCode;
          }
          itemStorageLocationCode = poItem.storage_location_code;
        }

        // If no storage location from PO item, get from material master
        if (!itemStorageLocationCode && item.materialId) {
          const materialStorageResult = await client.query(`
            SELECT m.production_storage_location, sl.code as storage_code
            FROM materials m
            LEFT JOIN storage_locations sl ON m.production_storage_location = sl.code AND sl.plant_id = $2
            WHERE m.id = $1
          `, [item.materialId, itemPlantId]);

          if (materialStorageResult.rows.length > 0) {
            itemStorageLocationCode = materialStorageResult.rows[0].storage_code || materialStorageResult.rows[0].production_storage_location;
          }
        }

        // Final fallback: get any storage location for the plant
        if (!itemStorageLocationCode) {
          const fallbackStorageResult = await client.query(`
            SELECT code FROM storage_locations 
            WHERE plant_id = $1 AND status = 'active' 
            ORDER BY id LIMIT 1
          `, [itemPlantId]);

          if (fallbackStorageResult.rows.length > 0) {
            itemStorageLocationCode = fallbackStorageResult.rows[0].code;
          }
        }

        if (!itemStorageLocationCode) {
          throw new Error(`Storage location not found for material ${item.materialCode} at plant ${itemPlantCode}. Please configure storage location in PO item or material master.`);
        }

        console.log(`Creating Goods Receipt for material ${item.materialCode} (ID: ${item.materialId}), quantity: ${item.receivedQuantity}, storage: ${itemStorageLocationCode}`);

        // Ensure material code and UOM are populated
        if ((!item.materialCode || !item.unitOfMeasure) && item.materialId) {
          const matRes = await client.query('SELECT code, base_uom FROM materials WHERE id = $1', [item.materialId]);
          if (matRes.rows.length > 0) {
            if (!item.materialCode) item.materialCode = matRes.rows[0].code;
            if (!item.unitOfMeasure) item.unitOfMeasure = matRes.rows[0].base_uom;
          }
        }

        // Default UOM if still missing (should not happen with valid master data)
        if (!item.unitOfMeasure) item.unitOfMeasure = 'PC';


        // Insert into goods_receipt_items
        const lineQuery = `
          INSERT INTO goods_receipt_items (
            receipt_id, line_number, material_code, quantity, unit_price, 
            batch_number, quality_inspection, unit_of_measure
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        // Quality check logic per item
        let itemQualityRequired = item.qualityInspectionRequired;
        if (itemQualityRequired === undefined) {
          // Default logic (check material or settings) - Simplified for now to default false
          itemQualityRequired = false;
        }
        if (itemQualityRequired) requiresQualityCheck = true;

        await client.query(lineQuery, [
          grId, i + 1, item.materialCode, item.receivedQuantity, item.unitPrice,
          item.batchNumber || null, itemQualityRequired, item.unitOfMeasure
        ]);

        // Update PO Item Status (Decrease Pending Quantity)
        if (item.materialId) {
          await this.updatePOReceiptStatus(client, purchaseOrderId, item.materialId, item.materialCode, item.receivedQuantity);
        }

        // Post Goods Receipt (Stock Update) per Item using item-level storage location
        if (!itemQualityRequired) {
          await this.postGoodsReceiptWithStorageLocation(
            client,
            grId,
            item.materialId,
            item.materialCode,
            itemPlantId,
            itemPlantCode,
            itemStorageLocationCode,
            item.receivedQuantity,
            item.unitPrice
          );
        } else {
          await this.createQualityInspection(grId, item.materialCode, item.receivedQuantity);
        }
      }

      if (!useProvidedClient) {
        await client.query('COMMIT');
      }

      return {
        success: true,
        grnNumber,
        grnId: grId,
        requiresQualityCheck
      };

    } catch (error: any) {
      if (!useProvidedClient) {
        await client.query('ROLLBACK');
        client.release();
      }
      console.error('[GoodsReceipt] Error:', error);
      throw error;
    }
  }

  /**
   * Create goods receipt from production order
   */
  async createGoodsReceiptFromProduction(
    productionOrderId: number,
    producedQuantity: number,
    warehouseTypeId: number,
    confirmedBy: string = 'Production Staff'
  ): Promise<{ success: boolean; grnNumber?: string; grnId?: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Get production order details
      const poQuery = `
        SELECT 
          order_number,
          material_code,
          plant_id,
          quantity as planned_quantity
        FROM production_orders 
        WHERE id = $1 AND status IN ('IN_PROGRESS', 'COMPLETED')
      `;

      const poResult = await this.pool.query(poQuery, [productionOrderId]);

      if (poResult.rows.length === 0) {
        return { success: false };
      }

      const poData = poResult.rows[0];
      const grnNumber = `GRN-PROD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Create goods receipt for finished product
      const grnQuery = `
        INSERT INTO goods_receipts (
          grn_number,
          material_code,
          plant_id,
          warehouse_type_id,
          quantity,
          unit_price,
          total_value,
          receipt_date,
          receipt_type,
          reference_document,
          received_by,
          status
        ) VALUES ($1, $2, $3, $4, $5, 0, 0, CURRENT_DATE, 'PRODUCTION', $6, $7, 'COMPLETED')
        RETURNING id
      `;

      const grnResult = await this.pool.query(grnQuery, [
        grnNumber,
        poData.material_code,
        poData.plant_id,
        warehouseTypeId,
        producedQuantity,
        poData.order_number,
        confirmedBy
      ]);

      const grnId = grnResult.rows[0].id;

      // Get plant code
      const plantCodeResult = await client.query('SELECT code FROM plants WHERE id = $1', [poData.plant_id]);
      const plantCode = plantCodeResult.rows[0]?.code;

      if (plantCode) {
        // Get storage location code from warehouse_type (no hardcoded default)
        let storageLocation: string | null = null;
        try {
          const warehouseResult = await client.query(`
            SELECT sl.code 
            FROM warehouse_types wt
            LEFT JOIN storage_locations sl ON sl.plant_id = wt.plant_id
            WHERE wt.id = $1
            ORDER BY sl.id
            LIMIT 1
          `, [warehouseTypeId]);
          if (warehouseResult.rows.length > 0 && warehouseResult.rows[0].code) {
            storageLocation = warehouseResult.rows[0].code;
          }
        } catch (err) {
          console.error('Error getting storage location from warehouse_type:', err);
        }

        // If no storage location found, throw error instead of using hardcoded default
        if (!storageLocation) {
          throw new Error(
            `Storage location not found for warehouse_type_id ${warehouseTypeId}. Please configure storage locations for plant ${plantCode}.`
          );
        }

        // Get material ID
        const materialResult = await client.query(
          'SELECT id FROM materials WHERE code = $1',
          [poData.material_code]
        );
        const materialId = materialResult.rows.length > 0 ? materialResult.rows[0].id : null;

        // Update stock for finished goods (production receipt - no ordered_quantity reduction)
        // Only increase in_stock
        if (materialId) {
          await this.inventoryTrackingService.decreaseOrderedAndIncreaseStock(
            materialId,
            poData.material_code,
            poData.plant_id,
            plantCode,
            storageLocation,
            producedQuantity,
            0 // No unit price for production (cost is calculated separately)
          );
        }
      }

      // Mark Goods Receipt as posted
      await client.query(`
        UPDATE goods_receipts 
        SET posted = true, posted_date = NOW(), status = 'COMPLETED'
        WHERE id = $1
      `, [grnId]);

      // Consume raw materials from stock
      await this.consumeRawMaterialsFromProduction(productionOrderId, producedQuantity);

      await client.query('COMMIT');

      return {
        success: true,
        grnNumber,
        grnId
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating goods receipt from production:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process quality inspection results
   */
  async processQualityInspection(
    grnId: number,
    inspectionResults: QualityInspectionResult
  ): Promise<{ success: boolean; stockUpdated?: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update quality inspection record
      await client.query(`
        UPDATE quality_inspections 
        SET 
          inspection_status = 'COMPLETED',
          accepted_quantity = $1,
          rejected_quantity = $2,
          quality_grade = $3,
          inspection_results = $4,
          inspection_date = CURRENT_TIMESTAMP
        WHERE grn_id = $5
      `, [
        inspectionResults.acceptedQuantity,
        inspectionResults.rejectedQuantity,
        inspectionResults.qualityGrade,
        inspectionResults.inspectionResults,
        grnId
      ]);

      // Get GRN details with material and plant info
      const grnQuery = `
        SELECT 
          gr.material_code,
          gr.plant_id,
          gr.warehouse_type_id,
          gr.unit_price,
          gr.purchase_order_id,
          m.id as material_id,
          p.code as plant_code
        FROM goods_receipts gr
        LEFT JOIN materials m ON gr.material_code = m.code
        LEFT JOIN plants p ON gr.plant_id = p.id
        WHERE gr.id = $1
      `;

      const grnResult = await client.query(grnQuery, [grnId]);

      if (grnResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false };
      }

      const grn = grnResult.rows[0];

      // Validate warehouse_type_id exists
      if (!grn.warehouse_type_id) {
        await client.query('ROLLBACK');
        throw new Error(`Warehouse type not found for goods receipt ${grnId}.`);
      }

      // Update stock only with accepted quantity
      if (inspectionResults.acceptedQuantity > 0) {
        await this.postGoodsReceipt(
          client,
          grnId,
          grn.material_id,
          grn.material_code,
          grn.plant_id,
          grn.plant_code,
          grn.warehouse_type_id,
          inspectionResults.acceptedQuantity,
          grn.unit_price
        );
      }

      // Handle rejected quantity (could be moved to quarantine or return to vendor)
      if (inspectionResults.rejectedQuantity > 0) {
        await this.handleRejectedMaterial(grnId, grn.material_code, inspectionResults.rejectedQuantity);
      }

      // Update GRN status
      const finalStatus = inspectionResults.qualityGrade === 'REJECTED' ? 'REJECTED' : 'COMPLETED';
      await client.query('UPDATE goods_receipts SET status = $1 WHERE id = $2', [finalStatus, grnId]);

      await client.query('COMMIT');
      return { success: true, stockUpdated: inspectionResults.acceptedQuantity > 0 };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing quality inspection:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Post Goods Receipt - update stock, reduce ordered quantity, create journal entries
   * @param warehouseTypeId - Warehouse type ID from goods_receipts table
   */
  private async postGoodsReceipt(
    client: any,
    grnId: number,
    materialId: number,
    materialCode: string,
    plantId: number,
    plantCode: string,
    warehouseTypeId: number,
    quantity: number,
    unitPrice: number
  ): Promise<void> {
    try {
      let storageLocation: string | null = null;
      try {
        // Use savepoint so if this query fails, we can rollback just this part and continue
        await client.query('SAVEPOINT get_storage_location');
        try {
          const warehouseResult = await client.query(`
            SELECT sl.code 
            FROM warehouse_types wt
            LEFT JOIN storage_locations sl ON sl.plant_id = wt.plant_id
            WHERE wt.id = $1
            ORDER BY sl.id
            LIMIT 1
          `, [warehouseTypeId]);
          if (warehouseResult.rows.length > 0 && warehouseResult.rows[0].code) {
            storageLocation = warehouseResult.rows[0].code;
          } else {
            // No storage location found from warehouse_type - try to get from plant's storage locations
            const plantStorageResult = await client.query(
              `SELECT code FROM storage_locations WHERE plant_id = $1 AND status = 'active' ORDER BY id LIMIT 1`,
              [plantId]
            );

            if (plantStorageResult.rows.length > 0 && plantStorageResult.rows[0].code) {
              storageLocation = plantStorageResult.rows[0].code;
            } else {
              // Query from document_settings as fallback
              const settingsResult = await client.query(
                `SELECT setting_value FROM document_settings WHERE setting_key = 'default_storage_location'`
              );

              if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
                storageLocation = settingsResult.rows[0].setting_value;
              } else {
                throw new Error(
                  `Storage location not found for warehouse_type_id ${warehouseTypeId} and plant_id ${plantId}. ` +
                  `Please create a storage location for this plant or configure default_storage_location in document_settings.`
                );
              }
            }
          }
          await client.query('RELEASE SAVEPOINT get_storage_location');
        } catch (warehouseQueryError: any) {
          // Rollback to savepoint to allow transaction to continue
          try {
            await client.query('ROLLBACK TO SAVEPOINT get_storage_location');
          } catch (rollbackError) {
            // Savepoint may not exist if transaction already aborted
            console.warn('Could not rollback to savepoint:', rollbackError);
            // If rollback fails, we need to handle this differently
            throw new Error(`Transaction error: ${rollbackError}`);
          }
          console.error('Error getting storage location from warehouse_type:', warehouseQueryError.message);

          // Try to get from plant's storage locations
          try {
            const plantStorageResult = await client.query(
              `SELECT code FROM storage_locations WHERE plant_id = $1 AND status = 'active' ORDER BY id LIMIT 1`,
              [plantId]
            );
            if (plantStorageResult.rows.length > 0 && plantStorageResult.rows[0].code) {
              storageLocation = plantStorageResult.rows[0].code;
            }
          } catch (plantStorageError: any) {
            console.warn('Could not get storage location from plant:', plantStorageError.message);
          }

          // If still not found, try document_settings
          if (!storageLocation) {
            try {
              const settingsResult = await client.query(
                `SELECT setting_value FROM document_settings WHERE setting_key = 'default_storage_location'`
              );
              if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
                storageLocation = settingsResult.rows[0].setting_value;
              }
            } catch (settingsError: any) {
              console.warn('Could not get storage location from settings:', settingsError.message);
            }
          }

          // If still not found, throw error
          if (!storageLocation) {
            throw new Error(
              `Storage location could not be determined for warehouse_type_id ${warehouseTypeId} and plant_id ${plantId}. ` +
              `Please create a storage location for this plant or configure default_storage_location in document_settings. ` +
              `Original error: ${warehouseQueryError.message}`
            );
          }
        }
      } catch (savepointError) {
        // If savepoint creation fails, throw error
        throw new Error(`Error creating savepoint for storage location query: ${savepointError}`);
      }

      if (!storageLocation) {
        throw new Error('Storage location is required but could not be determined');
      }

      // Create Stock Movement Record (Fix for missing history)
      // Get/Generate GRN Number for reference
      let grnReference = `GR-${grnId}`;
      try {
        const docRes = await client.query('SELECT grn_number FROM goods_receipts WHERE id = $1', [grnId]);
        if (docRes.rows.length > 0 && docRes.rows[0].grn_number) {
          grnReference = docRes.rows[0].grn_number;
        }
      } catch (e) {
        console.warn('Could not fetch GRN number for reference, using ID');
      }

      const docNumber = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await client.query(`
        INSERT INTO stock_movements (
          document_number,
          posting_date,
          material_code,
          plant_code,
          storage_location,
          movement_type,
          quantity,
          unit,
          unit_price,
          total_value,
          reference_document,
          created_at,
          created_by,
          posted_to_gl
        ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, 'EA', $7, $8, $9, NOW(), 'System', false)
      `, [
        docNumber,
        materialCode,
        plantCode,
        storageLocation,
        '101', // Goods Receipt movement type
        quantity,
        unitPrice,
        (quantity * unitPrice),
        grnReference
      ]);

      // Update inventory: decrease ordered_quantity, increase in_stock
      try {
        await this.inventoryTrackingService.decreaseOrderedAndIncreaseStock(
          materialId,
          materialCode,
          plantId,
          plantCode,
          storageLocation,
          quantity,
          unitPrice,
          'EA',
          client
        );
      } catch (inventoryError: any) {
        console.error('Error updating inventory in postGoodsReceipt:', inventoryError);
        console.error('Inventory error details:', {
          materialId,
          materialCode,
          plantId,
          plantCode,
          storageLocation,
          quantity,
          unitPrice,
          errorMessage: inventoryError.message,
          errorCode: inventoryError.code
        });
        // Re-throw to abort transaction - inventory update is critical
        throw new Error(`Failed to update inventory: ${inventoryError.message}`);
      }

      // Check if perpetual inventory is enabled (with error handling to avoid transaction abort)
      // Query perpetual inventory setting from database - no defaults
      let perpetualInventoryEnabled = false;
      try {
        await client.query('SAVEPOINT check_perpetual_inventory');
        try {
          const settingsResult = await client.query(`
            SELECT setting_value 
            FROM document_settings 
            WHERE setting_key = 'perpetual_inventory_enabled'
          `);
          if (settingsResult.rows.length > 0 && settingsResult.rows[0]?.setting_value) {
            perpetualInventoryEnabled = settingsResult.rows[0].setting_value === 'true' || settingsResult.rows[0].setting_value === true;
          }
          await client.query('RELEASE SAVEPOINT check_perpetual_inventory');
        } catch (settingsError: any) {
          await client.query('ROLLBACK TO SAVEPOINT check_perpetual_inventory');
          console.warn('Could not check perpetual inventory setting from document_settings:', settingsError.message);
          // If setting not found, skip inventory updates (treat as disabled)
          perpetualInventoryEnabled = false;
        }
      } catch (savepointError) {
        console.warn('Error with savepoint for perpetual inventory check:', savepointError);
        // If savepoint fails, skip inventory updates
        perpetualInventoryEnabled = false;
      }

      // Create financial posting using finance cost service (mandatory)
      if (perpetualInventoryEnabled) {
        // Import and create finance service
        const { InventoryFinanceCostService } = await import('./inventory-finance-cost-service');
        const financeService = new InventoryFinanceCostService(this.pool);

        // Use savepoint to prevent transaction abort if finance service calls fail
        await client.query('SAVEPOINT before_finance_calculations');

        let centers, landedCostData, overheadData, varianceData;
        try {

          // Get cost center and profit center
          centers = await financeService.getCostAndProfitCenters(
            materialCode,
            plantCode
          );

          // Calculate landed cost if provided in goods receipt
          const grData = await client.query(
            `SELECT freight_cost, duty_cost, handling_cost, insurance_cost, total_landed_cost
             FROM goods_receipts WHERE id = $1`,
            [grnId]
          );

          const gr = grData.rows[0] || {};
          landedCostData = await financeService.calculateLandedCost(
            unitPrice,
            quantity,
            parseFloat(gr.freight_cost || '0'),
            parseFloat(gr.duty_cost || '0'),
            parseFloat(gr.handling_cost || '0'),
            parseFloat(gr.insurance_cost || '0')
          );

          // Calculate overhead if cost center exists
          overheadData = { overheadAmount: 0, overheadRate: 0, calculationMethod: 'PERCENTAGE' };
          if (centers.costCenterId) {
            overheadData = await financeService.calculateOverheadAllocation(
              landedCostData.totalLandedCost,
              centers.costCenterId
            );
          }

          // Calculate variance
          varianceData = await financeService.calculateVariance(
            materialCode,
            landedCostData.unitLandedCost,
            quantity
          );

          await client.query('RELEASE SAVEPOINT before_finance_calculations');
        } catch (financeCalcError: any) {
          // Rollback to savepoint and use defaults
          try {
            await client.query('ROLLBACK TO SAVEPOINT before_finance_calculations');
          } catch (rollbackError) {
            console.error('Could not rollback to savepoint:', rollbackError);
            throw new Error(`Transaction error: ${rollbackError}`);
          }
          console.warn('Finance calculations failed:', financeCalcError.message);
          // Query values from database - no defaults
          // Cost centers and profit centers
          try {
            const costCenterResult = await client.query(`
              SELECT id, code FROM cost_centers WHERE is_active = true LIMIT 1
            `);
            if (costCenterResult.rows.length > 0) {
              centers = {
                costCenterId: costCenterResult.rows[0].id,
                costCenterCode: costCenterResult.rows[0].code,
                profitCenterId: null,
                profitCenterCode: null
              };
            } else {
              centers = { costCenterId: null, costCenterCode: null, profitCenterId: null, profitCenterCode: null };
            }
          } catch (ccError) {
            centers = { costCenterId: null, costCenterCode: null, profitCenterId: null, profitCenterCode: null };
          }

          // Landed cost - query from purchase order items
          try {
            // First get the purchase order ID from goods receipt
            const grResult = await client.query(`
              SELECT purchase_order_id FROM goods_receipts WHERE id = $1
            `, [grnId]);
            const purchaseOrderId = grResult.rows[0]?.purchase_order_id;

            if (purchaseOrderId) {
              const landedCostResult = await client.query(`
                SELECT freight_cost, duty_cost, handling_cost, insurance_cost 
                FROM purchase_order_items 
                WHERE purchase_order_id = $1 AND material_id = $2
                LIMIT 1
              `, [purchaseOrderId, materialId]);
              if (landedCostResult.rows.length > 0) {
                const row = landedCostResult.rows[0];
                const totalLanded = (row.freight_cost || 0) + (row.duty_cost || 0) + (row.handling_cost || 0) + (row.insurance_cost || 0);
                landedCostData = {
                  unitLandedCost: unitPrice + (totalLanded / quantity),
                  totalLandedCost: (unitPrice * quantity) + totalLanded,
                  breakdown: {
                    freightCost: row.freight_cost || 0,
                    dutyCost: row.duty_cost || 0,
                    handlingCost: row.handling_cost || 0,
                    insuranceCost: row.insurance_cost || 0
                  }
                };
              } else {
                // Query from material master if available
                const materialCostResult = await client.query(`
                SELECT standard_cost FROM materials WHERE code = $1
              `, [materialCode]);
                const standardCost = materialCostResult.rows[0]?.standard_cost || unitPrice;
                landedCostData = {
                  unitLandedCost: standardCost,
                  totalLandedCost: standardCost * quantity,
                  breakdown: { freightCost: 0, dutyCost: 0, handlingCost: 0, insuranceCost: 0 }
                };
              }
            } else {
              // No purchase order ID found - query from material master
              const materialCostResult = await client.query(`
                SELECT standard_cost FROM materials WHERE code = $1
              `, [materialCode]);
              const standardCost = materialCostResult.rows[0]?.standard_cost || unitPrice;
              landedCostData = {
                unitLandedCost: standardCost,
                totalLandedCost: standardCost * quantity,
                breakdown: { freightCost: 0, dutyCost: 0, handlingCost: 0, insuranceCost: 0 }
              };
            }
          } catch (lcError) {
            // If all queries fail, use unit price from parameters (not a default, it's from the function parameter)
            landedCostData = {
              unitLandedCost: unitPrice,
              totalLandedCost: unitPrice * quantity,
              breakdown: { freightCost: 0, dutyCost: 0, handlingCost: 0, insuranceCost: 0 }
            };
          }

          // Overhead - query from document_settings
          try {
            const overheadResult = await client.query(`
              SELECT setting_value FROM document_settings WHERE setting_key = 'overhead_rate'
            `);
            const overheadRate = overheadResult.rows[0]?.setting_value ? parseFloat(overheadResult.rows[0].setting_value) : 0;
            overheadData = {
              overheadAmount: (landedCostData.totalLandedCost * overheadRate) / 100,
              overheadRate: overheadRate,
              calculationMethod: 'PERCENTAGE'
            };
          } catch (ohError) {
            overheadData = { overheadAmount: 0, overheadRate: 0, calculationMethod: 'PERCENTAGE' };
          }

          // Variance - use standard cost from material master
          try {
            const varianceResult = await client.query(`
              SELECT standard_cost FROM materials WHERE code = $1
            `, [materialCode]);
            const standardCost = varianceResult.rows[0]?.standard_cost || unitPrice;
            const actualCost = landedCostData.unitLandedCost;
            varianceData = {
              standardCost: standardCost,
              actualCost: actualCost,
              varianceAmount: (actualCost - standardCost) * quantity,
              varianceType: actualCost > standardCost ? 'UNFAVORABLE' : actualCost < standardCost ? 'FAVORABLE' : 'NONE'
            };
          } catch (varError) {
            varianceData = {
              standardCost: unitPrice,
              actualCost: unitPrice,
              varianceAmount: 0,
              varianceType: 'NONE'
            };
          }
        }

        // Generate document number for stock movement
        const currentYear = new Date().getFullYear();
        let docCountResult;
        try {
          docCountResult = await client.query(
            `SELECT COUNT(*) as count FROM stock_movements 
             WHERE document_number LIKE $1`,
            [`MAT-${currentYear}-%`]
          );
        } catch (docCountError: any) {
          // If query fails, use 0 as default
          console.warn('Could not count stock movements, using default:', docCountError.message);
          docCountResult = { rows: [{ count: '0' }] };
        }
        const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
        const documentNumber = `MAT-${currentYear}-${docCount.toString().padStart(6, '0')}`;

        // Get movement type code for goods receipt from movement_types table
        // Use savepoint to prevent transaction abort
        await client.query('SAVEPOINT get_movement_type');
        let goodsReceiptCode: string | null = null;
        try {
          const goodsReceiptCodeResult = await client.query(`
            SELECT COALESCE(movement_type_code, movement_code) as code
            FROM movement_types
            WHERE transaction_type = $1::VARCHAR
              AND inventory_direction = $2::VARCHAR
              AND is_active = true
            LIMIT 1
          `, ['goods_receipt', 'increase']);
          if (goodsReceiptCodeResult.rows && goodsReceiptCodeResult.rows.length > 0 && goodsReceiptCodeResult.rows[0].code) {
            goodsReceiptCode = String(goodsReceiptCodeResult.rows[0].code);
          }
          await client.query('RELEASE SAVEPOINT get_movement_type');
        } catch (movementTypeError: any) {
          // Rollback to savepoint and try alternative
          try {
            await client.query('ROLLBACK TO SAVEPOINT get_movement_type');
          } catch (rollbackError) {
            console.error('Could not rollback to savepoint:', rollbackError);
            throw new Error(`Transaction error: ${rollbackError}`);
          }
          console.warn('Could not fetch movement type code from database:', movementTypeError.message);

          // Try alternative transaction types
          try {
            await client.query('SAVEPOINT get_movement_type_alt');
            const altResult = await client.query(`
              SELECT COALESCE(movement_type_code, movement_code) as code
              FROM movement_types
              WHERE (transaction_type ILIKE '%receipt%' OR transaction_type ILIKE '%purchase%')
                AND inventory_direction = 'increase'
                AND is_active = true
              LIMIT 1
            `);
            if (altResult.rows.length > 0 && altResult.rows[0].code) {
              goodsReceiptCode = String(altResult.rows[0].code);
            }
            await client.query('RELEASE SAVEPOINT get_movement_type_alt');
          } catch (altError: any) {
            try {
              await client.query('ROLLBACK TO SAVEPOINT get_movement_type_alt');
            } catch (rollbackError2) {
              // Ignore rollback error
            }
            console.warn('Could not fetch movement type code with alternative query:', altError.message);
          }
        }

        // If still not found, use default code '101' (standard goods receipt)
        if (!goodsReceiptCode) {
          console.warn('Movement type code not found, using default code 101 for goods receipt');
          goodsReceiptCode = '101';
        }

        // Create stock movement record first
        const stockMovementResult = await client.query(
          `INSERT INTO stock_movements (
            document_number, posting_date, material_code, plant_code,
            storage_location, movement_type, quantity, unit,
            unit_price, total_value, reference_document, notes,
            cost_center_id, profit_center_id,
            freight_cost, duty_cost, handling_cost, insurance_cost, total_landed_cost,
            overhead_amount, overhead_rate,
            standard_cost, actual_cost, variance_amount, variance_type,
            financial_posting_status
          )
          VALUES (
            $1::VARCHAR, CURRENT_DATE, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $23::VARCHAR, $5::NUMERIC,
            (SELECT base_uom FROM materials WHERE code = $2::VARCHAR LIMIT 1),
            $6::NUMERIC, $7::NUMERIC, $8::VARCHAR, $9::TEXT, $10, $11,
            $12::NUMERIC, $13::NUMERIC, $14::NUMERIC, $15::NUMERIC, $16::NUMERIC,
            $17::NUMERIC, $18::NUMERIC,
            $19::NUMERIC, $20::NUMERIC, $21::NUMERIC, $22::VARCHAR, 'PENDING'
          )
          RETURNING id`,
          [
            String(documentNumber),
            String(materialCode),
            String(plantCode),
            String(storageLocation),
            quantity,
            landedCostData.unitLandedCost,
            landedCostData.totalLandedCost,
            `GRN-${grnId}`,
            `Goods receipt ${grnId}`,
            centers.costCenterId || null,
            centers.profitCenterId || null,
            landedCostData.breakdown.freightCost,
            landedCostData.breakdown.dutyCost,
            landedCostData.breakdown.handlingCost,
            landedCostData.breakdown.insuranceCost,
            landedCostData.totalLandedCost,
            overheadData.overheadAmount,
            overheadData.overheadRate,
            varianceData.standardCost,
            varianceData.actualCost,
            varianceData.varianceAmount,
            varianceData.varianceType,
            String(goodsReceiptCode),
          ]
        );

        const stockMovementId = stockMovementResult.rows[0].id;

        // Create financial posting (optional - goods receipt can complete without it)
        // Use savepoint to prevent transaction abort if financial posting fails
        let postingResult: { success: boolean; glDocumentNumber?: string; error?: string } | null = null;
        let financialPostingSuccess = false;

        try {
          await client.query('SAVEPOINT before_financial_posting');

          postingResult = await financeService.createFinancialPosting(
            client,
            {
              materialCode,
              movementType: goodsReceiptCode,
              quantity,
              unitPrice: landedCostData.unitLandedCost,
              totalValue: landedCostData.totalLandedCost,
              costCenterId: centers.costCenterId || undefined,
              profitCenterId: centers.profitCenterId || undefined,
              landedCost: landedCostData.totalLandedCost,
              overheadAmount: overheadData.overheadAmount,
              referenceDocument: `GRN-${grnId}`,
            }
          );

          if (postingResult.success) {
            financialPostingSuccess = true;
            await client.query('RELEASE SAVEPOINT before_financial_posting');

            // Update stock movement with financial posting data
            await financeService.updateStockMovementWithFinanceData(
              client,
              stockMovementId,
              {
                glDocumentNumber: postingResult.glDocumentNumber,
                financialPostingStatus: 'POSTED',
              }
            );

            // Update goods receipt with financial posting status
            await client.query(
              `UPDATE goods_receipts 
               SET financial_posting_status = 'POSTED',
                   gl_document_number = $1,
                   cost_center_id = $2,
                   profit_center_id = $3,
                   total_landed_cost = $4
               WHERE id = $5`,
              [
                postingResult.glDocumentNumber,
                centers.costCenterId,
                centers.profitCenterId,
                landedCostData.totalLandedCost,
                grnId
              ]
            );
          } else {
            // Financial posting failed but don't abort transaction
            await client.query('ROLLBACK TO SAVEPOINT before_financial_posting');
            console.warn(`[GoodsReceipt] Financial posting failed for GRN ${grnId}: ${postingResult.error}`);
            console.warn('[GoodsReceipt] Goods receipt will complete without financial posting. Please configure account_determination_rules.');

            // Update stock movement to indicate financial posting failed
            await client.query(
              `UPDATE stock_movements 
               SET financial_posting_status = 'FAILED',
                   notes = COALESCE(notes, '') || ' Financial posting failed: ' || $1
               WHERE id = $2`,
              [postingResult.error || 'Account determination failed', stockMovementId]
            );

            // Update goods receipt to indicate financial posting failed
            await client.query(
              `UPDATE goods_receipts 
               SET financial_posting_status = 'FAILED',
                   cost_center_id = $1,
                   profit_center_id = $2,
                   total_landed_cost = $3
               WHERE id = $4`,
              [
                centers.costCenterId,
                centers.profitCenterId,
                landedCostData.totalLandedCost,
                grnId
              ]
            );
          }
        } catch (postingError: any) {
          // Rollback to savepoint to prevent transaction abort
          try {
            await client.query('ROLLBACK TO SAVEPOINT before_financial_posting');
          } catch (rollbackError) {
            // If rollback fails, transaction may already be aborted - check transaction state
            const transactionCheck = await client.query('SELECT 1');
            if (transactionCheck.rows.length === 0) {
              // Transaction is aborted, we need to handle this
              throw new Error(`Transaction aborted: ${rollbackError}`);
            }
          }

          console.warn(`[GoodsReceipt] Financial posting error for GRN ${grnId}: ${postingError.message}`);
          console.warn('[GoodsReceipt] Goods receipt will complete without financial posting. Please configure account_determination_rules.');

          // Update stock movement to indicate financial posting failed
          try {
            await client.query(
              `UPDATE stock_movements 
               SET financial_posting_status = 'FAILED',
                   notes = COALESCE(notes, '') || ' Financial posting error: ' || $1
               WHERE id = $2`,
              [postingError.message || 'Unknown error', stockMovementId]
            );
          } catch (updateError) {
            console.warn('[GoodsReceipt] Could not update stock movement with financial posting error:', updateError);
          }

          // Update goods receipt to indicate financial posting failed
          try {
            await client.query(
              `UPDATE goods_receipts 
               SET financial_posting_status = 'FAILED',
                   cost_center_id = $1,
                   profit_center_id = $2,
                   total_landed_cost = $3
               WHERE id = $4`,
              [
                centers.costCenterId,
                centers.profitCenterId,
                landedCostData.totalLandedCost,
                grnId
              ]
            );
          } catch (updateError) {
            console.warn('[GoodsReceipt] Could not update goods receipt with financial posting error:', updateError);
          }

          // Don't throw - allow goods receipt to complete without financial posting
        }
      }

      // Mark Goods Receipt as posted
      await client.query(`
        UPDATE goods_receipts 
        SET posted = true, posted_date = NOW(), status = 'COMPLETED'
        WHERE id = $1
      `, [grnId]);

      // Note: Stock movement is already created above via finance service integration
      // This old code block is removed as it used incorrect column names
      // The proper stock movement creation happens in the finance service integration section above

    } catch (error) {
      console.error('Error posting Goods Receipt:', error);
      console.error('Error details:', {
        grnId,
        materialId,
        materialCode,
        plantId,
        plantCode,
        warehouseTypeId,
        quantity
      });
      throw error;
    }
  }

  /**
   * Post Goods Receipt with direct storage location (SAP standard - item level)
   * This method accepts storage location directly instead of warehouse_type_id
   */
  private async postGoodsReceiptWithStorageLocation(
    client: any,
    grnId: number,
    materialId: number,
    materialCode: string,
    plantId: number,
    plantCode: string,
    storageLocationCode: string,
    quantity: number,
    unitPrice: number
  ): Promise<void> {
    try {
      console.log(`📦 Posting goods receipt: ${materialCode} qty ${quantity} to plant ${plantCode}, storage ${storageLocationCode}`);

      // Create Stock Movement Record (Fix for missing history)
      // Get/Generate GRN Number for reference
      let grnReference = `GR-${grnId}`;
      try {
        const docRes = await client.query('SELECT grn_number FROM goods_receipts WHERE id = $1', [grnId]);
        if (docRes.rows.length > 0 && docRes.rows[0].grn_number) {
          grnReference = docRes.rows[0].grn_number;
        }
      } catch (e) {
        console.warn('Could not fetch GRN number for reference, using ID');
      }

      const docNumber = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await client.query(`
        INSERT INTO stock_movements (
          document_number,
          posting_date,
          material_code,
          plant_code,
          storage_location,
          movement_type,
          quantity,
          unit,
          unit_price,
          total_value,
          reference_document,
          created_at,
          created_by,
          posted_to_gl
        ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, 'EA', $7, $8, $9, NOW(), 'System', false)
      `, [
        docNumber,
        materialCode,
        plantCode,
        storageLocationCode,
        '101', // Goods Receipt movement type
        quantity,
        unitPrice,
        (quantity * unitPrice),
        grnReference
      ]);

      // Update inventory: decrease ordered_quantity, increase in_stock
      await this.inventoryTrackingService.decreaseOrderedAndIncreaseStock(
        materialId,
        materialCode,
        plantId,
        plantCode,
        storageLocationCode,
        quantity,
        unitPrice,
        'EA',
        client
      );

      console.log(`✅ Posted goods receipt: ${materialCode} successfully`);

    } catch (error: any) {
      console.error(`❌ Error posting goods receipt for ${materialCode}:`, error.message);
      throw error;
    }
  }


  /**
   * Create journal entry for Goods Receipt (perpetual inventory)
   * Debit Inventory, Credit Receiving/Invoicing Clearing Account
   */
  private async createGoodsReceiptJournalEntry(
    client: any,
    materialCode: string,
    quantity: number,
    unitPrice: number,
    grnId: number
  ): Promise<void> {
    try {
      // Get GL accounts for inventory and Receiving/Invoicing Clearing Account
      // Get GL accounts from account determination rules
      // Note: materials table doesn't have gl_account column
      // Use InventoryFinanceCostService.determineAccounts() for proper account determination
      // This method is deprecated - use InventoryFinanceCostService instead
      // Keeping for backward compatibility only

      // Look up movement type code for goods receipt from movement_types table
      let goodsReceiptCode: string | null = null;
      try {
        const goodsReceiptCodeResult = await client.query(`
          SELECT COALESCE(movement_type_code, movement_code) as code
          FROM movement_types
          WHERE transaction_type = $1::VARCHAR
            AND inventory_direction = $2::VARCHAR
            AND is_active = true
          LIMIT 1
        `, ['goods_receipt', 'increase']);
        if (goodsReceiptCodeResult.rows && goodsReceiptCodeResult.rows.length > 0 && goodsReceiptCodeResult.rows[0].code) {
          goodsReceiptCode = String(goodsReceiptCodeResult.rows[0].code);
        }
      } catch (movementTypeError: any) {
        console.error('Could not fetch movement type code from database:', movementTypeError.message);
      }

      // If not found, try alternative transaction types
      if (!goodsReceiptCode) {
        try {
          const altResult = await client.query(`
            SELECT COALESCE(movement_type_code, movement_code) as code
            FROM movement_types
            WHERE (transaction_type ILIKE '%receipt%' OR transaction_type ILIKE '%purchase%')
              AND inventory_direction = 'increase'
              AND is_active = true
            LIMIT 1
          `);
          if (altResult.rows.length > 0 && altResult.rows[0].code) {
            goodsReceiptCode = String(altResult.rows[0].code);
          }
        } catch (altError) {
          console.error('Could not fetch movement type code with alternative query:', altError.message);
        }
      }

      // If still not found, throw error
      if (!goodsReceiptCode) {
        throw new Error(
          `Movement type code not found for goods receipt. Please create a movement type with transaction_type='goods_receipt' and inventory_direction='increase' in movement_types table.`
        );
      }

      // Get inventory account from account determination rules
      const inventoryAccountResult = await client.query(`
        SELECT debit_account
        FROM account_determination_rules
        WHERE movement_type = $1::VARCHAR
          AND is_active = true
        LIMIT 1
      `, [goodsReceiptCode]);

      const inventoryAccount = inventoryAccountResult.rows[0]?.debit_account;
      if (!inventoryAccount) {
        throw new Error(
          `Inventory account not found for material ${materialCode}. Please configure account_determination_rules for movement type ${goodsReceiptCode}.`
        );
      }

      // Get clearing account from account determination rules
      const clearingAccountResult = await client.query(`
        SELECT credit_account
        FROM account_determination_rules
        WHERE movement_type = $1::VARCHAR
          AND is_active = true
        LIMIT 1
      `, [goodsReceiptCode]);

      if (clearingAccountResult.rows.length === 0) {
        throw new Error(
          `Clearing account not found for movement type ${goodsReceiptCode}. Please configure account_determination_rules.`
        );
      }

      const clearingAccount = clearingAccountResult.rows[0].credit_account;

      const totalAmount = quantity * unitPrice;

      // Get currency from material master or company code
      const currencyResult = await client.query(`
        SELECT m.currency, m.company_code_id, cc.currency as company_currency
        FROM materials m
        LEFT JOIN company_codes cc ON m.company_code_id = cc.id
        WHERE m.code = $1
        LIMIT 1
      `, [materialCode]);

      let currency: string | null = null;
      if (currencyResult.rows.length > 0) {
        currency = currencyResult.rows[0].currency || currencyResult.rows[0].company_currency || null;
      }

      if (!currency) {
        // Get default currency from company codes
        const defaultCurrencyResult = await client.query(`
          SELECT currency FROM company_codes WHERE is_default = true LIMIT 1
        `);
        if (defaultCurrencyResult.rows.length > 0) {
          currency = defaultCurrencyResult.rows[0].currency;
        }
      }

      if (!currency) {
        throw new Error(
          `Currency not found for material ${materialCode}. Please set currency in material master or company code.`
        );
      }

      // Create accounting document (if accounting_documents table exists)
      const accountingDocResult = await client.query(`
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
        ) VALUES ($1, 'GRN', CURRENT_DATE, CURRENT_DATE, $2, $3, $4, 'POSTED', NOW())
        RETURNING id
      `, [`GRN-${grnId}`, `GRN-${grnId}`, currency, totalAmount]);

      const accountingDocId = accountingDocResult.rows[0]?.id;

      // Create journal entry lines
      // Debit Inventory
      await client.query(`
        INSERT INTO journal_entries (
          accounting_document_id,
          gl_account,
          debit_amount,
          credit_amount,
          description,
          created_at
        ) VALUES ($1, $2, $3, 0, $4, NOW())
      `, [accountingDocId, inventoryAccount, totalAmount, `Goods Receipt - ${materialCode}`]);

      // Credit Receiving/Invoicing Clearing Account
      await client.query(`
        INSERT INTO journal_entries (
          accounting_document_id,
          gl_account,
          debit_amount,
          credit_amount,
          description,
          created_at
        ) VALUES ($1, $2, 0, $3, $4, NOW())
      `, [accountingDocId, clearingAccount, totalAmount, `Goods Receipt - ${materialCode}`]);

    } catch (error) {
      // If accounting tables don't exist, just log and continue
      console.warn('Could not create Goods Receipt journal entry (accounting tables may not exist):', error);
      // Don't throw - allow Goods Receipt to complete even if journal entry fails
    }
  }

  /**
   * Update purchase order receipt status and close PO if fully received
   */
  private async updatePOReceiptStatus(
    client: any,
    purchaseOrderId: number,
    materialId: number,
    materialCode: string,
    receivedQuantity: number
  ): Promise<void> {
    try {
      // Query status values from document_settings
      const statusSettingsResult = await client.query(`
        SELECT setting_key, setting_value 
        FROM document_settings 
        WHERE setting_key IN ('po_item_status_open', 'po_item_status_closed', 'po_status_open', 'po_status_closed', 'po_status_partially_received', 'po_status_received')
      `);

      const statusMap: Record<string, string> = {};
      statusSettingsResult.rows.forEach((row: any) => {
        statusMap[row.setting_key] = row.setting_value;
      });

      // Get status values - use defaults if not configured
      const poItemStatusOpen = statusMap['po_item_status_open'] || 'OPEN';
      const poItemStatusClosed = statusMap['po_item_status_closed'] || 'CLOSED';
      const poStatusOpen = statusMap['po_status_open'] || 'OPEN';
      const poStatusClosed = statusMap['po_status_closed'] || 'CLOSED';
      const poStatusPartiallyReceived = statusMap['po_status_partially_received'] || 'PARTIALLY_RECEIVED';
      // Use RECEIVED status when fully received but not yet paid (defaults to RECEIVED if not configured)
      const poStatusReceived = statusMap['po_status_received'] || 'RECEIVED';

      // Update PO item with received quantity
      await client.query(`
        UPDATE purchase_order_items 
        SET 
          received_quantity = COALESCE(received_quantity, 0) + $1,
          status = CASE 
            WHEN COALESCE(received_quantity, 0) + $1 >= quantity THEN $5
            ELSE $6
          END,
          updated_at = NOW()
        WHERE purchase_order_id = $2 
          AND (material_id = $3 OR material_id IN (SELECT id FROM materials WHERE code = $4))
      `, [receivedQuantity, purchaseOrderId, materialId, materialCode, poItemStatusClosed, poItemStatusOpen]);

      // Check if PO is fully received
      const completionQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN COALESCE(received_quantity, 0) >= quantity THEN 1 END) as completed_items,
          COUNT(CASE WHEN status = $1 THEN 1 END) as closed_items
        FROM purchase_order_items 
        WHERE purchase_order_id = $2 AND active = true
      `;

      const completionResult = await client.query(completionQuery, [poItemStatusClosed, purchaseOrderId]);
      const { total_items, completed_items, closed_items } = completionResult.rows[0];

      // If all items received, update PO status to RECEIVED (not CLOSED - CLOSED means fully received AND paid)
      // RECEIVED means fully received but payment is still pending
      if (parseInt(total_items) > 0 && parseInt(completed_items) === parseInt(total_items)) {
        await client.query(
          'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $3',
          [poStatusReceived, purchaseOrderId, poStatusClosed]
        );
      } else if (parseInt(completed_items) > 0) {
        // Partially received
        await client.query(
          'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3',
          [poStatusPartiallyReceived, purchaseOrderId, poStatusOpen]
        );
      }
    } catch (error) {
      console.error('Error updating PO receipt status:', error);
      throw error;
    }
  }

  /**
   * Create quality inspection record
   */
  private async createQualityInspection(
    grnId: number,
    materialCode: string,
    quantity: number
  ): Promise<void> {
    try {
      const inspectionNumber = `QI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await this.pool.query(`
        INSERT INTO quality_inspections (
          inspection_number,
          grn_id,
          material_code,
          inspection_quantity,
          inspection_status,
          created_date
        ) VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_DATE)
      `, [inspectionNumber, grnId, materialCode, quantity]);
    } catch (error) {
      console.error('Error creating quality inspection:', error);
      throw error;
    }
  }

  /**
   * Consume raw materials from production
   */
  private async consumeRawMaterialsFromProduction(
    productionOrderId: number,
    producedQuantity: number
  ): Promise<void> {
    try {
      // Get BOM components for the production order
      const bomQuery = `
        SELECT 
          bi.component_material,
          bi.quantity_per,
          po.plant_id
        FROM production_orders po
        JOIN bom_header bh ON po.material_code = bh.material_code
        JOIN bom_items bi ON bh.id = bi.bom_header_id
        WHERE po.id = $1
      `;

      const bomResult = await this.pool.query(bomQuery, [productionOrderId]);

      for (const component of bomResult.rows) {
        const consumedQuantity = component.quantity_per * producedQuantity;

        // Update stock (reduce)
        await this.pool.query(`
          UPDATE stock_availability_check 
          SET 
            current_stock = current_stock - $1,
            last_updated = CURRENT_TIMESTAMP
          WHERE material_code = $2 AND plant_id = $3
        `, [consumedQuantity, component.component_material, component.plant_id]);

        // Create consumption movement
        // Get plant code from plant_id
        const plantCodeResult = await this.pool.query(
          `SELECT code FROM plants WHERE id = $1 LIMIT 1`,
          [component.plant_id]
        );
        const plantCode = plantCodeResult.rows[0]?.code;
        if (!plantCode) {
          throw new Error(`Plant code not found for plant_id: ${component.plant_id}`);
        }

        // Get storage location from material-plant assignment or plant defaults
        let storageLocation: string | null = null;

        // Try to get from material-plant assignment
        const materialPlantResult = await this.pool.query(
          `SELECT storage_location_id FROM material_plants WHERE material_id = $1 AND plant_id = $2`,
          [component.material_id, component.plant_id]
        );

        if (materialPlantResult.rows.length > 0 && materialPlantResult.rows[0].storage_location_id) {
          const storageLocationResult = await this.pool.query(
            `SELECT code FROM storage_locations WHERE id = $1`,
            [materialPlantResult.rows[0].storage_location_id]
          );
          if (storageLocationResult.rows.length > 0) {
            storageLocation = storageLocationResult.rows[0].code;
          }
        }

        // If not found, try plant default
        if (!storageLocation) {
          const plantStorageResult = await this.pool.query(
            `SELECT default_storage_location FROM plants WHERE id = $1`,
            [component.plant_id]
          );
          if (plantStorageResult.rows.length > 0 && plantStorageResult.rows[0].default_storage_location) {
            storageLocation = plantStorageResult.rows[0].default_storage_location;
          }
        }

        // If still not found, query from document_settings
        if (!storageLocation) {
          const settingsResult = await this.pool.query(
            `SELECT setting_value FROM document_settings WHERE setting_key = 'default_storage_location'`
          );
          if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
            storageLocation = settingsResult.rows[0].setting_value;
          }
        }

        // If still not found, throw error
        if (!storageLocation) {
          throw new Error(
            `Storage location not found for material_id ${component.material_id} and plant_id ${component.plant_id}. ` +
            `Please set storage_location_id in material_plants table, default_storage_location in plants table, or configure default_storage_location in document_settings.`
          );
        }

        // Generate document number
        const currentYear = new Date().getFullYear();
        const docCountResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM stock_movements 
           WHERE document_number LIKE $1`,
          [`MAT-${currentYear}-%`]
        );
        const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
        const documentNumber = `MAT-${currentYear}-${docCount.toString().padStart(6, '0')}`;

        await this.pool.query(`
          INSERT INTO stock_movements (
            document_number,
            posting_date,
            material_code,
            plant_code,
            storage_location,
            movement_type,
            quantity,
            unit,
            reference_document,
            notes,
            created_by
          ) VALUES ($1::VARCHAR, CURRENT_DATE, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, '261', $5::NUMERIC, 
            (SELECT base_uom FROM materials WHERE code = $2::VARCHAR LIMIT 1),
            $6::VARCHAR, $7::TEXT, 'PRODUCTION_SYSTEM')
        `, [
          String(documentNumber),
          String(component.component_material),
          String(plantCode),
          String(storageLocation),
          -Math.abs(consumedQuantity), // Negative for consumption
          `PO-${productionOrderId}`,
          `Production consumption for order ${productionOrderId}`
        ]);
      }
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      throw error;
    }
  }

  /**
   * Handle rejected material (quarantine or return)
   */
  private async handleRejectedMaterial(
    grnId: number,
    materialCode: string,
    rejectedQuantity: number
  ): Promise<void> {
    try {
      // Move to quarantine location (assuming location 999 is quarantine)
      await this.pool.query(`
        INSERT INTO quarantine_stock (
          grn_id,
          material_code,
          quantity,
          quarantine_date,
          reason
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Quality inspection failure')
      `, [grnId, materialCode, rejectedQuantity]);
    } catch (error) {
      console.error('Error handling rejected material:', error);
      throw error;
    }
  }

  /**
   * Get goods receipt dashboard
   */
  async getGoodsReceiptDashboard(plantId?: number): Promise<any> {
    try {
      const baseWhereClause = plantId ? 'WHERE plant_id = $1' : '';
      const params = plantId ? [plantId] : [];

      // GRN statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_grns,
          COUNT(CASE WHEN status = 'QUALITY_CHECK' THEN 1 END) as pending_quality,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_grns,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_grns,
          SUM(CASE WHEN status = 'COMPLETED' THEN total_value END) as completed_value
        FROM goods_receipts 
        ${baseWhereClause}
      `;

      const statsResult = await this.pool.query(statsQuery, params);

      // Recent GRNs
      const recentQuery = `
        SELECT 
          grn_number,
          material_code,
          quantity,
          receipt_type,
          status,
          receipt_date
        FROM goods_receipts 
        ${baseWhereClause}
        ORDER BY receipt_date DESC
        LIMIT 10
      `;

      const recentResult = await this.pool.query(recentQuery, params);

      // Pending quality inspections
      const qualityQuery = `
        SELECT 
          qi.inspection_number,
          qi.material_code,
          qi.inspection_quantity,
          gr.grn_number
        FROM quality_inspections qi
        JOIN goods_receipts gr ON qi.grn_id = gr.id
        WHERE qi.inspection_status = 'PENDING'
        ${plantId ? 'AND gr.plant_id = $1' : ''}
        ORDER BY qi.created_date ASC
        LIMIT 5
      `;

      const qualityResult = await this.pool.query(qualityQuery, params);

      const stats = statsResult.rows[0] || {};

      return {
        totalGRNs: parseInt(stats.total_grns || '0'),
        pendingQuality: parseInt(stats.pending_quality || '0'),
        completedGRNs: parseInt(stats.completed_grns || '0'),
        rejectedGRNs: parseInt(stats.rejected_grns || '0'),
        completedValue: parseFloat(stats.completed_value || '0'),
        recentGRNs: recentResult.rows,
        pendingQualityInspections: qualityResult.rows
      };
    } catch (error) {
      console.error('Error fetching goods receipt dashboard:', error);
      throw error;
    }
  }
}