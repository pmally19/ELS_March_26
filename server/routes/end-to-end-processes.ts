import { Router } from 'express';
import { endToEndProcessService } from '../services/EndToEndProcessService';

const router = Router();

// Execute complete sales-to-cash process
router.post('/sales-to-cash/:salesOrderId', async (req, res) => {
  try {
    const salesOrderId = parseInt(req.params.salesOrderId);
    const result = await endToEndProcessService.processSalesToCash(salesOrderId);
    res.json(result);
  } catch (error) {
    console.error('Sales-to-cash process error:', error);
    res.status(500).json({ error: 'Failed to process sales-to-cash cycle' });
  }
});

// Execute complete procure-to-pay process
router.post('/procure-to-pay/:purchaseOrderId', async (req, res) => {
  try {
    const purchaseOrderId = parseInt(req.params.purchaseOrderId);
    const result = await endToEndProcessService.processProcureToPay(purchaseOrderId);
    res.json(result);
  } catch (error) {
    console.error('Procure-to-pay process error:', error);
    res.status(500).json({ error: 'Failed to process procure-to-pay cycle' });
  }
});

// Execute period end closing
router.post('/period-end-closing', async (req, res) => {
  try {
    const { companyCodeId, period, year } = req.body;
    const result = await endToEndProcessService.processPeriodEndClosing(companyCodeId, period, year);
    res.json(result);
  } catch (error) {
    console.error('Period end closing error:', error);
    res.status(500).json({ error: 'Failed to close period' });
  }
});

// Validate three-way matching
router.get('/three-way-matching/:purchaseOrderId', async (req, res) => {
  try {
    const purchaseOrderId = parseInt(req.params.purchaseOrderId);
    const result = await endToEndProcessService.validateThreeWayMatching(purchaseOrderId);
    res.json(result);
  } catch (error) {
    console.error('Three-way matching validation error:', error);
    res.status(500).json({ error: 'Failed to validate three-way matching' });
  }
});

export default router;