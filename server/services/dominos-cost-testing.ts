import { db } from '../db';
import { eq, and } from 'drizzle-orm';

export interface DominosCostTestResult {
  testId: string;
  testName: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: any;
  screenshot?: string;
  executionTime: number;
}

export class DominosCostTestingService {
  async runComprehensiveTests(): Promise<DominosCostTestResult[]> {
    const startTime = Date.now();
    const results: DominosCostTestResult[] = [];

    try {
      // Test 1: Verify Company Structure
      const companyTest = await this.testCompanyStructure();
      results.push(companyTest);

      // Test 2: Verify Plant Locations
      const plantTest = await this.testPlantLocations();
      results.push(plantTest);

      // Test 3: Verify Customer Data
      const customerTest = await this.testCustomerData();
      results.push(customerTest);

      // Test 4: Verify Vendor Data
      const vendorTest = await this.testVendorData();
      results.push(vendorTest);

      // Test 5: Verify Sales Orders
      const salesTest = await this.testSalesOrders();
      results.push(salesTest);

      // Test 6: Verify Condition Types
      const conditionTest = await this.testConditionTypes();
      results.push(conditionTest);

      // Test 7: Verify Cost Breakdown
      const costTest = await this.testCostBreakdown();
      results.push(costTest);

      // Test 8: Verify Profit Analysis
      const profitTest = await this.testProfitAnalysis();
      results.push(profitTest);

      return results;
    } catch (error) {
      console.error('Error running Dominos cost tests:', error);
      return [{
        testId: 'ERROR',
        testName: 'Test Execution Error',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      }];
    }
  }

  private async testCompanyStructure(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT code, name, city, country, currency, created_at
        FROM company_codes WHERE code = 'DOM01'
      `);

      const company = result.rows[0];
      
      return {
        testId: 'COMP-001',
        testName: 'Company Structure Verification',
        status: company ? 'PASSED' : 'FAILED',
        details: {
          companyCode: company?.code,
          companyName: company?.name,
          location: `${company?.city}, ${company?.country}`,
          currency: company?.currency,
          createdAt: company?.created_at
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'COMP-001',
        testName: 'Company Structure Verification',
        status: 'FAILED',
        details: { error: error instanceof Error ? error.message : String(error) },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testPlantLocations(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT code, name, city, state, type, status
        FROM plants WHERE company_code = 'DOM01'
        ORDER BY code
      `);

      const plants = result.rows;
      const expectedPlants = ['DOM-NYC01', 'DOM-LA01', 'DOM-CHI01'];
      const actualPlants = plants.map(p => p.code);
      const allPlantsFound = expectedPlants.every(code => actualPlants.includes(code));

      return {
        testId: 'PLANT-001',
        testName: 'Plant Locations Verification',
        status: allPlantsFound ? 'PASSED' : 'FAILED',
        details: {
          expectedCount: 3,
          actualCount: plants.length,
          plants: plants.map(p => ({
            code: p.code,
            name: p.name,
            location: `${p.city}, ${p.state}`,
            type: p.type,
            status: p.status
          }))
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'PLANT-001',
        testName: 'Plant Locations Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testCustomerData(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT customer_code, name, type, industry, credit_limit, is_b2b, is_b2c
        FROM erp_customers 
        WHERE company_code_id = (SELECT id FROM company_codes WHERE code = 'DOM01')
        ORDER BY customer_code
      `);

      const customers = result.rows;
      const b2bCount = customers.filter(c => c.is_b2b).length;
      const b2cCount = customers.filter(c => c.is_b2c).length;

      return {
        testId: 'CUST-001',
        testName: 'Customer Data Verification',
        status: customers.length >= 4 ? 'PASSED' : 'FAILED',
        details: {
          totalCustomers: customers.length,
          b2bCustomers: b2bCount,
          b2cCustomers: b2cCount,
          customers: customers.map(c => ({
            code: c.customer_code,
            name: c.name,
            type: c.type,
            industry: c.industry,
            creditLimit: c.credit_limit,
            category: c.is_b2b ? 'B2B' : 'B2C'
          }))
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'CUST-001',
        testName: 'Customer Data Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testVendorData(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT vendor_code, name, type, industry, supplier_type, evaluation_score, lead_time
        FROM erp_vendors 
        WHERE company_code_id = (SELECT id FROM company_codes WHERE code = 'DOM01')
        ORDER BY vendor_code
      `);

      const vendors = result.rows;
      const criticalSuppliers = vendors.filter(v => v.supplier_type === 'Critical').length;

      return {
        testId: 'VEND-001',
        testName: 'Vendor Data Verification',
        status: vendors.length >= 4 ? 'PASSED' : 'FAILED',
        details: {
          totalVendors: vendors.length,
          criticalSuppliers: criticalSuppliers,
          avgEvaluationScore: vendors.reduce((sum, v) => sum + parseFloat(v.evaluation_score || '0'), 0) / vendors.length,
          vendors: vendors.map(v => ({
            code: v.vendor_code,
            name: v.name,
            type: v.type,
            industry: v.industry,
            supplierType: v.supplier_type,
            score: v.evaluation_score,
            leadTime: v.lead_time
          }))
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'VEND-001',
        testName: 'Vendor Data Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testSalesOrders(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT so.order_number, so.customer_name, so.order_date, so.status, 
               so.total_amount, so.payment_status, p.name as plant_name
        FROM sales_orders so
        JOIN plants p ON so.plant_id = p.id
        WHERE so.company_code_id = (SELECT id FROM company_codes WHERE code = 'DOM01')
        ORDER BY so.order_number
      `);

      const orders = result.rows;
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
      const paidOrders = orders.filter(o => o.payment_status === 'Paid').length;

      return {
        testId: 'SALES-001',
        testName: 'Sales Orders Verification',
        status: orders.length >= 4 ? 'PASSED' : 'FAILED',
        details: {
          totalOrders: orders.length,
          totalRevenue: totalRevenue,
          paidOrders: paidOrders,
          avgOrderValue: totalRevenue / orders.length,
          orders: orders.map(o => ({
            orderNumber: o.order_number,
            customer: o.customer_name,
            orderDate: o.order_date,
            status: o.status,
            amount: o.total_amount,
            paymentStatus: o.payment_status,
            plant: o.plant_name
          }))
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'SALES-001',
        testName: 'Sales Orders Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testConditionTypes(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT condition_code, condition_name, condition_category, calculation_type, description
        FROM condition_types 
        WHERE company_code_id = (SELECT id FROM company_codes WHERE code = 'DOM01')
        ORDER BY condition_code
      `);

      const conditions = result.rows;
      const expectedConditions = ['COST', 'DELV', 'DISC', 'OVHD', 'PR00', 'TAX1', 'TOPP'];
      const actualConditions = conditions.map(c => c.condition_code);
      const allConditionsFound = expectedConditions.every(code => actualConditions.includes(code));

      return {
        testId: 'COND-001',
        testName: 'Condition Types Verification',
        status: allConditionsFound ? 'PASSED' : 'FAILED',
        details: {
          expectedCount: expectedConditions.length,
          actualCount: conditions.length,
          missingConditions: expectedConditions.filter(code => !actualConditions.includes(code)),
          conditions: conditions.map(c => ({
            code: c.condition_code,
            name: c.condition_name,
            category: c.condition_category,
            calculationType: c.calculation_type,
            description: c.description
          }))
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'COND-001',
        testName: 'Condition Types Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testCostBreakdown(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT so.order_number, soc.condition_code, soc.condition_name,
               soc.base_amount, soc.condition_value, soc.condition_amount
        FROM sales_order_conditions soc
        JOIN sales_orders so ON soc.sales_order_id = so.id
        WHERE so.order_number IN ('DOM-SO-2024-001', 'DOM-SO-2024-004')
        ORDER BY so.order_number, soc.sequence_number
      `);

      const conditions = result.rows;
      const orderBreakdowns = {};
      
      conditions.forEach(c => {
        if (!orderBreakdowns[c.order_number]) {
          orderBreakdowns[c.order_number] = [];
        }
        orderBreakdowns[c.order_number].push({
          code: c.condition_code,
          name: c.condition_name,
          baseAmount: c.base_amount,
          conditionValue: c.condition_value,
          conditionAmount: c.condition_amount
        });
      });

      return {
        testId: 'COST-001',
        testName: 'Cost Breakdown Verification',
        status: conditions.length >= 10 ? 'PASSED' : 'FAILED',
        details: {
          totalConditions: conditions.length,
          ordersWithBreakdown: Object.keys(orderBreakdowns).length,
          orderBreakdowns: orderBreakdowns
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'COST-001',
        testName: 'Cost Breakdown Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async testProfitAnalysis(): Promise<DominosCostTestResult> {
    const startTime = Date.now();
    try {
      const result = await db.execute(`
        SELECT so.order_number, so.customer_name, so.total_amount,
               SUM(CASE WHEN soc.condition_code IN ('PR00', 'TOPP', 'DELV') THEN soc.condition_amount ELSE 0 END) as gross_revenue,
               SUM(CASE WHEN soc.condition_code IN ('COST', 'OVHD') THEN ABS(soc.condition_amount) ELSE 0 END) as total_costs,
               (so.total_amount - SUM(CASE WHEN soc.condition_code IN ('COST', 'OVHD') THEN ABS(soc.condition_amount) ELSE 0 END)) as gross_profit
        FROM sales_orders so
        JOIN sales_order_conditions soc ON so.id = soc.sales_order_id
        WHERE so.order_number IN ('DOM-SO-2024-001', 'DOM-SO-2024-004')
        GROUP BY so.order_number, so.customer_name, so.total_amount
        ORDER BY so.order_number
      `);

      const profitAnalysis = result.rows.map(row => ({
        orderNumber: row.order_number,
        customer: row.customer_name,
        totalAmount: parseFloat(row.total_amount),
        grossRevenue: parseFloat(row.gross_revenue),
        totalCosts: parseFloat(row.total_costs),
        grossProfit: parseFloat(row.gross_profit),
        profitMargin: (parseFloat(row.gross_profit) / parseFloat(row.total_amount)) * 100
      }));

      const avgProfitMargin = profitAnalysis.reduce((sum, p) => sum + p.profitMargin, 0) / profitAnalysis.length;

      return {
        testId: 'PROFIT-001',
        testName: 'Profit Analysis Verification',
        status: profitAnalysis.length >= 2 && avgProfitMargin > 0 ? 'PASSED' : 'FAILED',
        details: {
          ordersAnalyzed: profitAnalysis.length,
          avgProfitMargin: Math.round(avgProfitMargin * 100) / 100,
          profitAnalysis: profitAnalysis
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        testId: 'PROFIT-001',
        testName: 'Profit Analysis Verification',
        status: 'FAILED',
        details: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }
}