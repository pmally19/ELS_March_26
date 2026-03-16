/**
 * Single Company ERP Testing Service
 * Creates real organizational structure for one company at a time
 * Allows verification of actual data in the system
 */

import { db } from '../db';

interface SingleCompanyConfig {
  companyName: string;
  businessType: 'Manufacturing' | 'Retail' | 'Food Service';
  companyCode: string;
  currency: string;
  country: string;
}

class SingleCompanyERPTesting {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  async testSingleCompany(companyType: string): Promise<any> {
    const config = this.getCompanyConfig(companyType);
    const testResults = [];
    const createdData = {
      companyCode: null,
      plants: [],
      customers: [],
      vendors: [],
      materials: [],
      accounts: []
    };

    try {
      console.log(`Testing ${config.companyName} (${config.businessType})`);

      // Step 1: Create Company Code
      const companyResult = await this.createCompanyCode(config);
      testResults.push(companyResult);
      if (companyResult.status === 'PASSED') {
        createdData.companyCode = companyResult.data;
      }

      // Step 2: Create Chart of Accounts
      const accountsResult = await this.createChartOfAccounts(config);
      testResults.push(accountsResult);
      if (accountsResult.status === 'PASSED') {
        createdData.accounts = accountsResult.accounts;
      }

      // Step 3: Create Plants
      const plants = this.getBusinessTypePlants(config);
      for (const plant of plants) {
        const plantResult = await this.createPlant(config, plant);
        testResults.push(plantResult);
        if (plantResult.status === 'PASSED') {
          createdData.plants.push(plantResult.data);
        }
      }

      // Step 4: Create Customers
      const customers = this.getBusinessTypeCustomers(config);
      for (const customer of customers) {
        const customerResult = await this.createCustomer(config, customer);
        testResults.push(customerResult);
        if (customerResult.status === 'PASSED') {
          createdData.customers.push(customerResult.data);
        }
      }

      // Step 5: Create Vendors
      const vendors = this.getBusinessTypeVendors(config);
      for (const vendor of vendors) {
        const vendorResult = await this.createVendor(config, vendor);
        testResults.push(vendorResult);
        if (vendorResult.status === 'PASSED') {
          createdData.vendors.push(vendorResult.data);
        }
      }

      // Step 6: Create Sales Order
      const salesOrderResult = await this.createSalesOrder(config);
      testResults.push(salesOrderResult);

      // Step 7: Create Journal Entry
      const journalResult = await this.createJournalEntry(config);
      testResults.push(journalResult);

      const passedTests = testResults.filter(t => t.status === 'PASSED').length;
      const totalTests = testResults.length;

      return {
        success: true,
        companyName: config.companyName,
        businessType: config.businessType,
        companyCode: config.companyCode,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: Math.round((passedTests / totalTests) * 100),
        testResults,
        createdData,
        verificationQueries: this.getVerificationQueries(config),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        companyName: config.companyName,
        testResults,
        createdData
      };
    }
  }

  private getCompanyConfig(companyType: string): SingleCompanyConfig {
    switch (companyType) {
      case 'dominos':
        return {
          companyName: 'Dominos Pizza Corporation',
          businessType: 'Food Service',
          companyCode: 'DOM001',
          currency: 'USD',
          country: 'United States'
        };
      case '3m':
        return {
          companyName: '3M Manufacturing Corporation',
          businessType: 'Manufacturing',
          companyCode: '3M001',
          currency: 'USD',
          country: 'United States'
        };
      case 'walmart':
        return {
          companyName: 'Walmart Corporation',
          businessType: 'Retail',
          companyCode: 'WMT001',
          currency: 'USD',
          country: 'United States'
        };
      default:
        return {
          companyName: 'Dominos Pizza Corporation',
          businessType: 'Food Service',
          companyCode: 'DOM001',
          currency: 'USD',
          country: 'United States'
        };
    }
  }

  private async createCompanyCode(config: SingleCompanyConfig): Promise<any> {
    try {
      const query = `
        INSERT INTO company_codes (code, name, currency, country, business_type, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          currency = EXCLUDED.currency,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        config.companyCode,
        config.companyName,
        config.currency,
        config.country,
        config.businessType
      ]);

      return {
        testName: 'Company Code Creation',
        testType: 'Foundation Setup',
        companyCode: config.companyCode,
        status: 'PASSED',
        details: `Created Company Code ${config.companyCode} for ${config.companyName}`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM company_codes WHERE code = '${config.companyCode}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Company Code Creation',
        testType: 'Foundation Setup',
        companyCode: config.companyCode,
        status: 'FAILED',
        details: `Failed to create Company Code: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createChartOfAccounts(config: SingleCompanyConfig): Promise<any> {
    try {
      const accounts = this.getIndustrySpecificAccounts(config.businessType);
      const createdAccounts = [];
      
      for (const account of accounts) {
        const query = `
          INSERT INTO chart_of_accounts (company_code, account_number, account_name, account_type, account_group, created_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (company_code, account_number) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        const result = await this.pool.query(query, [
          config.companyCode, 
          account.number, 
          account.name, 
          account.type, 
          account.group
        ]);
        
        createdAccounts.push(result.rows[0]);
      }

      return {
        testName: 'Chart of Accounts Setup',
        testType: 'Foundation Setup',
        companyCode: config.companyCode,
        status: 'PASSED',
        details: `Created ${accounts.length} accounts for ${config.businessType} business type`,
        accounts: createdAccounts,
        verificationQuery: `SELECT * FROM chart_of_accounts WHERE company_code = '${config.companyCode}' ORDER BY account_number`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Chart of Accounts Setup',
        testType: 'Foundation Setup',
        companyCode: config.companyCode,
        status: 'FAILED',
        details: `Failed to create Chart of Accounts: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createPlant(config: SingleCompanyConfig, plant: any): Promise<any> {
    try {
      const query = `
        INSERT INTO plants (company_code, plant_code, plant_name, location, business_type, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (company_code, plant_code) DO UPDATE SET
          plant_name = EXCLUDED.plant_name,
          location = EXCLUDED.location,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        config.companyCode,
        plant.plantCode,
        plant.plantName,
        plant.location,
        config.businessType
      ]);

      return {
        testName: 'Plant Creation',
        testType: 'Organizational Setup',
        companyCode: config.companyCode,
        plantCode: plant.plantCode,
        status: 'PASSED',
        details: `Created Plant ${plant.plantCode} - ${plant.plantName}`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM plants WHERE company_code = '${config.companyCode}' AND plant_code = '${plant.plantCode}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Plant Creation',
        testType: 'Organizational Setup',
        companyCode: config.companyCode,
        plantCode: plant.plantCode,
        status: 'FAILED',
        details: `Failed to create Plant: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createCustomer(config: SingleCompanyConfig, customer: any): Promise<any> {
    try {
      const query = `
        INSERT INTO customers (company_code, customer_code, name, customer_group, payment_terms, currency, customer_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (company_code, customer_code) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        customer.company_code,
        customer.customer_code,
        customer.name,
        customer.customer_group,
        customer.payment_terms,
        customer.currency,
        customer.type
      ]);

      return {
        testName: 'Customer Master Data Creation',
        testType: 'Master Data',
        companyCode: config.companyCode,
        customerCode: customer.customer_code,
        status: 'PASSED',
        details: `Created Customer ${customer.customer_code} - ${customer.name}`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM customers WHERE company_code = '${config.companyCode}' AND customer_code = '${customer.customer_code}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Customer Master Data Creation',
        testType: 'Master Data',
        companyCode: config.companyCode,
        customerCode: customer.customer_code,
        status: 'FAILED',
        details: `Failed to create Customer: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createVendor(config: SingleCompanyConfig, vendor: any): Promise<any> {
    try {
      const query = `
        INSERT INTO vendors (company_code, vendor_code, name, vendor_group, payment_terms, currency, vendor_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (company_code, vendor_code) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        vendor.company_code,
        vendor.vendor_code,
        vendor.name,
        vendor.vendor_group,
        vendor.payment_terms,
        vendor.currency,
        vendor.type
      ]);

      return {
        testName: 'Vendor Master Data Creation',
        testType: 'Master Data',
        companyCode: config.companyCode,
        vendorCode: vendor.vendor_code,
        status: 'PASSED',
        details: `Created Vendor ${vendor.vendor_code} - ${vendor.name}`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM vendors WHERE company_code = '${config.companyCode}' AND vendor_code = '${vendor.vendor_code}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Vendor Master Data Creation',
        testType: 'Master Data',
        companyCode: config.companyCode,
        vendorCode: vendor.vendor_code,
        status: 'FAILED',
        details: `Failed to create Vendor: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createSalesOrder(config: SingleCompanyConfig): Promise<any> {
    try {
      const orderNumber = `SO-${config.companyCode}-${Date.now()}`;
      const query = `
        INSERT INTO sales_orders (company_code, order_number, customer_code, order_date, total_amount, currency, status, created_at)
        VALUES ($1, $2, 'CUST001', CURRENT_DATE, 150.00, $3, 'Open', CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        config.companyCode,
        orderNumber,
        config.currency
      ]);

      return {
        testName: 'Sales Order Creation',
        testType: 'Business Transaction',
        companyCode: config.companyCode,
        orderNumber,
        status: 'PASSED',
        details: `Created Sales Order ${orderNumber} for $150.00`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM sales_orders WHERE company_code = '${config.companyCode}' AND order_number = '${orderNumber}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Sales Order Creation',
        testType: 'Business Transaction',
        companyCode: config.companyCode,
        status: 'FAILED',
        details: `Failed to create Sales Order: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async createJournalEntry(config: SingleCompanyConfig): Promise<any> {
    try {
      const docNumber = `JE-${config.companyCode}-${Date.now()}`;
      const query = `
        INSERT INTO journal_entries (company_code, document_number, document_type, document_date, reference, description, created_at)
        VALUES ($1, $2, 'Manual', CURRENT_DATE, 'TEST', $3, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        config.companyCode,
        docNumber,
        `Test journal entry for ${config.companyName}`
      ]);

      return {
        testName: 'Journal Entry Creation',
        testType: 'Financial Process',
        companyCode: config.companyCode,
        documentNumber: docNumber,
        status: 'PASSED',
        details: `Created Journal Entry ${docNumber}`,
        data: result.rows[0],
        verificationQuery: `SELECT * FROM journal_entries WHERE company_code = '${config.companyCode}' AND document_number = '${docNumber}'`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        testName: 'Journal Entry Creation',
        testType: 'Financial Process',
        companyCode: config.companyCode,
        status: 'FAILED',
        details: `Failed to create Journal Entry: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private getIndustrySpecificAccounts(businessType: string): any[] {
    const baseAccounts = [
      { number: '1000', name: 'Cash and Cash Equivalents', type: 'Asset', group: 'Current Assets' },
      { number: '1100', name: 'Accounts Receivable', type: 'Asset', group: 'Current Assets' },
      { number: '1200', name: 'Inventory', type: 'Asset', group: 'Current Assets' },
      { number: '2000', name: 'Accounts Payable', type: 'Liability', group: 'Current Liabilities' },
      { number: '3000', name: 'Owner Equity', type: 'Equity', group: 'Equity' },
      { number: '4000', name: 'Revenue', type: 'Revenue', group: 'Operating Revenue' }
    ];

    switch (businessType) {
      case 'Food Service':
        return [
          ...baseAccounts,
          { number: '1300', name: 'Food Inventory', type: 'Asset', group: 'Inventory' },
          { number: '4100', name: 'Food Sales', type: 'Revenue', group: 'Operating Revenue' },
          { number: '4200', name: 'Beverage Sales', type: 'Revenue', group: 'Operating Revenue' }
        ];
      case 'Manufacturing':
        return [
          ...baseAccounts,
          { number: '1300', name: 'Raw Materials', type: 'Asset', group: 'Inventory' },
          { number: '1310', name: 'Work in Process', type: 'Asset', group: 'Inventory' },
          { number: '5100', name: 'Direct Labor', type: 'Expense', group: 'Manufacturing' }
        ];
      case 'Retail':
        return [
          ...baseAccounts,
          { number: '1300', name: 'Merchandise Inventory', type: 'Asset', group: 'Inventory' },
          { number: '4100', name: 'Retail Sales', type: 'Revenue', group: 'Operating Revenue' }
        ];
      default:
        return baseAccounts;
    }
  }

  private getBusinessTypePlants(config: SingleCompanyConfig): any[] {
    switch (config.businessType) {
      case 'Food Service':
        return [
          { plantCode: 'NYC01', plantName: 'NYC Central Kitchen', location: 'New York, NY' },
          { plantCode: 'LA01', plantName: 'LA Distribution Center', location: 'Los Angeles, CA' }
        ];
      case 'Manufacturing':
        return [
          { plantCode: 'MN01', plantName: 'Minnesota Manufacturing', location: 'Saint Paul, MN' },
          { plantCode: 'TX01', plantName: 'Texas Production Facility', location: 'Austin, TX' }
        ];
      case 'Retail':
        return [
          { plantCode: 'DC01', plantName: 'Distribution Center East', location: 'Bentonville, AR' },
          { plantCode: 'DC02', plantName: 'Distribution Center West', location: 'Phoenix, AZ' }
        ];
      default:
        return [{ plantCode: 'MAIN', plantName: 'Main Plant', location: 'Default Location' }];
    }
  }

  private getBusinessTypeCustomers(config: SingleCompanyConfig): any[] {
    const baseCustomer = {
      company_code: config.companyCode,
      customer_group: 'STANDARD',
      payment_terms: 'NET30',
      currency: config.currency
    };

    switch (config.businessType) {
      case 'Food Service':
        return [
          { ...baseCustomer, customer_code: 'CUST001', name: 'Regular Customer - Downtown', type: 'Individual' },
          { ...baseCustomer, customer_code: 'CORP001', name: 'Corporate Catering Client', type: 'Corporate' }
        ];
      case 'Manufacturing':
        return [
          { ...baseCustomer, customer_code: 'DIST001', name: 'Industrial Distributors Inc', type: 'Distributor' },
          { ...baseCustomer, customer_code: 'CORP001', name: 'Corporate Manufacturing Solutions', type: 'Corporate' }
        ];
      case 'Retail':
        return [
          { ...baseCustomer, customer_code: 'CUST001', name: 'Individual Consumer', type: 'Individual' },
          { ...baseCustomer, customer_code: 'BULK001', name: 'Bulk Purchase Customer', type: 'Wholesale' }
        ];
      default:
        return [{ ...baseCustomer, customer_code: 'CUST001', name: 'Standard Customer', type: 'Standard' }];
    }
  }

  private getBusinessTypeVendors(config: SingleCompanyConfig): any[] {
    const baseVendor = {
      company_code: config.companyCode,
      vendor_group: 'STANDARD',
      payment_terms: 'NET30',
      currency: config.currency
    };

    switch (config.businessType) {
      case 'Food Service':
        return [
          { ...baseVendor, vendor_code: 'FOOD001', name: 'Fresh Food Suppliers LLC', type: 'Food Supplier' },
          { ...baseVendor, vendor_code: 'BEV001', name: 'Beverage Distribution Co', type: 'Beverage Supplier' }
        ];
      case 'Manufacturing':
        return [
          { ...baseVendor, vendor_code: 'RAWMAT001', name: 'Raw Materials Supplier Inc', type: 'Raw Materials' },
          { ...baseVendor, vendor_code: 'EQUIP001', name: 'Manufacturing Equipment Co', type: 'Equipment' }
        ];
      case 'Retail':
        return [
          { ...baseVendor, vendor_code: 'MERCH001', name: 'Merchandise Wholesale Inc', type: 'Merchandise' },
          { ...baseVendor, vendor_code: 'TECH001', name: 'Technology Solutions Provider', type: 'Technology' }
        ];
      default:
        return [{ ...baseVendor, vendor_code: 'VEND001', name: 'Standard Vendor', type: 'Standard' }];
    }
  }

  private getVerificationQueries(config: SingleCompanyConfig): any {
    return {
      companyCode: `SELECT * FROM company_codes WHERE code = '${config.companyCode}'`,
      chartOfAccounts: `SELECT * FROM chart_of_accounts WHERE company_code = '${config.companyCode}' ORDER BY account_number`,
      plants: `SELECT * FROM plants WHERE company_code = '${config.companyCode}'`,
      customers: `SELECT * FROM customers WHERE company_code = '${config.companyCode}'`,
      vendors: `SELECT * FROM vendors WHERE company_code = '${config.companyCode}'`,
      salesOrders: `SELECT * FROM sales_orders WHERE company_code = '${config.companyCode}'`,
      journalEntries: `SELECT * FROM journal_entries WHERE company_code = '${config.companyCode}'`
    };
  }
}

export { SingleCompanyERPTesting };