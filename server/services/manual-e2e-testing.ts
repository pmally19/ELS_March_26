/**
 * Manual End-to-End Testing Service
 * Tests complete business workflows using actual API endpoints
 * Follows SAP/ERP implementation sequence: Company Code → Dependencies → Master Data → Transactions
 */

import fetch from 'node-fetch';

export class ManualE2ETestingService {
  private baseUrl = 'http://localhost:5000';
  private testResults: any[] = [];
  private testData: any = {};
  private errors: any[] = [];

  async runCompleteBusinessWorkflow() {
    this.testResults = [];
    this.errors = [];
    this.testData = {};
    
    console.log('🚀 Starting Manual E2E Testing - Complete Business Workflow');
    console.log('Testing sequence: Company Code → Plants → Customers → Sales → Finance');

    try {
      // Phase 1: Foundation Setup
      await this.testCompanyCodeCreation();
      await this.testPlantCreation();
      await this.testStorageLocationCreation();

      // Phase 2: Master Data
      await this.testCustomerMasterData();
      await this.testVendorMasterData();
      await this.testMaterialMasterData();

      // Phase 3: Business Transactions
      await this.testSalesOrderCreation();
      await this.testPurchaseOrderCreation();
      await this.testInventoryMovements();

      // Phase 4: Financial Integration
      await this.testFinancialPostings();
      await this.testReportGeneration();

      return {
        success: true,
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(t => t.status === 'PASSED').length,
        failedTests: this.testResults.filter(t => t.status === 'FAILED').length,
        criticalErrors: this.errors.length,
        testResults: this.testResults,
        errorDetails: this.errors,
        testData: this.testData,
        summary: this.generateTestSummary()
      };

    } catch (error) {
      console.error('💥 Critical E2E Testing Error:', error);
      return {
        success: false,
        error: error.message,
        testResults: this.testResults,
        errorDetails: this.errors
      };
    }
  }

  private async testCompanyCodeCreation() {
    console.log('\n📋 Testing Company Code Creation...');
    
    try {
      const companyData = {
        code: 'E2E',
        name: 'E2E Testing Company',
        country: 'US',
        currency: 'USD',
        language: 'EN',
        fiscal_year_variant: 'K4',
        chart_of_accounts: 'INT',
        address: '123 E2E Test Street',
        city: 'Test City',
        postal_code: '12345'
      };

      const response = await fetch(`${this.baseUrl}/api/company-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.companyCode = result;
        this.addTestResult('Company Code Creation', 'PASSED', `Created company code E2E with ID ${result.id}`);
        
        // Test dependency validation
        if (result.fiscal_year_variant && result.chart_of_accounts) {
          this.addTestResult('Company Code Dependencies', 'PASSED', 'All required dependencies configured');
        } else {
          this.addTestResult('Company Code Dependencies', 'FAILED', 'Missing fiscal year variant or chart of accounts');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Company Code Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Company Code Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Company Code Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Company Code Creation error: ${error.message}`);
    }
  }

  private async testPlantCreation() {
    console.log('\n🏭 Testing Plant Creation...');
    
    try {
      const plantData = {
        code: 'P001',
        name: 'E2E Test Plant',
        company_code: 'E2E',
        address: '456 Plant Street',
        city: 'Plant City',
        country: 'US'
      };

      const response = await fetch(`${this.baseUrl}/api/plants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.plant = result;
        this.addTestResult('Plant Creation', 'PASSED', `Created plant P001 with ID ${result.id}`);
        
        // Test plant-company code relationship
        if (result.company_code === 'E2E') {
          this.addTestResult('Plant-Company Integration', 'PASSED', 'Plant correctly linked to company code');
        } else {
          this.addTestResult('Plant-Company Integration', 'FAILED', 'Plant not properly linked to company code');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Plant Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Plant Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Plant Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Plant Creation error: ${error.message}`);
    }
  }

  private async testStorageLocationCreation() {
    console.log('\n📦 Testing Storage Location Creation...');
    
    try {
      const storageData = {
        code: 'SL01',
        name: 'E2E Storage Location',
        plant_code: 'P001',
        warehouse_type: 'Standard'
      };

      const response = await fetch(`${this.baseUrl}/api/storage-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storageData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.storageLocation = result;
        this.addTestResult('Storage Location Creation', 'PASSED', `Created storage location SL01 with ID ${result.id}`);
      } else {
        const error = await response.text();
        this.addTestResult('Storage Location Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Storage Location Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Storage Location Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Storage Location Creation error: ${error.message}`);
    }
  }

  private async testCustomerMasterData() {
    console.log('\n👤 Testing Customer Master Data...');
    
    try {
      const customerData = {
        name: 'E2E Test Customer Corporation',
        email: 'customer@e2etest.com',
        phone: '+1-555-E2E-TEST',
        address: '789 Customer Avenue',
        city: 'Customer City',
        country: 'US',
        credit_limit: 100000,
        payment_terms: 'Net 30',
        customer_group: 'Corporate'
      };

      const response = await fetch(`${this.baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.customer = result;
        this.addTestResult('Customer Creation', 'PASSED', `Created customer with ID ${result.id}`);
        
        // Test customer validation
        if (result.credit_limit > 0 && result.payment_terms) {
          this.addTestResult('Customer Validation', 'PASSED', 'Customer data validation successful');
        } else {
          this.addTestResult('Customer Validation', 'FAILED', 'Customer validation failed');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Customer Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Customer Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Customer Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Customer Creation error: ${error.message}`);
    }
  }

  private async testVendorMasterData() {
    console.log('\n🏢 Testing Vendor Master Data...');
    
    try {
      const vendorData = {
        name: 'E2E Test Vendor Ltd',
        email: 'vendor@e2etest.com',
        phone: '+1-555-VENDOR',
        address: '321 Vendor Street',
        city: 'Vendor City',
        country: 'US',
        payment_terms: 'Net 45',
        vendor_group: 'Suppliers'
      };

      const response = await fetch(`${this.baseUrl}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.vendor = result;
        this.addTestResult('Vendor Creation', 'PASSED', `Created vendor with ID ${result.id}`);
      } else {
        const error = await response.text();
        this.addTestResult('Vendor Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Vendor Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Vendor Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Vendor Creation error: ${error.message}`);
    }
  }

  private async testMaterialMasterData() {
    console.log('\n📦 Testing Material Master Data...');
    
    try {
      const materialData = {
        material_code: 'MAT-E2E-001',
        description: 'E2E Test Material',
        material_type: 'Finished Product',
        base_unit: 'PC',
        price: 25.99,
        plant_code: 'P001',
        storage_location: 'SL01'
      };

      const response = await fetch(`${this.baseUrl}/api/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.material = result;
        this.addTestResult('Material Creation', 'PASSED', `Created material MAT-E2E-001 with ID ${result.id}`);
        
        // Test material-plant relationship
        if (result.plant_code === 'P001') {
          this.addTestResult('Material-Plant Integration', 'PASSED', 'Material correctly linked to plant');
        } else {
          this.addTestResult('Material-Plant Integration', 'FAILED', 'Material not properly linked to plant');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Material Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Material Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Material Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Material Creation error: ${error.message}`);
    }
  }

  private async testSalesOrderCreation() {
    console.log('\n🛒 Testing Sales Order Creation...');
    
    try {
      const salesOrderData = {
        customer_name: 'E2E Test Customer Corporation',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'open',
        total_amount: 259.90,
        plant_code: 'P001',
        notes: 'E2E Test Sales Order - 10 units of MAT-E2E-001'
      };

      const response = await fetch(`${this.baseUrl}/api/sales/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salesOrderData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.salesOrder = result;
        this.addTestResult('Sales Order Creation', 'PASSED', `Created sales order ${result.order_number}`);
        
        // Test order validation
        if (result.total_amount > 0 && result.customer_name) {
          this.addTestResult('Sales Order Validation', 'PASSED', 'Sales order validation successful');
        } else {
          this.addTestResult('Sales Order Validation', 'FAILED', 'Sales order validation failed');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Sales Order Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Sales Order Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Sales Order Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Sales Order Creation error: ${error.message}`);
    }
  }

  private async testPurchaseOrderCreation() {
    console.log('\n📋 Testing Purchase Order Creation...');
    
    try {
      const purchaseOrderData = {
        vendor_name: 'E2E Test Vendor Ltd',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'open',
        total_amount: 1299.50,
        plant_code: 'P001',
        notes: 'E2E Test Purchase Order - Raw materials'
      };

      const response = await fetch(`${this.baseUrl}/api/purchase/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseOrderData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.purchaseOrder = result;
        this.addTestResult('Purchase Order Creation', 'PASSED', `Created purchase order ${result.order_number}`);
      } else {
        const error = await response.text();
        this.addTestResult('Purchase Order Creation', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Purchase Order Creation failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Purchase Order Creation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Purchase Order Creation error: ${error.message}`);
    }
  }

  private async testInventoryMovements() {
    console.log('\n📊 Testing Inventory Movements...');
    
    try {
      const movementData = {
        material_code: 'MAT-E2E-001',
        movement_type: 'Goods Receipt',
        quantity: 100,
        plant_code: 'P001',
        storage_location: 'SL01',
        reference_document: this.testData.purchaseOrder?.order_number || 'PO-E2E-001'
      };

      const response = await fetch(`${this.baseUrl}/api/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.inventoryMovement = result;
        this.addTestResult('Inventory Movement', 'PASSED', `Created inventory movement for 100 units`);
      } else {
        const error = await response.text();
        this.addTestResult('Inventory Movement', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Inventory Movement failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Inventory Movement', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Inventory Movement error: ${error.message}`);
    }
  }

  private async testFinancialPostings() {
    console.log('\n💰 Testing Financial Postings...');
    
    try {
      const journalData = {
        document_type: 'Sales Invoice',
        posting_date: new Date().toISOString().split('T')[0],
        company_code: 'E2E',
        reference_document: this.testData.salesOrder?.order_number || 'SO-E2E-001',
        total_amount: 259.90,
        currency: 'USD',
        description: 'E2E Test Financial Posting'
      };

      const response = await fetch(`${this.baseUrl}/api/finance/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testData.journalEntry = result;
        this.addTestResult('Financial Posting', 'PASSED', `Created journal entry ${result.document_number}`);
        
        // Test financial integration
        if (result.company_code === 'E2E' && result.total_amount === 259.90) {
          this.addTestResult('Financial Integration', 'PASSED', 'Financial data correctly integrated');
        } else {
          this.addTestResult('Financial Integration', 'FAILED', 'Financial integration validation failed');
        }
      } else {
        const error = await response.text();
        this.addTestResult('Financial Posting', 'FAILED', `API Error: ${response.status} - ${error}`);
        this.addError(`Financial Posting failed: ${error}`);
      }

    } catch (error) {
      this.addTestResult('Financial Posting', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Financial Posting error: ${error.message}`);
    }
  }

  private async testReportGeneration() {
    console.log('\n📈 Testing Report Generation...');
    
    try {
      // Test multiple report endpoints
      const reports = [
        '/api/reports/sales-summary',
        '/api/reports/inventory-status',
        '/api/reports/financial-summary'
      ];

      for (const reportUrl of reports) {
        const response = await fetch(`${this.baseUrl}${reportUrl}`);
        if (response.ok) {
          this.addTestResult(`Report: ${reportUrl}`, 'PASSED', 'Report generated successfully');
        } else {
          this.addTestResult(`Report: ${reportUrl}`, 'FAILED', `Report generation failed: ${response.status}`);
        }
      }

    } catch (error) {
      this.addTestResult('Report Generation', 'FAILED', `Network Error: ${error.message}`);
      this.addError(`Report Generation error: ${error.message}`);
    }
  }

  private addTestResult(testName: string, status: 'PASSED' | 'FAILED', details: string) {
    this.testResults.push({
      testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    const emoji = status === 'PASSED' ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${details}`);
  }

  private addError(error: string) {
    this.errors.push({
      error,
      timestamp: new Date().toISOString()
    });
    console.error(`🚨 ERROR: ${error}`);
  }

  private generateTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASSED').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAILED').length;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      criticalErrors: this.errors.length,
      testPhases: [
        'Foundation Setup (Company Code & Plants)',
        'Master Data (Customers, Vendors, Materials)', 
        'Business Transactions (Sales & Purchase Orders)',
        'Inventory Management',
        'Financial Integration'
      ],
      businessFlowStatus: this.evaluateBusinessFlowStatus()
    };
  }

  private evaluateBusinessFlowStatus() {
    const criticalTests = [
      'Company Code Creation',
      'Customer Creation', 
      'Sales Order Creation',
      'Financial Posting'
    ];

    const criticalPassed = this.testResults.filter(t => 
      criticalTests.includes(t.testName) && t.status === 'PASSED'
    ).length;

    if (criticalPassed === criticalTests.length) {
      return 'Complete Business Flow Working';
    } else if (criticalPassed >= 2) {
      return 'Partial Business Flow Working';
    } else {
      return 'Critical Business Flow Issues';
    }
  }
}

export const manualE2ETestingService = new ManualE2ETestingService();