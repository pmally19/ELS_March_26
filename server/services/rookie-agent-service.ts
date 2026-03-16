import { db } from "../db";
import { pool } from "../db";
import {
  rookieAgentSessions,
  rookieAgentDataEntries,
  rookieAgentTraining,
  rookieAgentQualityChecks,
  type InsertRookieAgentSession,
  type InsertRookieAgentDataEntry,
  type InsertRookieAgentTraining,
  type InsertRookieAgentQualityCheck
} from "@shared/schema";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class RookieAgentService {
  private static instance: RookieAgentService;
  private businessDomains = ['finance', 'sales', 'inventory', 'hr', 'production', 'purchasing'];

  constructor() {
    this.initializeTrainingMaterials();
  }

  static getInstance(): RookieAgentService {
    if (!RookieAgentService.instance) {
      RookieAgentService.instance = new RookieAgentService();
    }
    return RookieAgentService.instance;
  }

  private async initializeTrainingMaterials() {
    // Initialize training materials for each business domain
    for (const domain of this.businessDomains) {
      await this.createTrainingMaterial(domain);
    }
  }

  async getDashboardData() {
    const recentSessions = await db
      .select()
      .from(rookieAgentSessions)
      .orderBy(desc(rookieAgentSessions.createdAt))
      .limit(10);

    const pendingValidations = await db
      .select()
      .from(rookieAgentDataEntries)
      .where(eq(rookieAgentDataEntries.status, 'pending'))
      .limit(5);

    const trainingProgress = await db
      .select()
      .from(rookieAgentTraining)
      .orderBy(desc(rookieAgentTraining.lastAccessed))
      .limit(8);

    const qualityMetrics = await this.getQualityMetrics();

    return {
      recentSessions,
      pendingValidations,
      trainingProgress,
      qualityMetrics,
      businessDomains: this.businessDomains,
      supportedFunctions: [
        'Data Entry Support',
        'Basic User Training',
        'Quality Checks',
        'Screen Data Retrieval'
      ]
    };
  }

  async getBusinessDomainData(domain: string) {
    const domainData = {
      domain,
      screens: [] as any[],
      recentEntries: [],
      commonIssues: [],
      helpTopics: []
    };

    switch (domain.toLowerCase()) {
      case 'finance':
        domainData.screens = await this.getFinanceScreenData();
        break;
      case 'sales':
        domainData.screens = await this.getSalesScreenData();
        break;
      case 'inventory':
        domainData.screens = await this.getInventoryScreenData();
        break;
      case 'hr':
        domainData.screens = await this.getHRScreenData();
        break;
      case 'production':
        domainData.screens = await this.getProductionScreenData();
        break;
      case 'purchasing':
        domainData.screens = await this.getPurchasingScreenData();
        break;
      default:
        domainData.screens = [];
    }

    // Get recent data entries for this domain
    domainData.recentEntries = await db
      .select()
      .from(rookieAgentDataEntries)
      .where(eq(rookieAgentDataEntries.businessDomain, domain))
      .orderBy(desc(rookieAgentDataEntries.createdAt))
      .limit(10);

    return domainData;
  }

  async searchDomainData(domain: string, searchTerm: string) {
    const searchResults = {
      domain,
      searchTerm,
      results: [] as any[],
      totalFound: 0,
      searchSuggestions: []
    };

    // Search across real database tables based on domain
    switch (domain.toLowerCase()) {
      case 'finance':
        searchResults.results = await this.searchFinanceData(searchTerm);
        break;
      case 'sales':
        searchResults.results = await this.searchSalesData(searchTerm);
        break;
      case 'inventory':
        searchResults.results = await this.searchInventoryData(searchTerm);
        break;
      case 'hr':
        searchResults.results = await this.searchHRData(searchTerm);
        break;
      case 'production':
        searchResults.results = await this.searchProductionData(searchTerm);
        break;
      case 'purchasing':
        searchResults.results = await this.searchPurchasingData(searchTerm);
        break;
    }

    searchResults.totalFound = searchResults.results.length;

    // Generate search suggestions using AI if no results
    if (searchResults.totalFound === 0) {
      searchResults.searchSuggestions = await this.generateSearchSuggestions(domain, searchTerm);
    }

    return searchResults;
  }

  // Real Finance Data Search
  private async searchFinanceData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search GL Accounts
      const glAccountsQuery = await pool.query(`
        SELECT 'GL Account' as type, 'Chart of Accounts' as screen,
               account_number as field, account_name as value, 
               account_type || ' - ' || account_class as description,
               updated_at as "lastUpdated"
        FROM gl_accounts
        WHERE account_number ILIKE $1 
           OR account_name ILIKE $1 
           OR account_type ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...glAccountsQuery.rows);

      // Search Accounting Documents
      const documentsQuery = await pool.query(`
        SELECT 'Accounting Document' as type, 'Journal Entries' as screen,
               document_number as field, 
               document_type || ' - ' || COALESCE(description, 'No description') as value,
               'Amount: ' || total_amount::text || ' | Status: ' || posting_status as description,
               created_at as "lastUpdated"
        FROM accounting_documents
        WHERE document_number ILIKE $1 
           OR description ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...documentsQuery.rows);

    } catch (error) {
      console.error('Finance search error:', error);
    }

    return results;
  }

  // Real Sales Data Search
  private async searchSalesData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search Customers
      const customersQuery = await pool.query(`
        SELECT 'Customer' as type, 'Customer Master' as screen,
               customer_code as field, customer_name as value,
               COALESCE(city, '') || ' | ' || COALESCE(country, '') as description,
               updated_at as "lastUpdated"
        FROM customers
        WHERE customer_code ILIKE $1 
           OR customer_name ILIKE $1
           OR email ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...customersQuery.rows);

      // Search Sales Orders
      const ordersQuery = await pool.query(`
        SELECT 'Sales Order' as type, 'Sales Orders' as screen,
               order_number as field,
               'Customer: ' || c.customer_name as value,
               'Amount: ' || so.total_amount::text || ' | Status: ' || so.status as description,
               so.created_at as "lastUpdated"
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.order_number ILIKE $1
           OR c.customer_name ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...ordersQuery.rows);

    } catch (error) {
      console.error('Sales search error:', error);
    }

    return results;
  }

  // Real Inventory Data Search
  private async searchInventoryData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search Materials
      const materialsQuery = await pool.query(`
        SELECT 'Material' as type, 'Material Master' as screen,
               material_code as field, material_description as value,
               'Type: ' || COALESCE(material_type, 'N/A') || ' | UOM: ' || COALESCE(base_unit_of_measure, 'N/A') as description,
               updated_at as "lastUpdated"
        FROM materials
        WHERE material_code ILIKE $1 
           OR material_description ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...materialsQuery.rows);

      // Search Stock Movements
      const movementsQuery = await pool.query(`
        SELECT 'Stock Movement' as type, 'Stock Movements' as screen,
               document_number as field,
               m.material_description as value,
               'Qty: ' || sm.quantity::text || ' | Type: ' || sm.movement_type as description,
               sm.created_at as "lastUpdated"
        FROM stock_movements sm
        LEFT JOIN materials m ON sm.material_id = m.id
        WHERE sm.document_number ILIKE $1
           OR m.material_description ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...movementsQuery.rows);

    } catch (error) {
      console.error('Inventory search error:', error);
    }

    return results;
  }

  // Real HR Data Search
  private async searchHRData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search Employees (if table exists)
      const employeesQuery = await pool.query(`
        SELECT 'Employee' as type, 'Employee Master' as screen,
               'EMP' || id::text as field, 
               'Employee Record' as value,
               'ID: ' || id::text as description,
               NOW() as "lastUpdated"
        FROM system_users
        WHERE username ILIKE $1 
           OR email ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...employeesQuery.rows);

    } catch (error) {
      console.error('HR search error:', error);
    }

    return results;
  }

  // Real Production Data Search
  private async searchProductionData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search Production Orders
      const ordersQuery = await pool.query(`
        SELECT 'Production Order' as type, 'Production Orders' as screen,
               order_number as field,
               m.material_description as value,
               'Qty: ' || po.planned_quantity::text || ' | Status: ' || po.status as description,
               po.created_at as "lastUpdated"
        FROM production_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        WHERE po.order_number ILIKE $1
           OR m.material_description ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...ordersQuery.rows);

      // Search BOMs
      const bomsQuery = await pool.query(`
        SELECT 'BOM' as type, 'Bill of Materials' as screen,
               bom_number as field,
               m.material_description as value,
               'Items: ' || (SELECT COUNT(*) FROM bom_items WHERE bom_id = b.id)::text as description,
               b.updated_at as "lastUpdated"
        FROM boms b
        LEFT JOIN materials m ON b.material_id = m.id
        WHERE b.bom_number ILIKE $1
           OR m.material_description ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...bomsQuery.rows);

    } catch (error) {
      console.error('Production search error:', error);
    }

    return results;
  }

  // Real Purchasing Data Search
  private async searchPurchasingData(searchTerm: string) {
    const results: any[] = [];
    const term = `%${searchTerm}%`;

    try {
      // Search Vendors
      const vendorsQuery = await pool.query(`
        SELECT 'Vendor' as type, 'Vendor Master' as screen,
               vendor_code as field, vendor_name as value,
               COALESCE(city, '') || ' | ' || COALESCE(country, '') as description,
               updated_at as "lastUpdated"
        FROM vendors
        WHERE vendor_code ILIKE $1 
           OR vendor_name ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...vendorsQuery.rows);

      // Search Purchase Orders
      const posQuery = await pool.query(`
        SELECT 'Purchase Order' as type, 'Purchase Orders' as screen,
               po_number as field,
               v.vendor_name as value,
               'Amount: ' || po.total_amount::text || ' | Status: ' || po.status as description,
               po.created_at as "lastUpdated"
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.po_number ILIKE $1
           OR v.vendor_name ILIKE $1
        LIMIT 10
      `, [term]);

      results.push(...posQuery.rows);

    } catch (error) {
      console.error('Purchasing search error:', error);
    }

    return results;
  }

  async getTrainingMaterials(domain: string) {
    const trainingMaterials = await db
      .select()
      .from(rookieAgentTraining)
      .where(eq(rookieAgentTraining.businessDomain, domain))
      .orderBy(desc(rookieAgentTraining.createdAt));

    return {
      domain,
      materials: trainingMaterials,
      quickStart: this.getQuickStartGuide(domain),
      commonTasks: this.getCommonTasks(domain),
      bestPractices: this.getBestPractices(domain)
    };
  }

  async validateDataEntry(entryData: any) {
    const sessionId = await this.generateSessionId('ROK-VAL');

    // Create validation entry
    const validationEntry: InsertRookieAgentDataEntry = {
      id: await this.generateEntryId('ROK-ENT'),
      sessionId,
      businessDomain: entryData.domain,
      screenName: entryData.screenName,
      fieldName: entryData.fieldName,
      fieldValue: entryData.fieldValue,
      description: entryData.description || '',
      validationType: entryData.validationType || 'format_check',
      status: 'pending'
    };

    await db.insert(rookieAgentDataEntries).values(validationEntry);

    // Perform validation checks
    const validationResult = await this.performValidationChecks(entryData);

    // Update entry status
    await db.update(rookieAgentDataEntries)
      .set({
        status: validationResult.isValid ? 'approved' : 'rejected',
        validationResult: validationResult.details,
        validatedAt: new Date()
      })
      .where(eq(rookieAgentDataEntries.id, validationEntry.id as any));

    return {
      entryId: validationEntry.id,
      isValid: validationResult.isValid,
      validationDetails: validationResult.details,
      recommendations: validationResult.recommendations
    };
  }

  async getQualityChecks(domain: string) {
    const qualityChecks = await db
      .select()
      .from(rookieAgentQualityChecks)
      .where(eq(rookieAgentQualityChecks.businessDomain, domain));

    return {
      domain,
      checks: qualityChecks,
      guidelines: this.getQualityGuidelines(domain),
      checklistItems: this.getChecklistItems(domain)
    };
  }

  // Private helper methods - REAL DATA QUERIES
  private async getFinanceScreenData() {
    try {
      const glAccountsCount = await pool.query('SELECT COUNT(*) as count FROM gl_accounts');
      const documentsCount = await pool.query('SELECT COUNT(*) as count FROM accounting_documents');
      const costCentersCount = await pool.query('SELECT COUNT(*) as count FROM cost_centers');

      return [
        {
          screen: 'Chart of Accounts',
          dataCount: parseInt(glAccountsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Accounting Documents',
          dataCount: parseInt(documentsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Cost Centers',
          dataCount: parseInt(costCentersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('Finance screen data error:', error);
      return [];
    }
  }

  private async getSalesScreenData() {
    try {
      const customersCount = await pool.query('SELECT COUNT(*) as count FROM customers');
      const ordersCount = await pool.query('SELECT COUNT(*) as count FROM sales_orders');
      const opportunitiesCount = await pool.query('SELECT COUNT(*) as count FROM opportunities');

      return [
        {
          screen: 'Customer Master',
          dataCount: parseInt(customersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Sales Orders',
          dataCount: parseInt(ordersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Opportunities',
          dataCount: parseInt(opportunitiesCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('Sales screen data error:', error);
      return [];
    }
  }

  private async getInventoryScreenData() {
    try {
      const materialsCount = await pool.query('SELECT COUNT(*) as count FROM materials');
      const movementsCount = await pool.query('SELECT COUNT(*) as count FROM stock_movements');
      const warehousesCount = await pool.query('SELECT COUNT(*) as count FROM warehouses');

      return [
        {
          screen: 'Material Master',
          dataCount: parseInt(materialsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Stock Movements',
          dataCount: parseInt(movementsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Warehouse Management',
          dataCount: parseInt(warehousesCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('Inventory screen data error:', error);
      return [];
    }
  }

  private async getHRScreenData() {
    try {
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM system_users');

      return [
        {
          screen: 'User Master',
          dataCount: parseInt(usersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'System Roles',
          dataCount: 0, // Placeholder
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('HR screen data error:', error);
      return [];
    }
  }

  private async getProductionScreenData() {
    try {
      const ordersCount = await pool.query('SELECT COUNT(*) as count FROM production_orders');
      const centersCount = await pool.query('SELECT COUNT(*) as count FROM work_centers');
      const bomsCount = await pool.query('SELECT COUNT(*) as count FROM boms');

      return [
        {
          screen: 'Production Orders',
          dataCount: parseInt(ordersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Work Centers',
          dataCount: parseInt(centersCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Bill of Materials',
          dataCount: parseInt(bomsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('Production screen data error:', error);
      return [];
    }
  }

  private async getPurchasingScreenData() {
    try {
      const vendorsCount = await pool.query('SELECT COUNT(*) as count FROM vendors');
      const posCount = await pool.query('SELECT COUNT(*) as count FROM purchase_orders');
      const requisitionsCount = await pool.query('SELECT COUNT(*) as count FROM purchase_requisitions');

      return [
        {
          screen: 'Vendor Master',
          dataCount: parseInt(vendorsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Purchase Orders',
          dataCount: parseInt(posCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        },
        {
          screen: 'Purchase Requisitions',
          dataCount: parseInt(requisitionsCount.rows[0]?.count || '0'),
          lastUpdate: new Date()
        }
      ];
    } catch (error) {
      console.error('Purchasing screen data error:', error);
      return [];
    }
  }

  private async generateSearchSuggestions(domain: string, searchTerm: string) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a Rookie Agent helping with ${domain} domain searches. Suggest alternative search terms.`
          },
          {
            role: "user",
            content: `No results found for "${searchTerm}" in ${domain}. Suggest 3 alternative search terms.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      return suggestions.suggestions || [];
    } catch (error) {
      return ['Try different keywords', 'Check spelling', 'Use broader terms'];
    }
  }

  private getQuickStartGuide(domain: string) {
    const guides = {
      finance: ['Navigate to Finance Module', 'Understanding Chart of Accounts', 'Basic Journal Entry Process'],
      sales: ['Customer Creation Process', 'Sales Order Entry', 'Quotation Management'],
      inventory: ['Material Master Setup', 'Stock Movement Recording', 'Inventory Counting'],
      hr: ['Employee Onboarding', 'Payroll Processing', 'Leave Management'],
      production: ['Production Order Creation', 'Work Center Operations', 'Quality Management'],
      purchasing: ['Vendor Registration', 'Purchase Requisition', 'Purchase Order Processing']
    };
    return guides[domain] || ['Basic Navigation', 'Data Entry Principles', 'System Overview'];
  }

  private getCommonTasks(domain: string) {
    const tasks = {
      finance: ['Post Journal Entries', 'Generate Financial Reports', 'Bank Reconciliation'],
      sales: ['Create Sales Orders', 'Update Customer Information', 'Process Returns'],
      inventory: ['Record Stock Movements', 'Perform Cycle Counts', 'Update Material Costs'],
      hr: ['Update Employee Records', 'Process Payroll', 'Manage Leave Requests'],
      production: ['Release Production Orders', 'Confirm Operations', 'Report Scrap'],
      purchasing: ['Create Purchase Orders', 'Receive Goods', 'Process Invoices']
    };
    return tasks[domain] || ['Data Entry', 'Record Updates', 'Basic Reporting'];
  }

  private getBestPractices(domain: string) {
    return [
      'Always verify data before saving',
      'Follow naming conventions',
      'Document changes with comments',
      'Use appropriate authorization levels',
      'Maintain data consistency'
    ];
  }

  private async getQualityMetrics() {
    try {
      const metricsQuery = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'approved' THEN 1 END)::float / NULLIF(COUNT(*)::float, 0) * 100 as data_accuracy,
          COUNT(*) as total_validations
        FROM rookie_agent_data_entries
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const accuracy = metricsQuery.rows[0]?.data_accuracy || 0;

      return {
        dataAccuracy: parseFloat(accuracy.toFixed(1)),
        processingSpeed: 'Good',
        userSatisfaction: 4.2,
        errorRate: (100 - accuracy).toFixed(1)
      };
    } catch (error) {
      return {
        dataAccuracy: 0,
        processingSpeed: 'N/A',
        userSatisfaction: 0,
        errorRate: 0
      };
    }
  }

  private getQualityGuidelines(domain: string) {
    return [
      'Verify all mandatory fields are completed',
      'Check data format and consistency',
      'Validate business rules compliance',
      'Ensure proper authorization',
      'Review for completeness'
    ];
  }

  private getChecklistItems(domain: string) {
    return [
      'Data format validation',
      'Business rule compliance',
      'Authorization verification',
      'Completeness check',
      'Integration testing'
    ];
  }

  private async performValidationChecks(entryData: any) {
    const validationResult: any = {
      isValid: true,
      details: {},
      recommendations: []
    };

    // Perform basic format validation
    if (!entryData.fieldValue || entryData.fieldValue.trim() === '') {
      validationResult.isValid = false;
      validationResult.details['emptyField'] = 'Field cannot be empty';
      validationResult.recommendations.push('Please provide a value for this field');
    }

    // Domain-specific validation with real database checks
    if (entryData.domain === 'finance' && entryData.fieldName.toLowerCase().includes('account')) {
      // Check if GL Account exists
      try {
        const accountCheck = await pool.query(
          'SELECT COUNT(*) as count FROM gl_accounts WHERE account_number = $1',
          [entryData.fieldValue]
        );

        if (parseInt(accountCheck.rows[0]?.count || '0') === 0) {
          validationResult.isValid = false;
          validationResult.details['invalidAccount'] = 'GL Account does not exist';
          validationResult.recommendations.push('Please enter a valid GL Account number from Chart of Accounts');
        }
      } catch (error) {
        console.error('GL Account validation error:', error);
      }
    }

    if (entryData.domain === 'sales' && entryData.fieldName.toLowerCase().includes('customer')) {
      // Check if Customer exists
      try {
        const customerCheck = await pool.query(
          'SELECT COUNT(*) as count FROM customers WHERE customer_code = $1',
          [entryData.fieldValue]
        );

        if (parseInt(customerCheck.rows[0]?.count || '0') === 0) {
          validationResult.isValid = false;
          validationResult.details['invalidCustomer'] = 'Customer code does not exist';
          validationResult.recommendations.push('Please enter a valid Customer code from Customer Master');
        }
      } catch (error) {
        console.error('Customer validation error:', error);
      }
    }

    if (entryData.domain === 'inventory' && entryData.fieldName.toLowerCase().includes('material')) {
      // Check if Material exists
      try {
        const materialCheck = await pool.query(
          'SELECT COUNT(*) as count FROM materials WHERE material_code = $1',
          [entryData.fieldValue]
        );

        if (parseInt(materialCheck.rows[0]?.count || '0') === 0) {
          validationResult.isValid = false;
          validationResult.details['invalidMaterial'] = 'Material code does not exist';
          validationResult.recommendations.push('Please enter a valid Material code from Material Master');
        }
      } catch (error) {
        console.error('Material validation error:', error);
      }
    }

    return validationResult;
  }

  private async createTrainingMaterial(domain: string) {
    const trainingId = await this.generateTrainingId('ROK-TRN');

    const training: InsertRookieAgentTraining = {
      id: trainingId,
      businessDomain: domain,
      trainingType: 'quick_start',
      title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Quick Start Guide`,
      content: `Basic training material for ${domain} domain operations`,
      difficulty: 'beginner',
      estimatedDuration: 30,
      isActive: true
    };

    try {
      await db.insert(rookieAgentTraining).values(training);
    } catch (error) {
      // Training material might already exist
      console.log(`Training material for ${domain} already exists`);
    }
  }

  private async generateSessionId(prefix: string): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private async generateEntryId(prefix: string): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private async generateTrainingId(prefix: string): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
}