import express from 'express';
import { paymentIntegrationService } from '../services/PaymentIntegrationService';

const router = express.Router();

/**
 * Process a customer payment with complete end-to-end integration
 * POST /api/payments/process
 */
router.post('/process', async (req, res) => {
  try {
    const { customerId, bankAccountId, amount, paymentReference, paymentMethod, description } = req.body;

    if (!customerId || !bankAccountId || !amount || !paymentReference || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, bankAccountId, amount, paymentReference, paymentMethod'
      });
    }

    const result = await paymentIntegrationService.processCustomerPayment({
      customerId: parseInt(customerId),
      bankAccountId: parseInt(bankAccountId),
      amount: parseFloat(amount),
      paymentReference,
      paymentMethod,
      description
    });

    res.json(result);
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      error: 'Payment processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get customer payment summary with AR balance and transaction history
 * GET /api/payments/customer/:customerId/summary
 */
router.get('/customer/:customerId/summary', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const summary = await paymentIntegrationService.getCustomerPaymentSummary(customerId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching customer payment summary:', error);
    res.status(500).json({
      error: 'Failed to fetch customer payment summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Link customer to bank account for future payments
 * POST /api/payments/link-bank-account
 */
router.post('/link-bank-account', async (req, res) => {
  try {
    const { customerId, bankAccountId } = req.body;

    if (!customerId || !bankAccountId) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, bankAccountId'
      });
    }

    const result = await paymentIntegrationService.linkCustomerToBankAccount(
      parseInt(customerId),
      parseInt(bankAccountId)
    );

    res.json(result);
  } catch (error) {
    console.error('Error linking customer to bank account:', error);
    res.status(500).json({
      error: 'Failed to link customer to bank account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get available bank accounts for payments
 * GET /api/payments/bank-accounts
 */
router.get('/bank-accounts', async (req, res) => {
  try {
    const accounts = await paymentIntegrationService.getAvailableBankAccounts();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch bank accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;