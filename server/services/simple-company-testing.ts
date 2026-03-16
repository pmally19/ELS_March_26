/**
 * Simple Company Testing Service
 * Creates real data in existing database tables for verification
 */

import { db } from '../db';

export class SimpleCompanyTesting {
  
  async runDominosTest() {
    console.log('🍕 Starting Dominos Pizza Company Test...');
    
    const testResults = [];
    const companyCode = 'DOM01';
    
    try {
      // 1. Create Company Structure
      const companyResult = await this.createCompanyStructure(companyCode, 'Dominos Pizza LLC', 'Food Service');
      testResults.push(companyResult);
      
      // 2. Create Plants/Locations
      const plantResults = await this.createDominosPlants(companyCode);
      testResults.push(...plantResults);
      
      // 3. Create Chart of Accounts
      const accountResults = await this.createFoodServiceAccounts(companyCode);
      testResults.push(...accountResults);
      
      // 4. Create Customers
      const customerResults = await this.createDominosCustomers(companyCode);
      testResults.push(...customerResults);
      
      // 5. Create Vendors
      const vendorResults = await this.createDominosVendors(companyCode);
      testResults.push(...vendorResults);
      
      // 6. Create Sales Orders
      const salesResults = await this.createDominosSales(companyCode);
      testResults.push(...salesResults);
      
      // 7. Generate verification queries
      const verificationQueries = this.generateVerificationQueries(companyCode);
      
      return {
        success: true,
        companyCode,
        companyName: 'Dominos Pizza LLC',
        businessType: 'Food Service',
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.status === 'PASSED').length,
        failedTests: testResults.filter(r => r.status === 'FAILED').length,
        testResults,
        verificationQueries,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Dominos test error:', error);
      return {
        success: false,
        error: (error as Error).message,
        testResults
      };
    }
  }
  
  async createCompanyStructure(companyCode: string, companyName: string, businessType: string) {
    try {
      // Insert into company_codes table if it exists
      await db.execute({
        sql: `INSERT INTO company_codes (company_code, company_name, country, currency, language, business_type, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?) 
              ON CONFLICT (company_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        args: [companyCode, companyName, 'US', 'USD', 'EN', businessType, new Date().toISOString()]
      });
      
      return {
        testId: 'COMPANY_STRUCTURE',
        description: 'Create Company Code Structure',
        status: 'PASSED',
        result: `Company ${companyCode} - ${companyName} created successfully`,
        data: { companyCode, companyName, businessType }
      };
    } catch (error) {
      return {
        testId: 'COMPANY_STRUCTURE',
        description: 'Create Company Code Structure',
        status: 'FAILED',
        error: (error as Error).message
      };
    }
  }
  
  async createDominosPlants(companyCode: string) {
    const plants = [
      { code: 'NYC01', name: 'Manhattan Store', location: 'New York, NY' },
      { code: 'LA01', name: 'Beverly Hills Store', location: 'Los Angeles, CA' },
      { code: 'CHI01', name: 'Downtown Chicago Store', location: 'Chicago, IL' }
    ];
    
    const results = [];
    for (const plant of plants) {
      try {
        await db.execute({
          sql: `INSERT INTO plants (company_code, plant_code, plant_name, location, business_type, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (company_code, plant_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          args: [companyCode, plant.code, plant.name, plant.location, 'Food Service', new Date().toISOString()]
        });
        
        results.push({
          testId: `PLANT_${plant.code}`,
          description: `Create Plant ${plant.code}`,
          status: 'PASSED',
          result: `Plant ${plant.code} - ${plant.name} created`,
          data: plant
        });
      } catch (error) {
        results.push({
          testId: `PLANT_${plant.code}`,
          description: `Create Plant ${plant.code}`,
          status: 'FAILED',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }
  
  async createFoodServiceAccounts(companyCode: string) {
    const accounts = [
      { number: '1000', name: 'Cash and Cash Equivalents', type: 'Assets' },
      { number: '1200', name: 'Accounts Receivable', type: 'Assets' },
      { number: '1500', name: 'Inventory - Food Items', type: 'Assets' },
      { number: '2000', name: 'Accounts Payable', type: 'Liabilities' },
      { number: '4000', name: 'Pizza Sales Revenue', type: 'Revenue' },
      { number: '5000', name: 'Cost of Goods Sold - Food', type: 'Expenses' },
      { number: '6000', name: 'Labor Costs', type: 'Expenses' },
      { number: '6100', name: 'Delivery Expenses', type: 'Expenses' }
    ];
    
    const results = [];
    for (const account of accounts) {
      try {
        await db.execute({
          sql: `INSERT INTO chart_of_accounts (company_code, account_number, account_name, account_type, account_group, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (company_code, account_number) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          args: [companyCode, account.number, account.name, account.type, 'Food Service', new Date().toISOString()]
        });
        
        results.push({
          testId: `ACCOUNT_${account.number}`,
          description: `Create Account ${account.number}`,
          status: 'PASSED',
          result: `Account ${account.number} - ${account.name} created`,
          data: account
        });
      } catch (error) {
        results.push({
          testId: `ACCOUNT_${account.number}`,
          description: `Create Account ${account.number}`,
          status: 'FAILED',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }
  
  async createDominosCustomers(companyCode: string) {
    const customers = [
      { code: 'CUST001', name: 'John Smith', group: 'Individual', type: 'Walk-in' },
      { code: 'CUST002', name: 'ABC Corporation', group: 'Corporate', type: 'Delivery' },
      { code: 'CUST003', name: 'Local School District', group: 'Institutional', type: 'Bulk Order' }
    ];
    
    const results = [];
    for (const customer of customers) {
      try {
        await db.execute({
          sql: `INSERT INTO customers (company_code, customer_code, name, customer_group, payment_terms, currency, customer_type, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (company_code, customer_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          args: [companyCode, customer.code, customer.name, customer.group, 'Net 30', 'USD', customer.type, new Date().toISOString()]
        });
        
        results.push({
          testId: `CUSTOMER_${customer.code}`,
          description: `Create Customer ${customer.code}`,
          status: 'PASSED',
          result: `Customer ${customer.code} - ${customer.name} created`,
          data: customer
        });
      } catch (error) {
        results.push({
          testId: `CUSTOMER_${customer.code}`,
          description: `Create Customer ${customer.code}`,
          status: 'FAILED',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }
  
  async createDominosVendors(companyCode: string) {
    const vendors = [
      { code: 'VEND001', name: 'Cheese Suppliers Inc', group: 'Food', type: 'Dairy' },
      { code: 'VEND002', name: 'Flour Mills Co', group: 'Food', type: 'Dry Goods' },
      { code: 'VEND003', name: 'Packaging Solutions', group: 'Supplies', type: 'Packaging' }
    ];
    
    const results = [];
    for (const vendor of vendors) {
      try {
        await db.execute({
          sql: `INSERT INTO vendors (company_code, vendor_code, name, vendor_group, payment_terms, currency, vendor_type, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (company_code, vendor_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          args: [companyCode, vendor.code, vendor.name, vendor.group, 'Net 15', 'USD', vendor.type, new Date().toISOString()]
        });
        
        results.push({
          testId: `VENDOR_${vendor.code}`,
          description: `Create Vendor ${vendor.code}`,
          status: 'PASSED',
          result: `Vendor ${vendor.code} - ${vendor.name} created`,
          data: vendor
        });
      } catch (error) {
        results.push({
          testId: `VENDOR_${vendor.code}`,
          description: `Create Vendor ${vendor.code}`,
          status: 'FAILED',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }
  
  async createDominosSales(companyCode: string) {
    const salesOrders = [
      { number: 'SO001', customer: 'CUST001', amount: 25.99, status: 'Delivered' },
      { number: 'SO002', customer: 'CUST002', amount: 150.00, status: 'In Progress' }
    ];
    
    const results = [];
    for (const order of salesOrders) {
      try {
        await db.execute({
          sql: `INSERT INTO sales_orders (company_code, order_number, customer_code, order_date, total_amount, currency, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (company_code, order_number) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          args: [companyCode, order.number, order.customer, new Date().toISOString().split('T')[0], order.amount, 'USD', order.status, new Date().toISOString()]
        });
        
        results.push({
          testId: `SALES_${order.number}`,
          description: `Create Sales Order ${order.number}`,
          status: 'PASSED',
          result: `Sales Order ${order.number} for $${order.amount} created`,
          data: order
        });
      } catch (error) {
        results.push({
          testId: `SALES_${order.number}`,
          description: `Create Sales Order ${order.number}`,
          status: 'FAILED',
          error: (error as Error).message
        });
      }
    }
    
    return results;
  }
  
  generateVerificationQueries(companyCode: string) {
    return {
      companyStructure: `SELECT * FROM company_codes WHERE company_code = '${companyCode}';`,
      plants: `SELECT * FROM plants WHERE company_code = '${companyCode}';`,
      accounts: `SELECT * FROM chart_of_accounts WHERE company_code = '${companyCode}';`,
      customers: `SELECT * FROM customers WHERE company_code = '${companyCode}';`,
      vendors: `SELECT * FROM vendors WHERE company_code = '${companyCode}';`,
      salesOrders: `SELECT * FROM sales_orders WHERE company_code = '${companyCode}';`,
      totalRecords: `
        SELECT 
          'company_codes' as table_name, COUNT(*) as count FROM company_codes WHERE company_code = '${companyCode}'
        UNION ALL
        SELECT 'plants', COUNT(*) FROM plants WHERE company_code = '${companyCode}'
        UNION ALL
        SELECT 'accounts', COUNT(*) FROM chart_of_accounts WHERE company_code = '${companyCode}'
        UNION ALL
        SELECT 'customers', COUNT(*) FROM customers WHERE company_code = '${companyCode}'
        UNION ALL
        SELECT 'vendors', COUNT(*) FROM vendors WHERE company_code = '${companyCode}'
        UNION ALL
        SELECT 'sales_orders', COUNT(*) FROM sales_orders WHERE company_code = '${companyCode}';
      `
    };
  }
}