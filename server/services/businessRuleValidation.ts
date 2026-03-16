/**
 * Business Rule Validation and Exception Handling Service
 * Handles real-world business scenarios with proper validation and error messages
 */

import { db } from '../db';
import { eq, and, or, sql } from 'drizzle-orm';

export interface BusinessRuleException {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  actions?: string[];
  details?: any;
}

export class BusinessRuleValidationService {
  
  /**
   * Multi-Currency Payment Validation
   * Validates currency exchange and payment processing for international transactions
   */
  async validateMultiCurrencyPayment(paymentData: {
    companyCode: string;
    vendorCode: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  }): Promise<BusinessRuleException[]> {
    const exceptions: BusinessRuleException[] = [];
    
    try {
      // Check if company operates in multiple currencies
      const companyInfo = await db.execute(sql`
        SELECT company_code, company_name, currency_code
        FROM company_codes 
        WHERE company_code = ${paymentData.companyCode}
      `);
      
      if (companyInfo.rows.length === 0) {
        exceptions.push({
          code: 'COMPANY_NOT_FOUND',
          message: `Company ${paymentData.companyCode} not found in system`,
          severity: 'ERROR'
        });
        return exceptions;
      }
      
      // Validate currency exchange rates exist
      const exchangeRates = await db.execute(sql`
        SELECT currency_code, exchange_rate
        FROM exchange_rates 
        WHERE currency_code = ${paymentData.currency}
        AND rate_date >= CURRENT_DATE - INTERVAL '7 days'
      `);
      
      if (exchangeRates.rows.length === 0 && paymentData.currency !== 'USD') {
        exceptions.push({
          code: 'CURRENCY_RATE_MISSING',
          message: `Exchange rate for ${paymentData.currency} not available. Cannot process international payment.`,
          severity: 'ERROR',
          actions: ['Update exchange rates', 'Contact Finance team', 'Use base currency USD']
        });
      }
      
      // Validate payment limits for international transactions
      if (paymentData.amount > 50000 && paymentData.currency !== 'USD') {
        exceptions.push({
          code: 'INTL_PAYMENT_LIMIT_EXCEEDED',
          message: `International payment of ${paymentData.amount} ${paymentData.currency} exceeds limit. Requires approval.`,
          severity: 'WARNING',
          actions: ['Get management approval', 'Split payment', 'Use wire transfer']
        });
      }
      
      // Check vendor payment terms for international suppliers
      const vendorInfo = await db.execute(sql`
        SELECT vendor_code, vendor_name, country
        FROM erp_vendors 
        WHERE vendor_code = ${paymentData.vendorCode}
      `);
      
      if (vendorInfo.rows.length > 0 && vendorInfo.rows[0].country && vendorInfo.rows[0].country !== 'US') {
        exceptions.push({
          code: 'INTL_VENDOR_PAYMENT',
          message: `Payment to ${vendorInfo.rows[0].country} vendor requires compliance verification`,
          severity: 'INFO',
          actions: ['Verify tax compliance', 'Check payment regulations', 'Document international transfer']
        });
      }
      
    } catch (error) {
      exceptions.push({
        code: 'VALIDATION_ERROR',
        message: `Currency validation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
    
    return exceptions;
  }
  
  /**
   * Account Closure Validation
   * Prevents closing accounts with outstanding transactions or unprocessed payroll
   */
  async validateAccountClosure(accountData: {
    accountNumber: string;
    companyCode: string;
    closureDate: Date;
    reason: string;
  }): Promise<BusinessRuleException[]> {
    const exceptions: BusinessRuleException[] = [];
    
    try {
      // Check for outstanding balances
      const outstandingBalance = await db.execute(sql`
        SELECT SUM(debit_amount - credit_amount) as balance
        FROM enterprise_transaction_registry 
        WHERE primary_account = ${accountData.accountNumber}
        AND business_entity_code = ${accountData.companyCode}
        AND transaction_status = 'POSTED'
      `);
      
      const balance = Number(outstandingBalance.rows[0]?.balance || 0);
      
      if (Math.abs(balance) > 0.01) {
        exceptions.push({
          code: 'ACCOUNT_BALANCE_NOT_ZERO',
          message: `Cannot close account ${accountData.accountNumber}. Outstanding balance: $${balance.toFixed(2)}`,
          severity: 'ERROR',
          actions: ['Clear outstanding balance', 'Post adjustment entry', 'Review transactions']
        });
      }
      
      // Check for unprocessed payroll
      const unprocessedPayroll = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM enterprise_transaction_registry 
        WHERE primary_account = ${accountData.accountNumber}
        AND transaction_category = 'PAYROLL'
        AND transaction_status = 'PENDING'
      `);
      
      const pendingPayroll = Number(unprocessedPayroll.rows[0]?.count || 0);
      
      if (pendingPayroll > 0) {
        exceptions.push({
          code: 'UNPROCESSED_PAYROLL',
          message: `Cannot close account ${accountData.accountNumber}. ${pendingPayroll} unprocessed payroll transactions exist.`,
          severity: 'ERROR',
          actions: ['Process pending payroll', 'Review payroll status', 'Contact HR department'],
          details: { pendingCount: pendingPayroll }
        });
      }
      
      // Check for future dated transactions
      const futureTransactions = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM enterprise_transaction_registry 
        WHERE primary_account = ${accountData.accountNumber}
        AND fiscal_period > ${accountData.closureDate.toISOString().slice(0, 7)}
      `);
      
      const futureCount = Number(futureTransactions.rows[0]?.count || 0);
      
      if (futureCount > 0) {
        exceptions.push({
          code: 'FUTURE_TRANSACTIONS_EXIST',
          message: `Account ${accountData.accountNumber} has ${futureCount} future transactions. Review before closure.`,
          severity: 'WARNING',
          actions: ['Review future transactions', 'Reschedule closure date', 'Move transactions to different account']
        });
      }
      
      // Check for recurring transactions
      const recurringTransactions = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM enterprise_transaction_registry 
        WHERE primary_account = ${accountData.accountNumber}
        AND transaction_type = 'RECURRING'
        AND transaction_status = 'ACTIVE'
      `);
      
      const recurringCount = Number(recurringTransactions.rows[0]?.count || 0);
      
      if (recurringCount > 0) {
        exceptions.push({
          code: 'ACTIVE_RECURRING_TRANSACTIONS',
          message: `Account ${accountData.accountNumber} has ${recurringCount} active recurring transactions.`,
          severity: 'WARNING',
          actions: ['Cancel recurring transactions', 'Transfer to new account', 'Set end date for recurring items']
        });
      }
      
    } catch (error) {
      exceptions.push({
        code: 'VALIDATION_ERROR',
        message: `Account closure validation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
    
    return exceptions;
  }
  
  /**
   * Cross-Border Tax Compliance Validation
   * Validates tax compliance for US company buying from Canada/Mexico
   */
  async validateCrossBorderTaxCompliance(transactionData: {
    companyCode: string;
    vendorCountry: string;
    amount: number;
    currency: string;
    productCategory: string;
  }): Promise<BusinessRuleException[]> {
    const exceptions: BusinessRuleException[] = [];
    
    try {
      // USMCA/NAFTA compliance for Canada/Mexico
      if (['CA', 'MX'].includes(transactionData.vendorCountry)) {
        
        // Check for required tax documentation
        if (transactionData.amount > 2500) {
          exceptions.push({
            code: 'CROSS_BORDER_TAX_DOC_REQUIRED',
            message: `Purchase from ${transactionData.vendorCountry} over $2,500 requires tax documentation`,
            severity: 'WARNING',
            actions: ['Obtain tax certificate', 'Verify vendor tax ID', 'Document compliance']
          });
        }
        
        // Check for duty and tariff implications
        if (transactionData.productCategory === 'MANUFACTURED_GOODS') {
          exceptions.push({
            code: 'DUTY_TARIFF_REVIEW',
            message: `Manufactured goods from ${transactionData.vendorCountry} may be subject to import duties`,
            severity: 'INFO',
            actions: ['Check tariff schedule', 'Calculate duty cost', 'Review USMCA benefits']
          });
        }
        
        // Currency hedging recommendation
        if (transactionData.amount > 10000 && transactionData.currency !== 'USD') {
          exceptions.push({
            code: 'CURRENCY_HEDGING_RECOMMENDED',
            message: `Large ${transactionData.currency} transaction may benefit from currency hedging`,
            severity: 'INFO',
            actions: ['Consider forward contract', 'Evaluate currency risk', 'Consult treasury team']
          });
        }
      }
      
    } catch (error) {
      exceptions.push({
        code: 'VALIDATION_ERROR',
        message: `Cross-border tax validation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
    
    return exceptions;
  }
  
  /**
   * Payroll Processing Validation
   * Validates payroll processing and account management
   */
  async validatePayrollProcessing(payrollData: {
    companyCode: string;
    payPeriod: string;
    employeeCount: number;
    totalAmount: number;
    payrollAccountNumber: string;
  }): Promise<BusinessRuleException[]> {
    const exceptions: BusinessRuleException[] = [];
    
    try {
      // Check payroll account balance
      const accountBalance = await db.execute(sql`
        SELECT SUM(debit_amount - credit_amount) as balance
        FROM enterprise_transaction_registry 
        WHERE primary_account = ${payrollData.payrollAccountNumber}
        AND transaction_status = 'POSTED'
      `);
      
      const balance = Number(accountBalance.rows[0]?.balance || 0);
      
      if (balance < payrollData.totalAmount) {
        exceptions.push({
          code: 'INSUFFICIENT_PAYROLL_FUNDS',
          message: `Insufficient funds in payroll account. Available: $${balance.toFixed(2)}, Required: $${payrollData.totalAmount.toFixed(2)}`,
          severity: 'ERROR',
          actions: ['Transfer funds to payroll account', 'Delay payroll processing', 'Contact finance team']
        });
      }
      
      // Check for previous period processing
      const previousPeriodProcessed = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM enterprise_transaction_registry 
        WHERE transaction_category = 'PAYROLL'
        AND fiscal_period = ${payrollData.payPeriod}
        AND transaction_status = 'POSTED'
      `);
      
      const alreadyProcessed = Number(previousPeriodProcessed.rows[0]?.count || 0);
      
      if (alreadyProcessed > 0) {
        exceptions.push({
          code: 'PAYROLL_ALREADY_PROCESSED',
          message: `Payroll for period ${payrollData.payPeriod} already processed. ${alreadyProcessed} transactions found.`,
          severity: 'WARNING',
          actions: ['Review existing transactions', 'Process adjustments only', 'Verify payroll calendar']
        });
      }
      
      // Validate employee count
      if (payrollData.employeeCount === 0) {
        exceptions.push({
          code: 'NO_EMPLOYEES_SELECTED',
          message: 'No employees selected for payroll processing',
          severity: 'ERROR',
          actions: ['Select employees', 'Review payroll setup', 'Check employee status']
        });
      }
      
    } catch (error) {
      exceptions.push({
        code: 'VALIDATION_ERROR',
        message: `Payroll validation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }
    
    return exceptions;
  }
  
  /**
   * General Business Rule Validator
   * Main entry point for all business rule validations
   */
  async validateBusinessRule(ruleType: string, data: any): Promise<BusinessRuleException[]> {
    switch (ruleType) {
      case 'MULTI_CURRENCY_PAYMENT':
        return this.validateMultiCurrencyPayment(data);
      case 'ACCOUNT_CLOSURE':
        return this.validateAccountClosure(data);
      case 'CROSS_BORDER_TAX':
        return this.validateCrossBorderTaxCompliance(data);
      case 'PAYROLL_PROCESSING':
        return this.validatePayrollProcessing(data);
      default:
        return [{
          code: 'UNKNOWN_RULE_TYPE',
          message: `Unknown business rule type: ${ruleType}`,
          severity: 'ERROR'
        }];
    }
  }
}

export const businessRuleValidator = new BusinessRuleValidationService();