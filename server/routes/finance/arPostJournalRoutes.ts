import express from 'express';
import { arClearingService } from '../../services/arClearingService';
import { arReconciliationService } from '../../services/arReconciliationService';
import { agingAnalysisService } from '../../services/agingAnalysisService';
import { arOpenItemsService } from '../../services/arOpenItemsService';

const router = express.Router();

/**
 * AR Clearing Routes
 */

// Perform automatic clearing
router.post('/clearing/perform', async (req, res) => {
  try {
    const result = await arClearingService.performAutomaticClearing();
    res.json({
      success: true,
      cleared: result.cleared,
      errors: result.errors,
      message: `Cleared ${result.cleared} AR open items`
    });
  } catch (error: any) {
    console.error('Error performing automatic clearing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform automatic clearing'
    });
  }
});

// Manually clear a specific AR open item
router.post('/clearing/clear/:openItemId', async (req, res) => {
  try {
    const { openItemId } = req.params;
    await arClearingService.clearOpenItem(parseInt(openItemId));
    res.json({
      success: true,
      message: `AR open item ${openItemId} cleared successfully`
    });
  } catch (error: any) {
    console.error('Error clearing AR open item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear AR open item'
    });
  }
});

// Get clearing statistics
router.get('/clearing/statistics', async (req, res) => {
  try {
    const stats = await arClearingService.getClearingStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting clearing statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get clearing statistics'
    });
  }
});

/**
 * AR Reconciliation Routes
 */

// Reconcile AR subledger with GL
router.post('/reconciliation/reconcile', async (req, res) => {
  try {
    const { companyCode, glAccountId } = req.body;
    
    // Get created_by from request or auth context
    let createdBy: number | undefined = undefined;
    if ((req as any).user?.id) {
      createdBy = parseInt(String((req as any).user.id));
    } else if (req.body.created_by) {
      createdBy = parseInt(String(req.body.created_by));
    }
    
    const result = await arReconciliationService.reconcileARSubledger(
      companyCode,
      glAccountId ? parseInt(String(glAccountId)) : undefined
    );
    
    // Save reconciliation history
    await arReconciliationService.saveReconciliationHistory(
      result,
      companyCode,
      glAccountId ? parseInt(String(glAccountId)) : undefined,
      createdBy
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error reconciling AR subledger:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconcile AR subledger'
    });
  }
});

// Get reconciliation history
router.get('/reconciliation/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
    const history = await arReconciliationService.getReconciliationHistory(limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error getting reconciliation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reconciliation history'
    });
  }
});

/**
 * Aging Analysis Routes
 */

// Update aging buckets
router.post('/aging/update-buckets', async (req, res) => {
  try {
    const result = await agingAnalysisService.updateAgingBuckets();
    res.json({
      success: true,
      updated: result.updated,
      message: `Updated ${result.updated} AR open items with aging buckets`
    });
  } catch (error: any) {
    console.error('Error updating aging buckets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update aging buckets'
    });
  }
});

// Get aging report
router.get('/aging/report', async (req, res) => {
  try {
    const customerId = req.query.customerId ? parseInt(String(req.query.customerId)) : undefined;
    const report = await agingAnalysisService.getAgingReport(customerId);
    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Error getting aging report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get aging report'
    });
  }
});

/**
 * Payment Application Routes
 */

// Apply payment to specific AR open items
router.post('/payments/apply', async (req, res) => {
  try {
    const { paymentId, openItemIds, amounts } = req.body;

    if (!paymentId || !openItemIds || !amounts || openItemIds.length !== amounts.length) {
      return res.status(400).json({
        success: false,
        error: 'paymentId, openItemIds, and amounts arrays are required and must have same length'
      });
    }

    const results = [];
    for (let i = 0; i < openItemIds.length; i++) {
      try {
        await arOpenItemsService.updateOutstandingAmount(
          parseInt(String(openItemIds[i])),
          parseFloat(String(amounts[i]))
        );
        results.push({
          openItemId: openItemIds[i],
          amount: amounts[i],
          success: true
        });
      } catch (error: any) {
        results.push({
          openItemId: openItemIds[i],
          amount: amounts[i],
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      message: `Applied payment to ${results.filter(r => r.success).length} AR open items`
    });
  } catch (error: any) {
    console.error('Error applying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply payment'
    });
  }
});

// Get AR open items for payment application
router.get('/payments/open-items/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customerIdNum = parseInt(customerId);
    
    if (isNaN(customerIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer ID'
      });
    }
    
    console.log(`Fetching open items for customer ID: ${customerIdNum}`);
    const items = await arOpenItemsService.getOpenItemsByCustomer(customerIdNum);
    console.log(`Found ${items.length} open items for customer ${customerIdNum}`);
    
    res.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('Error getting open items:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get open items'
    });
  }
});

export default router;

