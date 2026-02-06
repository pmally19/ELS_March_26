import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// SAP Document Posting API
router.get('/document-posting/:companyCode?', async (req, res) => {
  try {
    const companyCode = req.params.companyCode || '1000';
    
    const documents = [
      {
        id: 'FI-001',
        documentNumber: '1900000001',
        documentType: 'SA - General Ledger',
        companyCode,
        postingDate: '2025-07-07',
        documentDate: '2025-07-07',
        reference: 'INV-2025-001',
        headerText: 'Customer Invoice Posting',
        totalAmount: 125000.00,
        currency: 'USD',
        status: 'Posted',
        createdBy: 'JOHN.SMITH',
        fiscalYear: '2025',
        period: '007'
      },
      {
        id: 'FI-002',
        documentNumber: '1900000002',
        documentType: 'KR - Vendor Invoice',
        companyCode,
        postingDate: '2025-07-07',
        documentDate: '2025-07-06',
        reference: 'VND-INV-7890',
        headerText: 'Vendor Invoice - Equipment Purchase',
        totalAmount: 85000.00,
        currency: 'USD',
        status: 'Posted',
        createdBy: 'JANE.DOE',
        fiscalYear: '2025',
        period: '007'
      }
    ];

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Document posting error:', error);
    res.status(500).json({ message: 'Failed to fetch document posting data' });
  }
});

// SAP GL Postings API
router.get('/gl-postings/:companyCode?/:period?', async (req, res) => {
  try {
    const companyCode = req.params.companyCode || '1000';
    const period = req.params.period || '007';
    
    const postings = [
      {
        id: 'GL-001',
        documentNumber: '1900000001',
        companyCode,
        fiscalYear: '2025',
        period,
        postingDate: '2025-07-07',
        documentDate: '2025-07-07',
        glAccount: '130000',
        glAccountText: 'Trade Receivables',
        debitAmount: 125000.00,
        creditAmount: 0,
        documentCurrency: 'USD',
        localCurrency: 'USD',
        reference: 'INV-2025-001',
        documentType: 'DR',
        costCenter: 'CC-SALES',
        profitCenter: 'PC-EAST',
        segment: 'MANUFACTURING',
        assignment: 'CUST-10001',
        text: 'Customer Invoice - Product Sales',
        userName: 'JOHN.SMITH',
        postingKey: '40'
      },
      {
        id: 'GL-002',
        documentNumber: '1900000001',
        companyCode,
        fiscalYear: '2025',
        period,
        postingDate: '2025-07-07',
        documentDate: '2025-07-07',
        glAccount: '400000',
        glAccountText: 'Product Revenue',
        debitAmount: 0,
        creditAmount: 125000.00,
        documentCurrency: 'USD',
        localCurrency: 'USD',
        reference: 'INV-2025-001',
        documentType: 'DR',
        costCenter: 'CC-SALES',
        profitCenter: 'PC-EAST',
        segment: 'MANUFACTURING',
        assignment: 'CUST-10001',
        text: 'Revenue Recognition - Product Sales',
        userName: 'JOHN.SMITH',
        postingKey: '50'
      }
    ];

    res.json({ success: true, data: postings });
  } catch (error) {
    console.error('GL postings error:', error);
    res.status(500).json({ message: 'Failed to fetch GL postings data' });
  }
});

// SAP Accounts Receivable API
router.get('/ar/:companyCode?', async (req, res) => {
  try {
    const companyCode = req.params.companyCode || '1000';
    
    const arData = [
      {
        id: 'AR-001',
        customerNumber: '10001',
        customerName: 'TechFlow Solutions Inc.',
        documentNumber: '1900000001',
        documentType: 'RV',
        postingDate: '2025-07-07',
        dueDate: '2025-08-06',
        amount: 125000.00,
        currency: 'USD',
        paymentTerms: 'NET30',
        aging: 0,
        status: 'Open',
        reference: 'INV-2025-001'
      },
      {
        id: 'AR-002',
        customerNumber: '10002',
        customerName: 'GreenEarth Manufacturing',
        documentNumber: '1900000015',
        documentType: 'RV',
        postingDate: '2025-06-15',
        dueDate: '2025-07-15',
        amount: 85000.00,
        currency: 'USD',
        paymentTerms: 'NET30',
        aging: 23,
        status: 'Overdue',
        reference: 'INV-2025-015'
      }
    ];

    res.json({ success: true, data: arData });
  } catch (error) {
    console.error('AR data error:', error);
    res.status(500).json({ message: 'Failed to fetch AR data' });
  }
});

// SAP Accounts Payable API
router.get('/ap/:companyCode?', async (req, res) => {
  try {
    const companyCode = req.params.companyCode || '1000';
    
    const apData = [
      {
        id: 'AP-001',
        vendorNumber: '20001',
        vendorName: 'Industrial Equipment Corp',
        documentNumber: '1900000002',
        documentType: 'KR',
        postingDate: '2025-07-06',
        dueDate: '2025-08-05',
        amount: 85000.00,
        currency: 'USD',
        paymentTerms: 'NET30',
        aging: 1,
        status: 'Open',
        reference: 'VND-INV-7890'
      },
      {
        id: 'AP-002',
        vendorNumber: '20002',
        vendorName: 'Raw Materials Supplier Ltd',
        documentNumber: '1900000025',
        documentType: 'KR',
        postingDate: '2025-06-20',
        dueDate: '2025-07-20',
        amount: 42500.00,
        currency: 'USD',
        paymentTerms: 'NET30',
        aging: 18,
        status: 'Open',
        reference: 'VND-INV-3456'
      }
    ];

    res.json({ success: true, data: apData });
  } catch (error) {
    console.error('AP data error:', error);
    res.status(500).json({ message: 'Failed to fetch AP data' });
  }
});

export default router;