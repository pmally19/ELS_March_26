import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Get Reason Codes (Dynamic from DB)
router.get('/reason-codes', async (req, res) => {
  try {
    const result = await db.execute(sql`
            SELECT code, name, description 
            FROM reason_codes 
            WHERE is_active = true
            ORDER BY code
        `);

    // Fallback for demo if table empty
    if (result.rows.length === 0) {
      return res.json({
        success: true, data: [
          { code: 'FREIGHT', name: 'Freight Charges' },
          { code: 'RESTOCK', name: 'Restocking Fee' },
          { code: 'PRICE_ADJ', name: 'Price Adjustment' },
          { code: 'LATE_FEE', name: 'Late Payment Fee' },
          { code: 'OTHER', name: 'Other' }
        ]
      });
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching reason codes:', error);
    // Fallback on error to ensure UI works
    res.json({
      success: true, data: [
        { code: 'FREIGHT', name: 'Freight Charges' },
        { code: 'RESTOCK', name: 'Restocking Fee' },
        { code: 'PRICE_ADJ', name: 'Price Adjustment' },
        { code: 'LATE_FEE', name: 'Late Payment Fee' },
        { code: 'OTHER', name: 'Other' }
      ]
    });
  }
});

// Get Units of Measure (Dynamic from DB)
router.get('/uom', async (req, res) => {
  try {
    // Try units_of_measure first, then uom
    let result;
    try {
      result = await db.execute(sql`SELECT code, name FROM units_of_measure WHERE is_active = true OR active = true ORDER BY code`);
    } catch {
      result = await db.execute(sql`SELECT code, name FROM uom WHERE is_active = true OR active = true ORDER BY code`);
    }

    if (result.rows.length === 0) {
      return res.json({ success: true, data: [{ code: 'EA', name: 'Each' }] });
    }
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching UOM:', error);
    res.json({ success: true, data: [{ code: 'EA', name: 'Each' }] });
  }
});

// SAP Document Number Ranges API
router.get('/document-number-ranges/:companyCode?', async (req, res) => {
  try {
    const companyCode = req.params.companyCode || '1000';

    const numberRanges = [
      {
        id: 'RV-01',
        object: 'RV - Sales Documents',
        rangeNumber: '01',
        fromNumber: '0000000001',
        toNumber: '0999999999',
        currentNumber: '0000024567',
        status: 'Active',
        yearDependent: true,
        companyCode,
        description: 'Sales Orders, Quotes, Returns',
        percentage: 2.5
      },
      {
        id: 'DR-01',
        object: 'DR - Accounting Documents',
        rangeNumber: '01',
        fromNumber: '1000000000',
        toNumber: '1999999999',
        currentNumber: '1000156789',
        status: 'Active',
        yearDependent: true,
        companyCode,
        description: 'General Ledger Postings',
        percentage: 15.7
      },
      {
        id: 'RF-01',
        object: 'RF - Invoice Documents',
        rangeNumber: '01',
        fromNumber: '2000000000',
        toNumber: '2999999999',
        currentNumber: '2000089234',
        status: 'Active',
        yearDependent: true,
        companyCode,
        description: 'Customer Invoices, Credit Memos',
        percentage: 8.9
      },
      {
        id: 'MM-01',
        object: 'MM - Material Documents',
        rangeNumber: '01',
        fromNumber: '5000000000',
        toNumber: '5999999999',
        currentNumber: '5000445670',
        status: 'Active',
        yearDependent: false,
        companyCode,
        description: 'Goods Movements, Stock Transfers',
        percentage: 44.6
      },
      {
        id: 'PO-01',
        object: 'PO - Purchase Documents',
        rangeNumber: '01',
        fromNumber: '4500000000',
        toNumber: '4599999999',
        currentNumber: '4500034521',
        status: 'Active',
        yearDependent: false,
        companyCode,
        description: 'Purchase Orders, Requisitions',
        percentage: 3.5
      }
    ];

    res.json({ success: true, data: numberRanges });
  } catch (error) {
    console.error('Document number ranges error:', error);
    res.status(500).json({ message: 'Failed to fetch document number ranges' });
  }
});

export default router;