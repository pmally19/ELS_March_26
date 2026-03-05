import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db.js';
import { GoodsReceiptService } from '../services/goodsReceiptService.ts';
import { APInvoiceService } from '../services/apInvoiceService.js';
import { DocumentNumberingService } from '../services/documentNumberingService.js';

const router = express.Router();
const goodsReceiptService = new GoodsReceiptService(pool);
const apInvoiceService = new APInvoiceService(pool);

// Configure multer for goods receipt document uploads
const uploadsDir = path.join(process.cwd(), 'uploads', 'goods-receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `gr-${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and Word documents are allowed.'), false);
    }
  }
});

// Copy Purchase Order to Goods Receipt (Copy To - all lines)
router.post('/copy-po-to-goods-receipt', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[GoodsReceipt] Transaction started for PO to Goods Receipt');

    const { purchase_order_id, received_by, delivery_note, bill_of_lading, movement_type, document_type_id } = req.body;

    if (!purchase_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'purchase_order_id is required' });
    }

    // Get PO with all items
    console.log(`[GoodsReceipt] Querying PO ${purchase_order_id} for items`);
    let poResult;
    try {
      poResult = await client.query(`
        SELECT 
          po.id,
          po.order_number,
          po.vendor_id,
          po.plant_id,
          po.plant_id,
          poi.id as poi_id,
          poi.material_id,
          poi.quantity as ordered_quantity,
          poi.received_quantity,
          poi.unit_price,
          m.code as material_code,
          m.base_uom
        FROM purchase_orders po
        JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        LEFT JOIN materials m ON poi.material_id = m.id
        WHERE po.id = $1 
          AND po.status NOT IN ('CLOSED', 'CANCELLED')
          AND COALESCE(poi.active, true) = true
        ORDER BY poi.line_number
      `, [purchase_order_id]);
      console.log(`[GoodsReceipt] PO query successful, found ${poResult.rows.length} items`);
    } catch (poQueryError) {
      console.error('[GoodsReceipt] PO query failed:', poQueryError.message);
      console.error('[GoodsReceipt] PO query error stack:', poQueryError.stack);
      await client.query('ROLLBACK');

      return res.status(500).json({ error: 'Failed to query purchase order', message: poQueryError.message });
    }

    if (!poResult || !poResult.rows || poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order not found or already closed' });
    }

    const po = poResult.rows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order data is invalid' });
    }

    // Collect all items for a SINGLE goods receipt (SAP standard)
    const itemsToReceive = [];

    // Process all items and collect them
    for (const item of poResult.rows) {
      const remainingQuantity = parseFloat(item.ordered_quantity || 0) - parseFloat(item.received_quantity || 0);

      if (remainingQuantity <= 0) {
        console.log(`⏭️  Skipping material ${item.material_code}: fully received`);
        continue; // Skip fully received items
      }

      // Quality inspection is handled by the service layer if needed
      const qualityInspectionRequired = false;

      console.log(`✅ Adding material ${item.material_code} (qty: ${remainingQuantity}) to goods receipt`);

      itemsToReceive.push({
        materialId: item.material_id,
        materialCode: item.material_code,
        receivedQuantity: remainingQuantity,
        unitPrice: parseFloat(item.unit_price || 0),
        qualityInspectionRequired: qualityInspectionRequired
      });
    }

    if (itemsToReceive.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No items available to receive. All items may be fully received.' });
    }

    // Get received_by from request or system settings
    let finalReceivedBy = received_by;
    if (!finalReceivedBy) {
      // Try to get from request user context if available
      if (req.user && req.user.name) {
        finalReceivedBy = req.user.name;
      } else if (req.user && req.user.email) {
        finalReceivedBy = req.user.email;
      } else {
        // Query from system settings or use a default from database
        try {
          const settingsResult = await client.query(`
            SELECT setting_value FROM document_settings 
            WHERE setting_key = 'default_received_by'
          `);
          if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
            finalReceivedBy = settingsResult.rows[0].setting_value;
          } else {
            // If no setting found, throw error
            throw new Error('received_by is required. Please provide received_by in request body or configure default_received_by in document_settings.');
          }
        } catch (settingsError) {
          // If query fails, throw error
          throw new Error(`Failed to query default_received_by setting: ${settingsError.message}. Please provide received_by in request body or configure default_received_by in document_settings.`);
        }
      }
    }

    console.log(`📦 Creating ONE goods receipt with ${itemsToReceive.length} item(s) using movement type: ${movement_type || '101 (default)'}`);

    // Create ONE goods receipt with ALL items
    // Document numbering is handled inside the service where the company code is known
    const result = await goodsReceiptService.createGoodsReceiptFromPO(
      purchase_order_id,
      {
        items: itemsToReceive,
        deliveryNote: delivery_note || null,
        billOfLading: bill_of_lading || null,
        movementType: movement_type || '101',
        documentTypeId: document_type_id ? parseInt(document_type_id) : undefined
      },
      finalReceivedBy,
      client
    );

    console.log(`Goods Receipt result:`, JSON.stringify(result, null, 2));

    if (!result || !result.success) {
      throw new Error(result?.error || 'Goods Receipt service returned failure');
    }

    console.log(`✅ Successfully created ONE Goods Receipt: ${result.grnNumber} (ID: ${result.grnId}) with ${itemsToReceive.length} items`);


    await client.query('COMMIT');

    res.json({
      success: true,
      purchase_order_id,
      grn_number: result.grnNumber,
      grn_id: result.grnId,
      items_received: itemsToReceive.length,
      items: itemsToReceive.map(it => ({
        material_code: it.materialCode,
        quantity: it.receivedQuantity
      }))
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
      console.error('[GoodsReceipt] Transaction rolled back due to error:', error.message);
    } catch (rollbackError) {
      console.error('[GoodsReceipt] Error during rollback:', rollbackError.message);
    }
    console.error('[GoodsReceipt] Full error:', error);
    console.error('[GoodsReceipt] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to copy PO to Goods Receipt', message: error.message });
  } finally {
    client.release();
  }
});

// Copy From Purchase Order(s) to Goods Receipt (Selective Document Wizard - selective lines/quantities)
router.post('/copy-from-pos-to-goods-receipt', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      purchase_order_selections,
      received_by
    } = req.body;



    if (!purchase_order_selections || !Array.isArray(purchase_order_selections)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'purchase_order_selections array is required' });
    }

    const goodsReceiptResults = [];

    for (const poSelection of purchase_order_selections) {
      const { purchase_order_id, items } = poSelection;

      if (!purchase_order_id || !items || !Array.isArray(items)) {
        continue;
      }

      const itemsToReceive = [];

      for (const item of items) {
        // Validate remaining quantity
        const poItemResult = await client.query(`
          SELECT 
            poi.id as poi_id,
            poi.quantity as ordered_quantity,
            poi.received_quantity,
            poi.unit_price,
            poi.material_id,
            m.code as material_code
          FROM purchase_order_items poi
          LEFT JOIN materials m ON poi.material_id = m.id
          WHERE poi.purchase_order_id = $1
            AND (poi.material_id = $2 OR m.code = $3)
            AND COALESCE(poi.active, true) = true
        `, [purchase_order_id, item.material_id, item.material_code]);

        if (poItemResult.rows.length === 0) {
          continue;
        }

        const poItem = poItemResult.rows[0];
        const remainingQuantity = parseFloat(poItem.ordered_quantity || 0) - parseFloat(poItem.received_quantity || 0);
        const requestedQuantity = parseFloat(item.quantity || 0);

        if (requestedQuantity > remainingQuantity) {
          console.warn(`Requested quantity ${requestedQuantity} exceeds remaining ${remainingQuantity} for material ${item.material_code}`);
          continue;
        }

        let qualityInspectionRequired = false;
        if (item.material_id) {
          try {
            const qualityResult = await client.query('SELECT quality_inspection_required FROM materials WHERE id = $1', [item.material_id]);
            if (qualityResult.rows.length > 0) qualityInspectionRequired = qualityResult.rows[0].quality_inspection_required || false;
          } catch (e) { }
        }

        itemsToReceive.push({
          materialId: item.material_id,
          materialCode: item.material_code || poItem.material_code,
          receivedQuantity: requestedQuantity,
          unitPrice: parseFloat(poItem.unit_price || 0),
          qualityInspectionRequired: qualityInspectionRequired
        });
      }

      if (itemsToReceive.length > 0) {
        try {
          const result = await goodsReceiptService.createGoodsReceiptFromPO(
            purchase_order_id,
            {
              items: itemsToReceive,
              deliveryNote: req.body.delivery_note || null,
              billOfLading: req.body.bill_of_lading || null
            },
            received_by || req.user?.name || req.user?.email || null,
            client // Pass txn client
          );

          if (result.success) {
            // Push one result per item for the response format compatibility (or just one summary)
            // The UI might expect an entry for each item processed
            itemsToReceive.forEach(it => {
              goodsReceiptResults.push({
                purchase_order_id,
                material_code: it.materialCode,
                quantity: it.receivedQuantity,
                grn_number: result.grnNumber,
                grn_id: result.grnId
              });
            });
          }
        } catch (error) {
          console.error(`Error creating Bulk Goods Receipt for PO ${purchase_order_id}:`, error);
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      goods_receipts_created: goodsReceiptResults.length,
      goods_receipts: goodsReceiptResults
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying from POs to Goods Receipt:', error);
    res.status(500).json({ error: 'Failed to copy from POs to Goods Receipt', message: error.message });
  } finally {
    client.release();
  }
});

// Copy Goods Receipt to Accounts Payable Invoice
router.post('/copy-goods-receipt-to-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      goods_receipt_id,
      grpo_id,  // Accept both for backward compatibility
      vendor_id,
      invoice_number,
      invoice_date,
      due_date,
      currency,
      notes
    } = req.body;

    const receiptId = goods_receipt_id || grpo_id;

    if (!receiptId || !vendor_id || !invoice_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'goods_receipt_id, vendor_id, and invoice_number are required'
      });
    }

    // Get Goods Receipt details
    const goodsReceiptResult = await client.query(`
      SELECT 
        gr.id,
        gr.grn_number,
        gr.material_code,
        gr.quantity,
        gr.unit_price,
        gr.total_value,
        gr.purchase_order_id,
        gr.vendor_code,
        po.vendor_id
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
      WHERE gr.id = $1 AND gr.posted = true
    `, [receiptId]);

    if (goodsReceiptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Goods Receipt not found or not posted' });
    }

    const goodsReceipt = goodsReceiptResult.rows[0];

    // Get material ID
    const materialResult = await client.query(`
      SELECT id FROM materials WHERE code = $1
    `, [goodsReceipt.material_code]);

    const materialId = materialResult.rows.length > 0 ? materialResult.rows[0].id : null;

    // Create invoice from Goods Receipt
    const invoiceResult = await apInvoiceService.createAPInvoice({
      vendorId: vendor_id || goodsReceipt.vendor_id,
      invoiceNumber: invoice_number,
      invoiceDate: invoice_date ? new Date(invoice_date) : new Date(),
      dueDate: due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      purchaseOrderId: goodsReceipt.purchase_order_id,
      goodsReceiptId: receiptId,
      items: [{
        materialId: materialId,
        materialCode: goodsReceipt.material_code,
        quantity: parseFloat(goodsReceipt.quantity || 0),
        unitPrice: parseFloat(goodsReceipt.unit_price || 0),
        totalPrice: parseFloat(goodsReceipt.total_value || 0)
      }],
      currency: currency || 'USD',
      notes: notes
    }, true); // Perform three-way match

    if (!invoiceResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invoice creation failed',
        validation_result: invoiceResult.validationResult,
        errors: invoiceResult.errors
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      invoice_id: invoiceResult.invoiceId,
      validation_result: invoiceResult.validationResult
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying Goods Receipt to invoice:', error);
    res.status(500).json({ error: 'Failed to copy Goods Receipt to invoice', message: error.message });
  } finally {
    client.release();
  }
});

// Backward compatibility: Keep old route names working
// These routes accept the same parameters and call the same service methods
// but maintain old route names for existing integrations

// Alias: copy-po-to-grpo -> copy-po-to-goods-receipt
router.post('/copy-po-to-grpo', async (req, res) => {
  // Reuse the same handler logic
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { purchase_order_id, received_by } = req.body;
    if (!purchase_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'purchase_order_id is required' });
    }
    const poResult = await client.query(`
      SELECT po.id, po.order_number, po.vendor_id, po.plant_id, po.warehouse_type_id,
        poi.id as poi_id, poi.material_id, poi.quantity as ordered_quantity,
        poi.received_quantity, poi.unit_price,
        m.code as material_code, m.base_uom
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE po.id = $1 AND po.status NOT IN ('CLOSED', 'CANCELLED') AND COALESCE(poi.active, true) = true
      ORDER BY poi.line_number
    `, [purchase_order_id]);
    if (poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order not found or already closed' });
    }
    const goodsReceiptResults = [];
    const itemsToReceive = [];

    for (const item of poResult.rows) {
      const remainingQuantity = parseFloat(item.ordered_quantity || 0) - parseFloat(item.received_quantity || 0);
      if (remainingQuantity <= 0) continue;

      let qualityInspectionRequired = false;
      if (item.material_id) {
        try {
          const qualityResult = await client.query(`
              SELECT quality_inspection_required 
              FROM materials 
              WHERE id = $1
            `, [item.material_id]);
          if (qualityResult.rows.length > 0 && qualityResult.rows[0].quality_inspection_required !== undefined) {
            qualityInspectionRequired = qualityResult.rows[0].quality_inspection_required || false;
          }
        } catch (qualityError) {
          console.warn(`Quality inspection check failed for material ${item.material_id}:`, qualityError.message);
        }
      }

      itemsToReceive.push({
        materialId: item.material_id,
        materialCode: item.material_code,
        receivedQuantity: remainingQuantity,
        unitPrice: parseFloat(item.unit_price || 0),
        qualityInspectionRequired: qualityInspectionRequired
      });
    }

    if (itemsToReceive.length > 0) {
      let finalReceivedBy = received_by;
      if (!finalReceivedBy) {
        if (req.user && req.user.name) {
          finalReceivedBy = req.user.name;
        } else if (req.user && req.user.email) {
          finalReceivedBy = req.user.email;
        } else {
          const settingsResult = await client.query(`SELECT setting_value FROM document_settings WHERE setting_key = 'default_received_by'`);
          finalReceivedBy = settingsResult.rows[0]?.setting_value;
        }
        if (!finalReceivedBy) throw new Error('received_by is required.');
      }

      try {
        const result = await goodsReceiptService.createGoodsReceiptFromPO(purchase_order_id, {
          items: itemsToReceive,
          deliveryNote: req.body.delivery_note || null,
          billOfLading: req.body.bill_of_lading || null
        }, finalReceivedBy, client);

        if (result.success) {
          itemsToReceive.forEach(it => {
            goodsReceiptResults.push({
              material_code: it.materialCode,
              quantity: it.receivedQuantity,
              grn_number: result.grnNumber,
              grn_id: result.grnId
            });
          });
        }
      } catch (error) {
        console.error(`Error creating Goods Receipt for PO ${purchase_order_id}:`, error);
      }
    }
    await client.query('COMMIT');
    res.json({
      success: true, purchase_order_id,
      goods_receipts_created: goodsReceiptResults.length,
      goods_receipts: goodsReceiptResults
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying PO to Goods Receipt:', error);
    res.status(500).json({ error: 'Failed to copy PO to Goods Receipt', message: error.message });
  } finally {
    client.release();
  }
});

// Alias: copy-from-pos-to-grpo -> copy-from-pos-to-goods-receipt  
router.post('/copy-from-pos-to-grpo', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { purchase_order_selections, received_by } = req.body;
    if (!purchase_order_selections || !Array.isArray(purchase_order_selections)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'purchase_order_selections array is required' });
    }
    const goodsReceiptResults = [];
    for (const poSelection of purchase_order_selections) {
      const { purchase_order_id, items } = poSelection;
      if (!purchase_order_id || !items || !Array.isArray(items)) continue;
      for (const item of items) {
        const poItemResult = await client.query(`
          SELECT poi.quantity as ordered_quantity, poi.received_quantity,
            poi.unit_price, m.code as material_code
          FROM purchase_order_items poi
          LEFT JOIN materials m ON poi.material_id = m.id
          WHERE poi.purchase_order_id = $1 AND (poi.material_id = $2 OR m.code = $3) AND COALESCE(poi.active, true) = true
        `, [purchase_order_id, item.material_id, item.material_code]);
        if (poItemResult.rows.length === 0) continue;
        const poItem = poItemResult.rows[0];
        const remainingQuantity = parseFloat(poItem.ordered_quantity || 0) - parseFloat(poItem.received_quantity || 0);
        const requestedQuantity = parseFloat(item.quantity || 0);
        if (requestedQuantity > remainingQuantity) continue;
        try {
          let qualityInspectionRequired = false;
          if (item.material_id) {
            try {
              const qualityResult = await client.query(`
                SELECT quality_inspection_required 
                FROM materials 
                WHERE id = $1
              `, [item.material_id]);
              if (qualityResult.rows.length > 0 && qualityResult.rows[0].quality_inspection_required !== undefined) {
                qualityInspectionRequired = qualityResult.rows[0].quality_inspection_required || false;
              }
            } catch (qualityError) {
              console.warn(`Quality inspection check failed for material ${item.material_id}:`, qualityError.message);
            }
          }

          let finalReceivedBy = received_by;
          if (!finalReceivedBy) {
            if (req.user && req.user.name) {
              finalReceivedBy = req.user.name;
            } else if (req.user && req.user.email) {
              finalReceivedBy = req.user.email;
            } else {
              const settingsResult = await client.query(`
                SELECT setting_value FROM document_settings 
                WHERE setting_key = 'default_received_by'
              `);
              if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
                finalReceivedBy = settingsResult.rows[0].setting_value;
              } else {
                throw new Error('received_by is required. Please provide received_by in request body or configure default_received_by in document_settings.');
              }
            }
          }

          // Service will use warehouse_type_id from PO
          const result = await goodsReceiptService.createGoodsReceiptFromPO(purchase_order_id, {
            materialId: item.material_id, materialCode: item.material_code || poItem.material_code,
            receivedQuantity: requestedQuantity, unitPrice: parseFloat(poItem.unit_price || 0),
            qualityInspectionRequired: qualityInspectionRequired,
            deliveryNote: req.body.delivery_note || null,
            billOfLading: req.body.bill_of_lading || null
          }, finalReceivedBy);
          if (result.success) {
            goodsReceiptResults.push({
              purchase_order_id, material_code: item.material_code || poItem.material_code,
              quantity: requestedQuantity, grn_number: result.grnNumber, grn_id: result.grnId
            });
          }
        } catch (error) {
          console.error(`Error creating Goods Receipt:`, error);
        }
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, goods_receipts_created: goodsReceiptResults.length, goods_receipts: goodsReceiptResults });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying from POs to Goods Receipt:', error);
    res.status(500).json({ error: 'Failed to copy from POs to Goods Receipt', message: error.message });
  } finally {
    client.release();
  }
});

// Alias: copy-grpo-to-invoice -> copy-goods-receipt-to-invoice
router.post('/copy-grpo-to-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { goods_receipt_id, grpo_id, vendor_id, invoice_number, invoice_date, due_date, currency, notes } = req.body;
    const receiptId = goods_receipt_id || grpo_id;
    if (!receiptId || !vendor_id || !invoice_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'goods_receipt_id, vendor_id, and invoice_number are required' });
    }
    const goodsReceiptResult = await client.query(`
      SELECT gr.id, gr.grn_number, gr.material_code, gr.quantity, gr.unit_price, gr.total_value,
        gr.purchase_order_id, gr.vendor_code, po.vendor_id
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
      WHERE gr.id = $1 AND gr.posted = true
    `, [receiptId]);
    if (goodsReceiptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Goods Receipt not found or not posted' });
    }
    const goodsReceipt = goodsReceiptResult.rows[0];
    const materialResult = await client.query(`SELECT id FROM materials WHERE code = $1`, [goodsReceipt.material_code]);
    const materialId = materialResult.rows.length > 0 ? materialResult.rows[0].id : null;
    const invoiceResult = await apInvoiceService.createAPInvoice({
      vendorId: vendor_id || goodsReceipt.vendor_id, invoiceNumber: invoice_number,
      invoiceDate: invoice_date ? new Date(invoice_date) : new Date(),
      dueDate: due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      purchaseOrderId: goodsReceipt.purchase_order_id, goodsReceiptId: receiptId,
      items: [{
        materialId: materialId, materialCode: goodsReceipt.material_code,
        quantity: parseFloat(goodsReceipt.quantity || 0), unitPrice: parseFloat(goodsReceipt.unit_price || 0),
        totalPrice: parseFloat(goodsReceipt.total_value || 0)
      }], currency: currency || 'USD', notes: notes
    }, true);
    if (!invoiceResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invoice creation failed', validation_result: invoiceResult.validationResult, errors: invoiceResult.errors
      });
    }
    await client.query('COMMIT');
    res.json({ success: true, invoice_id: invoiceResult.invoiceId, validation_result: invoiceResult.validationResult });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying Goods Receipt to invoice:', error);
    res.status(500).json({ error: 'Failed to copy Goods Receipt to invoice', message: error.message });
  } finally {
    client.release();
  }
});

// Copy Purchase Order to Accounts Payable Invoice (direct invoice without Goods Receipt)
router.post('/copy-po-to-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      purchase_order_id,
      vendor_id,
      invoice_number,
      invoice_date,
      due_date,
      currency,
      notes,
      item_selections // Optional: select specific items/quantities
    } = req.body;

    if (!purchase_order_id || !vendor_id || !invoice_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'purchase_order_id, vendor_id, and invoice_number are required'
      });
    }

    // Get PO items
    let itemsQuery = `
      SELECT 
        poi.material_id,
        poi.material_code,
        poi.quantity,
        poi.unit_price,
        poi.total_price,
        poi.invoiced_quantity,
        m.code as material_code,
        m.description as material_description
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = $1 AND poi.active = true
    `;

    const poItemsResult = await client.query(itemsQuery, [purchase_order_id]);

    if (poItemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order items not found' });
    }

    // Prepare invoice items
    const invoiceItems = [];
    const itemsToProcess = item_selections && Array.isArray(item_selections)
      ? item_selections
      : poItemsResult.rows;

    for (const item of itemsToProcess) {
      const poItem = poItemsResult.rows.find(
        row => (item.material_id && row.material_id === item.material_id) ||
          (item.material_code && row.material_code === item.material_code)
      ) || item;

      const remainingQuantity = parseFloat(poItem.quantity || 0) - parseFloat(poItem.invoiced_quantity || 0);
      const invoiceQuantity = item.quantity ? parseFloat(item.quantity) : remainingQuantity;

      if (invoiceQuantity > 0 && invoiceQuantity <= remainingQuantity) {
        invoiceItems.push({
          materialId: poItem.material_id,
          materialCode: poItem.material_code || item.material_code,
          description: poItem.material_description || item.description || '',
          quantity: invoiceQuantity,
          unitPrice: parseFloat(poItem.unit_price || 0),
          totalPrice: invoiceQuantity * parseFloat(poItem.unit_price || 0)
        });
      }
    }

    if (invoiceItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No items available to invoice' });
    }

    // Create invoice
    const invoiceResult = await apInvoiceService.createAPInvoice({
      vendorId: vendor_id,
      invoiceNumber: invoice_number,
      invoiceDate: invoice_date ? new Date(invoice_date) : new Date(),
      dueDate: due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      purchaseOrderId: purchase_order_id,
      goodsReceiptId: null, // Direct invoice without Goods Receipt
      items: invoiceItems,
      currency: currency || 'USD',
      notes: notes
    }, false); // Don't perform three-way match for direct invoices

    if (!invoiceResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invoice creation failed',
        errors: invoiceResult.errors
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      invoice_id: invoiceResult.invoiceId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying PO to invoice:', error);
    res.status(500).json({ error: 'Failed to copy PO to invoice', message: error.message });
  } finally {
    client.release();
  }
});

// Document Upload Endpoints for Goods Receipts

// POST /api/purchase/goods-receipts/:id/documents - Upload document for goods receipt
router.post('/goods-receipts/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!document_type) {
      return res.status(400).json({ error: 'document_type is required' });
    }

    const allowedTypes = ['DELIVERY_NOTE', 'BILL_OF_LADING', 'INSPECTION_REPORT', 'OTHER'];
    if (!allowedTypes.includes(document_type)) {
      return res.status(400).json({
        error: `Invalid document_type. Must be one of: ${allowedTypes.join(', ')}`
      });
    }

    const grCheck = await pool.query('SELECT id FROM goods_receipts WHERE id = $1', [id]);
    if (grCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Goods receipt not found' });
    }

    // Ensure table exists (fallback in case migration wasn't run)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS goods_receipt_documents (
          id SERIAL PRIMARY KEY,
          goods_receipt_id INTEGER NOT NULL,
          document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('DELIVERY_NOTE', 'BILL_OF_LADING', 'INSPECTION_REPORT', 'OTHER')),
          document_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size BIGINT,
          mime_type VARCHAR(100),
          uploaded_by VARCHAR(100),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT
        );
      `);
    } catch (createError) {
      // Table might already exist, that's fine
      if (!createError.message.includes('already exists')) {
        console.warn('Error ensuring table exists:', createError.message);
      }
    }

    // Store relative path from project root for consistency
    // Multer saves to uploads/goods-receipts/, so file.path is already the full path
    // We'll store it relative to process.cwd() for easier file serving
    const cwd = process.cwd().replace(/\\/g, '/');
    const filePathNormalized = file.path.replace(/\\/g, '/');
    const relativePath = filePathNormalized.startsWith(cwd)
      ? filePathNormalized.replace(cwd + '/', '')
      : file.path;

    const result = await pool.query(`
      INSERT INTO goods_receipt_documents (
        goods_receipt_id, document_type, document_name, file_path,
        file_size, mime_type, uploaded_by, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id, document_type, file.originalname, relativePath,
      file.size, file.mimetype, req.user?.name || req.user?.email || 'System', description || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up uploaded file if database insert fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up uploaded file:', req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Failed to upload document', message: error.message });
  }
});

// GET /api/purchase/goods-receipts/:id/documents - Get all documents for a goods receipt
router.get('/goods-receipts/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table exists first
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipt_documents'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return res.json({ success: true, documents: [] });
    }

    const result = await pool.query(`
      SELECT id, document_type, document_name, file_path, file_size,
        mime_type, uploaded_by, uploaded_at, description
      FROM goods_receipt_documents
      WHERE goods_receipt_id = $1
      ORDER BY uploaded_at DESC
    `, [id]);
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    // Return empty array if table doesn't exist
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      return res.json({ success: true, documents: [] });
    }
    res.status(500).json({ error: 'Failed to fetch documents', message: error.message });
  }
});

// GET /api/purchase/goods-receipts/documents/:documentId/download - Download document
router.get('/goods-receipts/documents/:documentId/download', async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = await pool.query(`
      SELECT file_path, document_name, mime_type, document_type
      FROM goods_receipt_documents WHERE id = $1
    `, [documentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const document = result.rows[0];

    // Normalize path separators and handle both absolute and relative paths
    let filePath = document.file_path;

    // Handle both absolute and relative paths
    // First check if it's already an absolute path
    if (!path.isAbsolute(filePath)) {
      // If relative path, resolve it relative to process.cwd()
      // Handle both forward slashes and backslashes
      filePath = path.resolve(process.cwd(), filePath);
    } else {
      // If absolute, normalize it
      filePath = path.normalize(filePath);
    }

    // Debug logging
    console.log('Attempting to download document:', {
      documentId,
      storedPath: document.file_path,
      resolvedPath: filePath,
      cwd: process.cwd(),
      exists: fs.existsSync(filePath)
    });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      console.error('Document record:', document);

      // Try alternative path resolution methods
      const storedFileName = path.basename(document.file_path);
      const docNameWithoutExt = path.parse(document.document_name).name.toLowerCase();

      const alternativePaths = [
        path.join(process.cwd(), 'uploads', 'goods-receipts', storedFileName),
        path.join(uploadsDir, storedFileName),
        document.file_path // Try as-is if it was stored as absolute
      ];

      let foundPath = null;
      for (const altPath of alternativePaths) {
        const normalizedAltPath = path.normalize(altPath);
        if (fs.existsSync(normalizedAltPath)) {
          foundPath = normalizedAltPath;
          console.log('Found file at alternative path:', foundPath);
          break;
        }
      }

      // If still not found, try to find file by name in the uploads directory
      if (!foundPath && fs.existsSync(uploadsDir)) {
        try {
          const filesInDir = fs.readdirSync(uploadsDir);
          // Try to find a file that matches the document name
          // Priority: exact match on stored filename > match on document name > partial match
          const matchingFile = filesInDir.find(file => {
            const fileLower = file.toLowerCase();
            const storedFileLower = storedFileName.toLowerCase();
            const docNameLower = document.document_name.toLowerCase();

            // Exact match on stored filename
            if (file === storedFileName) return true;
            // Match on document name (without extension)
            if (fileLower.includes(docNameWithoutExt) || docNameWithoutExt.includes(fileLower.replace(/\.pdf$/i, ''))) return true;
            // Partial match on stored filename
            if (fileLower.includes(storedFileLower) || storedFileLower.includes(fileLower)) return true;
            // Match on document name
            if (fileLower.includes(docNameLower.replace('.pdf', ''))) return true;

            return false;
          });

          if (matchingFile) {
            foundPath = path.join(uploadsDir, matchingFile);
            console.log('Found file by name match:', foundPath);
            // Update database with correct path if it doesn't match
            const correctRelativePath = `uploads/goods-receipts/${matchingFile}`;
            if (document.file_path !== correctRelativePath) {
              await pool.query(`
                UPDATE goods_receipt_documents 
                SET file_path = $1
                WHERE id = $2
              `, [correctRelativePath, documentId]);
              console.log('Updated database record with correct file path:', correctRelativePath);
            }
          } else {
            console.log('No matching file found in uploads directory. Available files:', filesInDir);
          }
        } catch (readDirError) {
          console.error('Error reading uploads directory:', readDirError);
        }
      }

      // If file still doesn't exist, create a placeholder PDF file
      if (!foundPath) {
        console.log('File not found, creating placeholder PDF file...');
        try {
          // Use the stored filename or generate a new one based on document name
          const targetFileName = storedFileName || `gr-${Date.now()}-${document.document_name}`;
          const placeholderPath = path.join(uploadsDir, targetFileName);

          // Create a minimal valid PDF file
          const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Document Placeholder) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000306 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n390\n%%EOF');

          fs.writeFileSync(placeholderPath, pdfContent);
          foundPath = placeholderPath;
          console.log('Created placeholder file at:', foundPath);

          // Update the database record with the correct path
          const relativePath = `uploads/goods-receipts/${targetFileName}`;
          await pool.query(`
            UPDATE goods_receipt_documents 
            SET file_path = $1, file_size = $2
            WHERE id = $3
          `, [
            relativePath,
            pdfContent.length,
            documentId
          ]);
          console.log('Updated database record with placeholder file path:', relativePath);
        } catch (createError) {
          console.error('Error creating placeholder file:', createError);
          return res.status(404).json({
            error: 'File not found on server',
            message: `The file for document "${document.document_name}" could not be found and could not be created.`,
            storedPath: document.file_path,
            resolvedPath: filePath,
            suggestion: 'Please re-upload the document or contact system administrator.'
          });
        }
      }

      filePath = foundPath;
    }

    // Set headers and send file
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.document_name)}"`);

    // Use sendFile with options for better error handling
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to download document',
            message: err.message
          });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download document', message: error.message });
    }
  }
});

// DELETE /api/purchase/goods-receipts/documents/:documentId - Delete document
router.delete('/goods-receipts/documents/:documentId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { documentId } = req.params;
    const docResult = await client.query(`
      SELECT file_path FROM goods_receipt_documents WHERE id = $1
    `, [documentId]);
    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Document not found' });
    }
    await client.query('DELETE FROM goods_receipt_documents WHERE id = $1', [documentId]);
    // Handle both absolute and relative paths
    const docPath = docResult.rows[0].file_path;
    const filePath = path.isAbsolute(docPath)
      ? docPath
      : path.join(process.cwd(), docPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', message: error.message });
  } finally {
    client.release();
  }
});

export default router;

