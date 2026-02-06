/**
 * Tile Numbering System with Role-Based Access
 * Provides unique numbers for each tile and workspace management
 */

export interface TileConfig {
  id: string;
  number: string; // Unique 3-digit number
  title: string;
  category: string;
  description: string;
  route: string;
  icon: string;
  requiredRoles: string[];
  moduleGroup: string;
  isActive: boolean;
  alphabeticPrefix: string;
  processSequence?: number;
  isCustomized?: boolean;
  businessProcess?: string;
  functionalArea?: string;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  description: string;
  userId: string;
  tiles: string[]; // Array of tile IDs
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TILE_CATALOG: TileConfig[] = [
  // A - Master Data (Organizational Setup) - Process sequence 001-099
  {
    id: "company-code",
    number: "A001",
    title: "Company Code",
    category: "Master Data",
    description: "Organizational unit for legal reporting - First step in organizational setup",
    route: "/master-data/company-code",
    icon: "Building",
    requiredRoles: ["admin", "master_data_manager"],
    moduleGroup: "organizational",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Organizational Setup",
    functionalArea: "Master Data"
  },
  {
    id: "chart-of-accounts",
    number: "A002",
    title: "Chart of Accounts",
    category: "Master Data",
    description: "Financial account structure - Foundation for GL postings",
    route: "/master-data/chart-of-accounts",
    icon: "BookOpen",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "gl-account-groups",
    number: "A007",
    title: "GL Account Groups",
    category: "Master Data",
    description: "Classify and control General Ledger account creation rules and number assignments",
    route: "/master-data/gl-account-groups",
    icon: "BookOpen",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 7,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "credit-control-area",
    number: "A005",
    title: "Credit Control Area",
    category: "Master Data",
    description: "Credit management and customer risk assessment parameters",
    route: "/master-data/credit-control-area",
    icon: "CreditCard",
    requiredRoles: ["admin", "finance_manager", "credit_analyst"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 5,
    isCustomized: false,
    businessProcess: "Credit Management Setup",
    functionalArea: "Master Data"
  },
  {
    id: "fiscal-year-variant",
    number: "A006",
    title: "Fiscal Year Variant",
    category: "Master Data",
    description: "Fiscal year calendar and period structure definition",
    route: "/master-data/fiscal-year-variant",
    icon: "Calendar",
    requiredRoles: ["admin", "finance_manager"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 6,
    isCustomized: false,
    businessProcess: "Financial Calendar Setup",
    functionalArea: "Master Data"
  },
  {
    id: "posting-period-controls",
    number: "A008",
    title: "Posting Period Controls",
    category: "Master Data",
    description: "Control when transactions can be posted to the general ledger",
    route: "/master-data/posting-period-controls",
    icon: "Calendar",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 8,
    isCustomized: false,
    businessProcess: "Financial Control Setup",
    functionalArea: "Master Data"
  },
  {
    id: "retained-earnings-accounts",
    number: "A009",
    title: "Retained Earnings Accounts",
    category: "Master Data",
    description: "Configure accounts for carrying forward profit/loss between fiscal years",
    route: "/master-data/retained-earnings-accounts",
    icon: "TrendingUp",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 9,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "chart-of-depreciation",
    number: "A010",
    title: "Chart of Depreciation",
    category: "Master Data",
    description: "Depreciation rules and methods for fixed assets",
    route: "/master-data/chart-of-depreciation",
    icon: "TrendingDown",
    requiredRoles: ["admin", "finance_manager", "asset_accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 10,
    isCustomized: false,
    businessProcess: "Asset Management Setup",
    functionalArea: "Master Data"
  },
  {
    id: "account-types",
    number: "A011",
    title: "Account Types",
    category: "Master Data",
    description: "Master data for account type classification used in document types",
    route: "/master-data/account-types",
    icon: "FileText",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 11,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "accounting-principles",
    number: "A013",
    title: "Accounting Principles",
    category: "Master Data",
    description: "Manage accounting standards and principles for financial reporting (IFRS, US GAAP, etc.)",
    route: "/master-data/accounting-principles",
    icon: "FileText",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 13,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "tolerance-groups",
    number: "A014",
    title: "Tolerance Groups",
    category: "Master Data",
    description: "Manage posting tolerance limits for financial document processing",
    route: "/master-data/tolerance-groups",
    icon: "Shield",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 14,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
    icon: "FileText",
    requiredRoles: ["admin", "master_data_manager"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 11,
    isCustomized: false,
    businessProcess: "Master Data Setup",
    functionalArea: "Master Data"
  },
  {
    id: "ledgers",
    number: "A012",
    title: "Ledgers",
    category: "Master Data",
    description: "Accounting books for parallel accounting and reporting (e.g., different accounting standards)",
    route: "/master-data/ledgers",
    icon: "BookOpen",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 12,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "global-company-code",
    number: "A007",
    title: "Global Company Code",
    category: "Master Data",
    description: "Global consolidation and reporting company structure",
    route: "/master-data/global-company-code",
    icon: "Globe",
    requiredRoles: ["admin", "finance_manager", "consolidation_manager"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 7,
    isCustomized: false,
    businessProcess: "Global Consolidation Setup",
    functionalArea: "Master Data"
  },
  {
    id: "vat-registration",
    number: "A008",
    title: "VAT Registration",
    category: "Master Data",
    description: "Tax registration numbers and compliance settings",
    route: "/master-data/vat-registration",
    icon: "FileText",
    requiredRoles: ["admin", "finance_manager", "tax_specialist"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 8,
    isCustomized: false,
    businessProcess: "Tax Compliance Setup",
    functionalArea: "Master Data"
  },
  {
    id: "plant",
    number: "A003", 
    title: "Plant",
    category: "Master Data",
    description: "Manufacturing and storage locations - Third step in setup",
    route: "/master-data/plant",
    icon: "Factory",
    requiredRoles: ["admin", "master_data_manager", "plant_manager"],
    moduleGroup: "organizational",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 3,
    isCustomized: false,
    businessProcess: "Organizational Setup",
    functionalArea: "Master Data"
  },
  {
    id: "storage-location",
    number: "A004",
    title: "Storage Location",
    category: "Master Data", 
    description: "Warehouse storage areas - Fourth step after plant setup",
    route: "/master-data/storage-location",
    icon: "Package",
    requiredRoles: ["admin", "master_data_manager", "warehouse_manager"],
    moduleGroup: "organizational",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 4,
    isCustomized: false,
    businessProcess: "Organizational Setup",
    functionalArea: "Master Data"
  },
  {
    id: "gl-accounts",
    number: "A005",
    title: "GL Accounts",
    category: "Master Data",
    description: "General ledger accounts - Fifth step after chart of accounts",
    route: "/master-data/gl-accounts",
    icon: "BookOpen",
    requiredRoles: ["admin", "finance_manager", "accountant"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 5,
    isCustomized: false,
    businessProcess: "Financial Setup",
    functionalArea: "Master Data"
  },
  {
    id: "cost-centers",
    number: "A006",
    title: "Cost Centers",
    category: "Master Data",
    description: "Organizational units for cost allocation - Sixth step in setup",
    route: "/master-data/cost-centers", 
    icon: "BarChart2",
    requiredRoles: ["admin", "finance_manager", "controlling_manager"],
    moduleGroup: "controlling",
    isActive: true,
    alphabeticPrefix: "A",
    processSequence: 6,
    isCustomized: false,
    businessProcess: "Controlling Setup",
    functionalArea: "Master Data"
  },

  // B - Business Partner Master Data - Process sequence 001-099
  {
    id: "customer",
    number: "B001",
    title: "Customer Master",
    category: "Master Data",
    description: "Customer information and preferences - First step in partner setup",
    route: "/master-data/customer",
    icon: "Users",
    requiredRoles: ["admin", "master_data_manager", "sales_manager"],
    moduleGroup: "core",
    isActive: true,
    alphabeticPrefix: "B",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Business Partner Setup",
    functionalArea: "Master Data"
  },
  {
    id: "vendor",
    number: "B002",
    title: "Vendor Master",
    category: "Master Data",
    description: "Supplier and vendor information - Second step in partner setup",
    route: "/master-data/vendor",
    icon: "Building",
    requiredRoles: ["admin", "master_data_manager", "procurement_manager"],
    moduleGroup: "core",
    isActive: true,
    alphabeticPrefix: "B",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Business Partner Setup",
    functionalArea: "Master Data"
  },

  // C - Material Master Data - Process sequence 001-099
  {
    id: "material",
    number: "C001",
    title: "Material Master",
    category: "Master Data",
    description: "Product and material information - First step in material setup",
    route: "/master-data/material",
    icon: "Package2",
    requiredRoles: ["admin", "master_data_manager", "material_manager"],
    moduleGroup: "core",
    isActive: true,
    alphabeticPrefix: "C",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Material Master Setup",
    functionalArea: "Master Data"
  },

  // S - Sales Process - Process sequence 001-099
  {
    id: "sales-order",
    number: "S001",
    title: "Sales Order",
    category: "Transactions",
    description: "Customer order processing - First step in sales process",
    route: "/transactions/sales-order",
    icon: "ShoppingCart",
    requiredRoles: ["admin", "sales_manager", "sales_rep"],
    moduleGroup: "sales",
    isActive: true,
    alphabeticPrefix: "S",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Sales Process",
    functionalArea: "Transactions"
  },
  {
    id: "delivery",
    number: "S002",
    title: "Delivery",
    category: "Transactions",
    description: "Goods delivery to customer - Second step after sales order",
    route: "/transactions/delivery",
    icon: "Truck",
    requiredRoles: ["admin", "sales_manager", "warehouse_manager"],
    moduleGroup: "sales",
    isActive: true,
    alphabeticPrefix: "S",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Sales Process",
    functionalArea: "Transactions"
  },
  {
    id: "billing",
    number: "S003",
    title: "Billing",
    category: "Transactions",
    description: "Customer invoice generation - Third step after delivery",
    route: "/transactions/billing",
    icon: "FileText",
    requiredRoles: ["admin", "finance_manager", "billing_clerk"],
    moduleGroup: "sales",
    isActive: true,
    alphabeticPrefix: "S",
    processSequence: 3,
    isCustomized: false,
    businessProcess: "Sales Process",
    functionalArea: "Transactions"
  },

  // P - Procurement Process - Process sequence 001-099
  {
    id: "purchase-order",
    number: "P001",
    title: "Purchase Order", 
    category: "Transactions",
    description: "Supplier order management - First step in procurement",
    route: "/transactions/purchase-order",
    icon: "ShoppingBag",
    requiredRoles: ["admin", "procurement_manager", "buyer"],
    moduleGroup: "procurement",
    isActive: true,
    alphabeticPrefix: "P",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Procurement Process",
    functionalArea: "Transactions"
  },
  {
    id: "goods-receipt",
    number: "P002",
    title: "Goods Receipt",
    category: "Transactions", 
    description: "Incoming material processing - Second step after PO",
    route: "/transactions/goods-receipt",
    icon: "Package",
    requiredRoles: ["admin", "warehouse_manager", "warehouse_clerk"],
    moduleGroup: "procurement",
    isActive: true,
    alphabeticPrefix: "P",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Procurement Process",
    functionalArea: "Transactions"
  },
  {
    id: "invoice-verification",
    number: "P003",
    title: "Invoice Verification",
    category: "Transactions",
    description: "Vendor invoice verification - Third step after goods receipt",
    route: "/transactions/invoice-verification",
    icon: "CheckCircle",
    requiredRoles: ["admin", "finance_manager", "ap_clerk"],
    moduleGroup: "procurement",
    isActive: true,
    alphabeticPrefix: "P",
    processSequence: 3,
    isCustomized: false,
    businessProcess: "Procurement Process",
    functionalArea: "Transactions"
  },

  // F - Finance Process - Process sequence 001-099
  {
    id: "accounts-payable",
    number: "F001",
    title: "Accounts Payable",
    category: "Transactions",
    description: "Vendor invoice processing and payments - First step in AP",
    route: "/transactions/accounts-payable",
    icon: "CreditCard",
    requiredRoles: ["admin", "finance_manager", "ap_clerk"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "F",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Finance Process",
    functionalArea: "Transactions"
  },
  {
    id: "accounts-receivable", 
    number: "F002",
    title: "Accounts Receivable",
    category: "Transactions",
    description: "Customer billing and collections - First step in AR",
    route: "/transactions/accounts-receivable",
    icon: "DollarSign",
    requiredRoles: ["admin", "finance_manager", "ar_clerk"],
    moduleGroup: "finance", 
    isActive: true,
    alphabeticPrefix: "F",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Finance Process",
    functionalArea: "Transactions"
  },
  {
    id: "payment-processing",
    number: "F003",
    title: "Payment Processing",
    category: "Transactions",
    description: "Payment execution and management - Third step in finance",
    route: "/transactions/payment-processing", 
    icon: "CreditCard",
    requiredRoles: ["admin", "finance_manager", "payment_clerk"],
    moduleGroup: "finance",
    isActive: true,
    alphabeticPrefix: "F",
    processSequence: 3,
    isCustomized: false,
    businessProcess: "Finance Process",
    functionalArea: "Transactions"
  },

  // I - Inventory Management - Process sequence 001-099
  {
    id: "goods-issue",
    number: "I001",
    title: "Goods Issue",
    category: "Transactions",
    description: "Outgoing material processing - First step in inventory movement", 
    route: "/transactions/goods-issue",
    icon: "Package",
    requiredRoles: ["admin", "warehouse_manager", "warehouse_clerk"],
    moduleGroup: "inventory",
    isActive: true,
    alphabeticPrefix: "I",
    processSequence: 1,
    isCustomized: false,
    businessProcess: "Inventory Management",
    functionalArea: "Transactions"
  },
  {
    id: "stock-transfer",
    number: "I002",
    title: "Stock Transfer",
    category: "Transactions",
    description: "Material movement between locations - Second step in inventory",
    route: "/transactions/stock-transfer",
    icon: "ArrowRightLeft",
    requiredRoles: ["admin", "warehouse_manager", "warehouse_clerk"],
    moduleGroup: "inventory",
    isActive: true,
    alphabeticPrefix: "I",
    processSequence: 2,
    isCustomized: false,
    businessProcess: "Inventory Management",
    functionalArea: "Transactions"
  },

  // Customized versions use AC, BC, SC, PC, FC, IC prefixes
  {
    id: "sales-order-custom",
    number: "SC001",
    title: "Sales Order (Custom)",
    category: "Transactions",
    description: "Customized sales order process with additional validations",
    route: "/transactions/sales-order-custom",
    icon: "ShoppingCart",
    requiredRoles: ["admin", "sales_manager"],
    moduleGroup: "sales",
    isActive: true,
    alphabeticPrefix: "SC",
    processSequence: 1,
    isCustomized: true,
    businessProcess: "Sales Process",
    functionalArea: "Transactions"
  },
  {
    id: "purchase-order-custom",
    number: "PC001",
    title: "Purchase Order (Custom)",
    category: "Transactions",
    description: "Enhanced purchase order with approval workflow",
    route: "/transactions/purchase-order-custom",
    icon: "ShoppingBag",
    requiredRoles: ["admin", "procurement_manager"],
    moduleGroup: "procurement",
    isActive: true,
    alphabeticPrefix: "PC",
    processSequence: 1,
    isCustomized: true,
    businessProcess: "Procurement Process",
    functionalArea: "Transactions"
  }
];

export const DEFAULT_WORKSPACES = {
  FINANCE_MANAGER: {
    name: "Finance Manager Workspace",
    tiles: ["A002", "A005", "A006", "F001", "F002", "F003", "P003"]
  },
  SALES_MANAGER: {
    name: "Sales Manager Workspace", 
    tiles: ["B001", "S001", "S002", "S003", "SC001"]
  },
  PROCUREMENT_MANAGER: {
    name: "Procurement Manager Workspace",
    tiles: ["B002", "P001", "P002", "P003", "PC001"]
  },
  WAREHOUSE_MANAGER: {
    name: "Warehouse Manager Workspace",
    tiles: ["A004", "P002", "I001", "I002"]
  },
  MASTER_DATA_MANAGER: {
    name: "Master Data Manager Workspace",
    tiles: ["A001", "A002", "A003", "A004", "A005", "A006", "B001", "B002", "C001"]
  },
  ADMIN: {
    name: "Administrator Workspace",
    tiles: TILE_CATALOG.map(tile => tile.number)
  }
};

/**
 * TILE NUMBERING SYSTEM DOCUMENTATION
 * ===================================
 * 
 * Purpose: Provides unique alphabetic + 3-digit identifiers for all ERP tiles
 * based on business process sequence and functional relationships.
 * 
 * NAMING CONVENTION:
 * [ALPHABET PREFIX][3-DIGIT NUMBER]
 * 
 * ALPHABET PREFIXES:
 * A - Master Data (Organizational Setup)    : A001-A099
 * B - Business Partner Master Data          : B001-B099  
 * C - Material Master Data                  : C001-C099
 * S - Sales Process                         : S001-S099
 * P - Procurement Process                   : P001-P099
 * F - Finance Process                       : F001-F099
 * I - Inventory Management                  : I001-I099
 * H - Human Resources                       : H001-H099
 * M - Manufacturing/Production              : M001-M099
 * R - Reporting & Analytics                 : R001-R099
 * 
 * CUSTOMIZED VERSIONS (Adding 'C' after prefix):
 * AC - Customized Master Data              : AC001-AC099
 * BC - Customized Business Partner         : BC001-BC099
 * SC - Customized Sales Process            : SC001-SC099
 * PC - Customized Procurement              : PC001-PC099
 * FC - Customized Finance                  : FC001-FC099
 * IC - Customized Inventory                : IC001-IC099
 * HC - Customized HR                       : HC001-HC099
 * MC - Customized Manufacturing            : MC001-MC099
 * RC - Customized Reporting                : RC001-RC099
 * 
 * PROCESS SEQUENCE LOGIC:
 * 
 * A - Master Data Setup (Sequential Order):
 * A001 - Company Code        (First: Legal entity setup)
 * A002 - Chart of Accounts   (Second: Financial structure)
 * A003 - Plant               (Third: Physical locations)
 * A004 - Storage Location    (Fourth: Warehouse areas)
 * A005 - GL Accounts         (Fifth: Account details)
 * A006 - Cost Centers        (Sixth: Cost allocation)
 * 
 * B - Business Partners (Setup Order):
 * B001 - Customer Master     (First: Sales partners)
 * B002 - Vendor Master       (Second: Procurement partners)
 * 
 * C - Material Master:
 * C001 - Material Master     (First: Product information)
 * 
 * S - Sales Process (Document Flow):
 * S001 - Sales Order         (First: Customer request)
 * S002 - Delivery            (Second: Goods shipment)
 * S003 - Billing             (Third: Invoice generation)
 * 
 * P - Procurement Process (Document Flow):
 * P001 - Purchase Order      (First: Supplier request)
 * P002 - Goods Receipt       (Second: Material receipt)
 * P003 - Invoice Verification (Third: Vendor invoice)
 * 
 * F - Finance Process:
 * F001 - Accounts Payable    (First: Vendor payments)
 * F002 - Accounts Receivable (Second: Customer collections)
 * F003 - Payment Processing  (Third: Payment execution)
 * 
 * I - Inventory Management:
 * I001 - Goods Issue         (First: Material outbound)
 * I002 - Stock Transfer      (Second: Location movement)
 * 
 * CUSTOMIZATION EXAMPLES:
 * SC001 - Sales Order (Custom)     : Enhanced sales order with approval workflow
 * PC001 - Purchase Order (Custom)  : PO with multi-level approvals
 * AC001 - Company Code (Custom)    : Extended company code with additional fields
 * 
 * TILE REFERENCES IN DATABASE:
 * - user_workspaces.tiles: JSONB array of tile numbers
 * - user_roles.tile_access: JSONB array of accessible tile numbers
 * - All tiles maintain their unique numbers for easy identification
 * 
 * BENEFITS:
 * 1. Logical grouping by functional area
 * 2. Sequential numbering reflects business process flow
 * 3. Easy identification and reference
 * 4. Scalable for future additions
 * 5. Clear distinction between standard and customized functions
 */

export function getTilesByRole(userRole: string): TileConfig[] {
  return TILE_CATALOG.filter(tile => 
    tile.requiredRoles.includes(userRole) || tile.requiredRoles.includes("all")
  );
}

export function getTileByNumber(number: string): TileConfig | undefined {
  return TILE_CATALOG.find(tile => tile.number === number);
}

export function getWorkspaceForRole(role: string): string[] {
  const workspace = DEFAULT_WORKSPACES[role.toUpperCase() as keyof typeof DEFAULT_WORKSPACES];
  return workspace ? workspace.tiles : [];
}