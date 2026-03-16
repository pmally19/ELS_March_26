import { Router } from "express";
import { db } from "../../db";
import { bankAccounts, bankTransactions, cashPositions } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { insertBankAccountSchema, type InsertBankAccount } from "@shared/schema";

const router = Router();

// Get all bank accounts
router.get('/bank-accounts', async (req, res) => {
  try {
    const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true));
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// Create new bank account
router.post('/bank-accounts', async (req, res) => {
  try {
    const validatedData = insertBankAccountSchema.parse(req.body);
    
    const [newAccount] = await db
      .insert(bankAccounts)
      .values(validatedData)
      .returning();
    
    res.json({ success: true, account: newAccount });
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

// Get bank transactions for an account
router.get('/bank-transactions/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { status = 'all', limit = 50 } = req.query;
    
    // Mock transaction data - replace with actual database query once tables are created
    const mockTransactions = [
      {
        id: 1,
        bankAccountId: parseInt(accountId),
        transactionDate: "2025-01-10",
        valueDate: "2025-01-10",
        transactionType: "credit",
        amount: 5000.00,
        description: "Customer Payment - Invoice #INV-001",
        reference: "REF-001",
        reconciliationStatus: "unreconciled"
      },
      {
        id: 2,
        bankAccountId: parseInt(accountId),
        transactionDate: "2025-01-09",
        valueDate: "2025-01-09",
        transactionType: "debit",
        amount: 1200.00,
        description: "Vendor Payment - PO #PO-001",
        reference: "REF-002",
        reconciliationStatus: "reconciled"
      },
      {
        id: 3,
        bankAccountId: parseInt(accountId),
        transactionDate: "2025-01-08",
        valueDate: "2025-01-08",
        transactionType: "credit",
        amount: 2500.00,
        description: "Bank Transfer from Account 3001",
        reference: "REF-003",
        reconciliationStatus: "pending"
      }
    ];
    
    let filteredTransactions = mockTransactions;
    if (status !== 'all') {
      filteredTransactions = mockTransactions.filter(t => t.reconciliationStatus === status);
    }
    
    res.json(filteredTransactions.slice(0, parseInt(limit as string)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

// Reconcile bank transactions
router.post('/reconcile', async (req, res) => {
  try {
    const { transactionIds, reconciledBy } = req.body;
    
    // Mock reconciliation response - replace with actual database update once tables are created
    const mockResult = transactionIds.map((id: number) => ({
      id,
      reconciliationStatus: 'reconciled',
      reconciledDate: new Date().toISOString(),
      reconciledBy
    }));
    
    res.json({ 
      success: true, 
      reconciledCount: mockResult.length,
      transactions: mockResult 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reconcile transactions' });
  }
});

// Get cash position summary
router.get('/cash-position', async (req, res) => {
  try {
    const { companyCodeId = 1, currency = 'USD' } = req.query;
    
    // Get actual bank balances from database
    const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true));
    
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0);
    const availableBalance = accounts.reduce((sum, acc) => sum + Number(acc.availableBalance), 0);
    
    const cashPosition = {
      cashPosition: {
        openingBalance: totalBalance - 5000.00, // Previous day balance
        receipts: 7500.00,
        payments: 1200.00,
        closingBalance: totalBalance,
        forecastedReceipts: 12000.00,
        forecastedPayments: 5000.00,
        projectedBalance: totalBalance + 7000.00
      },
      bankingSummary: {
        totalBalance,
        availableBalance,
        accountCount: accounts.length
      }
    };
    
    res.json(cashPosition);
  } catch (error) {
    console.error('Error fetching cash position:', error);
    res.status(500).json({ error: 'Failed to fetch cash position' });
  }
});

// Create bank transaction
router.post('/bank-transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Mock transaction creation - replace with actual database insert once tables are created
    const mockTransaction = {
      id: Date.now(),
      ...transactionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true, transaction: mockTransaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bank transaction' });
  }
});

export default router;