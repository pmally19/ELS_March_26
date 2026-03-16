import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
// Chief Agent Permissions Configuration
export var chiefAgentPermissions = pgTable("chief_agent_permissions", {
    id: text("id").primaryKey().default("chief-agent-001"),
    agentRole: text("agent_role").notNull().default("chief"),
    // Data Creation Permissions (ALL ENABLED for Chief Agent)
    canCreateVendors: boolean("can_create_vendors").notNull().default(true),
    canCreateCustomers: boolean("can_create_customers").notNull().default(true),
    canCreateSalesOrders: boolean("can_create_sales_orders").notNull().default(true),
    canCreatePurchaseOrders: boolean("can_create_purchase_orders").notNull().default(true),
    canCreateMaterials: boolean("can_create_materials").notNull().default(true),
    canCreateGLAccounts: boolean("can_create_gl_accounts").notNull().default(true),
    canCreateCostCenters: boolean("can_create_cost_centers").notNull().default(true),
    canCreatePlants: boolean("can_create_plants").notNull().default(true),
    canCreateCompanyCodes: boolean("can_create_company_codes").notNull().default(true),
    canCreateEmployees: boolean("can_create_employees").notNull().default(true),
    canCreateInvoices: boolean("can_create_invoices").notNull().default(true),
    canCreateJournalEntries: boolean("can_create_journal_entries").notNull().default(true),
    canCreatePayments: boolean("can_create_payments").notNull().default(true),
    canCreateReceipts: boolean("can_create_receipts").notNull().default(true),
    canCreateInventoryTransactions: boolean("can_create_inventory_transactions").notNull().default(true),
    canCreateProductionOrders: boolean("can_create_production_orders").notNull().default(true),
    canCreateBOM: boolean("can_create_bom").notNull().default(true),
    canCreateWorkCenters: boolean("can_create_work_centers").notNull().default(true),
    // Data Read Permissions (ALL ENABLED)
    canReadAllData: boolean("can_read_all_data").notNull().default(true),
    canViewFinancialReports: boolean("can_view_financial_reports").notNull().default(true),
    canViewDashboards: boolean("can_view_dashboards").notNull().default(true),
    // Data Update Permissions (LIMITED - only business data, not system config)
    canUpdateVendorDetails: boolean("can_update_vendor_details").notNull().default(true),
    canUpdateCustomerDetails: boolean("can_update_customer_details").notNull().default(true),
    canUpdateOrderStatus: boolean("can_update_order_status").notNull().default(true),
    canUpdateInventoryLevels: boolean("can_update_inventory_levels").notNull().default(true),
    canUpdatePrices: boolean("can_update_prices").notNull().default(true),
    // Data Delete Permissions (ALL DISABLED for Chief Agent)
    canDeleteVendors: boolean("can_delete_vendors").notNull().default(false),
    canDeleteCustomers: boolean("can_delete_customers").notNull().default(false),
    canDeleteOrders: boolean("can_delete_orders").notNull().default(false),
    canDeleteMaterials: boolean("can_delete_materials").notNull().default(false),
    canDeleteFinancialData: boolean("can_delete_financial_data").notNull().default(false),
    canDeleteMasterData: boolean("can_delete_master_data").notNull().default(false),
    // UI and System Permissions (ALL DISABLED for Chief Agent)
    canModifyUI: boolean("can_modify_ui").notNull().default(false),
    canChangeSystemConfig: boolean("can_change_system_config").notNull().default(false),
    canManageUsers: boolean("can_manage_users").notNull().default(false),
    canModifyPermissions: boolean("can_modify_permissions").notNull().default(false),
    canAccessSystemLogs: boolean("can_access_system_logs").notNull().default(false),
    canModifyDatabase: boolean("can_modify_database").notNull().default(false),
    // Special Chief Agent Capabilities
    canCreateAnyBusinessData: boolean("can_create_any_business_data").notNull().default(true),
    canInitiateWorkflows: boolean("can_initiate_workflows").notNull().default(true),
    canGenerateReports: boolean("can_generate_reports").notNull().default(true),
    canBulkDataOperations: boolean("can_bulk_data_operations").notNull().default(true),
    // Audit fields
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    // Configuration metadata
    permissionNotes: text("permission_notes").default("Chief Agent has full CREATE access for all business data, NO DELETE or UI modification rights"),
    restrictions: jsonb("restrictions").default({
        forbidden_operations: ["DELETE", "UI_MODIFY", "SYSTEM_CONFIG"],
        allowed_operations: ["CREATE", "READ", "UPDATE_BUSINESS_DATA"],
        special_notes: "Chief Agent is designed for business data creation and management only"
    })
});
// Chief Agent Action Log - track what the Chief Agent creates/modifies
export var chiefAgentActionLog = pgTable("chief_agent_action_log", {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull().default("chief-agent-001"),
    actionType: text("action_type").notNull(), // CREATE, READ, UPDATE
    entityType: text("entity_type").notNull(), // vendor, customer, sales_order, etc.
    entityId: text("entity_id"),
    actionDescription: text("action_description").notNull(),
    requestData: jsonb("request_data"),
    responseData: jsonb("response_data"),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    userContext: text("user_context"), // What user requested this action
    businessJustification: text("business_justification")
});
// Schema exports
export var insertChiefAgentPermissionsSchema = createInsertSchema(chiefAgentPermissions);
export var insertChiefAgentActionLogSchema = createInsertSchema(chiefAgentActionLog);
