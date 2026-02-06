import { db } from '../db';
import { chiefAgentPermissions } from '../../shared/chief-agent-permissions-schema';
import { eq } from 'drizzle-orm';

export class ChiefAgentPermissionsService {
  private static instance: ChiefAgentPermissionsService;

  static getInstance(): ChiefAgentPermissionsService {
    if (!ChiefAgentPermissionsService.instance) {
      ChiefAgentPermissionsService.instance = new ChiefAgentPermissionsService();
    }
    return ChiefAgentPermissionsService.instance;
  }

  // Initialize Chief Agent permissions with default business rules
  async initializeChiefAgentPermissions() {
    try {
      const existing = await db.select().from(chiefAgentPermissions).limit(1);
      
      if (existing.length === 0) {
        await db.insert(chiefAgentPermissions).values({
          agent_id: 'chief-agent-001',
          agent_name: 'Chief Agent',
          role: 'chief',
          // CREATE permissions - ALL TRUE (can create all business data)
          can_create_vendors: true,
          can_create_customers: true,
          can_create_materials: true,
          can_create_sales_orders: true,
          can_create_fi_postings: true,
          can_create_gl_accounts: true,
          can_create_cost_centers: true,
          can_create_plants: true,
          can_create_company_codes: true,
          can_create_employees: true,
          can_create_invoices: true,
          can_create_journal_entries: true,
          can_create_payments: true,
          can_create_receipts: true,
          can_create_inventory_transactions: true,
          can_create_production_orders: true,
          can_create_purchase_orders: true,
          can_create_work_centers: true,
          can_create_bom: true,
          can_create_any_business_data: true,
          // READ permissions - ALL TRUE
          can_read_all_data: true,
          can_read_financial_data: true,
          can_read_master_data: true,
          can_read_transactional_data: true,
          // UPDATE permissions - LIMITED TRUE (business data only)
          can_update_master_data: true,
          can_update_vendor_details: true,
          can_update_customer_details: true,
          can_update_product_details: true,
          can_update_order_status: true,
          can_update_pricing: true,
          can_update_approval_levels: true,
          can_update_inventory_levels: true,
          // FORBIDDEN permissions - ALL FALSE
          can_delete_any_data: false,
          can_modify_ui: false,
          can_modify_system_config: false,
          can_modify_permissions: false,
          can_access_system_logs: false,
          can_modify_database: false,
          can_view_dashboards: true
        });
      }
    } catch (error) {
      console.error("Error initializing Chief Agent permissions:", error);
    }
  }

  // Get Chief Agent permissions
  async getChiefAgentPermissions() {
    try {
      const [permissions] = await db.select().from(chiefAgentPermissions).limit(1);
      return permissions || null;
    } catch (error) {
      console.error("Error fetching Chief Agent permissions:", error);
      return null;
    }
  }

  // Check if Chief Agent can perform specific action - CORE BUSINESS LOGIC
  async canPerformAction(actionType: string, entityType: string): Promise<boolean> {
    const action = actionType.toLowerCase();
    
    // CRITICAL BUSINESS RULE: Chief Agent CANNOT DELETE anything
    if (action === 'delete') {
      return false;
    }

    // CRITICAL BUSINESS RULE: Chief Agent CAN CREATE all business data
    if (action === 'create') {
      return true;
    }

    // Allow READ operations
    if (action === 'read' || action === 'view') {
      return true;
    }

    // Allow UPDATE operations on business data
    if (action === 'update') {
      return true;
    }

    // Block system modification operations
    if (action === 'modify_ui' || action === 'modify_config' || 
        action === 'manage_permissions' || action === 'access_logs' || 
        action === 'modify_database') {
      return false;
    }

    // Default deny for unknown operations
    return false;
  }

  // Get comprehensive capabilities report
  async getCapabilities() {
    return {
      description: "Chief Agent is designed for comprehensive business data creation and management",
      primaryFunction: "CREATE all types of business data for ERP operations",
      dataCreationAccess: [
        "Vendors and Suppliers",
        "Customers and Clients", 
        "Sales Orders and Quotations",
        "Purchase Orders and Requisitions",
        "Materials and Products",
        "General Ledger Accounts",
        "Cost Centers and Profit Centers",
        "Plants and Storage Locations",
        "Company Codes and Organizations",
        "Employees and HR Data",
        "Invoices and Billing",
        "Journal Entries and Postings",
        "Payments and Receipts",
        "Inventory Transactions",
        "Production Orders",
        "Bills of Materials",
        "Work Centers"
      ],
      readAccess: "Full access to all data and financial reports",
      updateAccess: "Limited to business data updates (no system changes)",
      restrictions: [
        "NO DELETE operations on any data",
        "NO UI modifications or system configuration changes", 
        "NO user management or permission changes",
        "NO direct database structure modifications"
      ],
      allowedOperations: [],
      forbiddenOperations: [
        "DELETE_ANY_DATA",
        "MODIFY_UI", 
        "CHANGE_SYSTEM_CONFIG",
        "MANAGE_USERS",
        "MODIFY_PERMISSIONS",
        "ACCESS_SYSTEM_LOGS",
        "MODIFY_DATABASE"
      ]
    };
  }

  // Get list of allowed operations based on permissions
  async getAllowedOperations() {
    try {
      const permissions = await this.getChiefAgentPermissions();
      
      return {
        allowedOperations: [],
        forbiddenOperations: [
          "DELETE_ANY_DATA",
          "MODIFY_UI",
          "CHANGE_SYSTEM_CONFIG", 
          "MANAGE_USERS",
          "MODIFY_PERMISSIONS",
          "ACCESS_SYSTEM_LOGS",
          "MODIFY_DATABASE"
        ],
        summary: {
          canCreate: "ALL business data (vendors, customers, orders, materials, etc.)",
          canRead: "ALL data and reports",
          canUpdate: "Limited business data updates (details, status, levels, prices)",
          cannotDelete: "ANY data (completely forbidden)",
          cannotModify: "UI, system configuration, permissions, database structure"
        }
      };
    } catch (error) {
      console.error("Error fetching allowed operations:", error);
      return {
        allowedOperations: [],
        forbiddenOperations: ["DELETE_ANY_DATA", "MODIFY_UI", "CHANGE_SYSTEM_CONFIG"],
        summary: { error: "Unable to fetch permissions" }
      };
    }
  }
}

export const chiefAgentPermissionsService = ChiefAgentPermissionsService.getInstance();