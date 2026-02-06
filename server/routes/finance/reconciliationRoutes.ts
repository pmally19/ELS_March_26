import { Router } from 'express';
import { arReconciliationService } from '../../services/arReconciliationService';
import { apReconciliationService } from '../../services/apReconciliationService';
import { inventoryReconciliationService } from '../../services/inventoryReconciliationService';

const router = Router();

/**
 * AR Reconciliation Routes
 */

// Reconcile AR subledger with GL
router.post('/ar/reconcile', async (req, res) => {
  try {
    const { companyCode, glAccountId } = req.body;
    const result = await arReconciliationService.reconcileARSubledger(
      companyCode,
      glAccountId ? parseInt(String(glAccountId)) : undefined
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

// Get AR reconciliation history
router.get('/ar/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
    const history = await arReconciliationService.getReconciliationHistory(limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error getting AR reconciliation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get AR reconciliation history'
    });
  }
});

/**
 * AP Reconciliation Routes
 */

// Reconcile AP subledger with GL
router.post('/ap/reconcile', async (req, res) => {
  try {
    const { companyCode, glAccountId } = req.body;
    const result = await apReconciliationService.reconcileAPSubledger(
      companyCode,
      glAccountId ? parseInt(String(glAccountId)) : undefined
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error reconciling AP subledger:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconcile AP subledger'
    });
  }
});

// Get AP reconciliation history
router.get('/ap/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
    const history = await apReconciliationService.getReconciliationHistory(limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error getting AP reconciliation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get AP reconciliation history'
    });
  }
});

/**
 * Inventory Reconciliation Routes
 */

// Reconcile Inventory subledger with GL
router.post('/inventory/reconcile', async (req, res) => {
  try {
    const { companyCode, glAccountId } = req.body;
    const result = await inventoryReconciliationService.reconcileInventorySubledger(
      companyCode,
      glAccountId ? parseInt(String(glAccountId)) : undefined
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error reconciling Inventory subledger:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconcile Inventory subledger'
    });
  }
});

// Get Inventory reconciliation history
router.get('/inventory/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
    const history = await inventoryReconciliationService.getReconciliationHistory(limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error getting Inventory reconciliation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Inventory reconciliation history'
    });
  }
});

export default router;

