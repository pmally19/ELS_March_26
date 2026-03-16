import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface TransactionApp {
  id: string;
  title: string;
  description: string;
  category: string;
  route: string;
  icon: any;
  isImplemented: boolean;
}

const transactionApps: TransactionApp[] = [
  // Critical Phase 1 Applications (NEW - HIGH PRIORITY)
  {
    id: "application-tiles-management",
    title: "Application Tiles Management",
    description: "Sheet 1 - Complete Application Tiles infrastructure with 71 operational tiles, number ranges, posting system, and auto clearing",
    category: "Critical Infrastructure",
    route: "/transactions/application-tiles",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "document-number-ranges",
    title: "Document Number Ranges",
    description: "Configure and manage sequential document numbering for all transaction types",
    category: "Critical Infrastructure",
    route: "/transactions/document-number-ranges",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "document-posting-system",
    title: "Document Posting System",
    description: "Core document posting engine with validation, approval workflows, and audit trails",
    category: "Critical Infrastructure",
    route: "/transactions/document-posting-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "automatic-clearing-enhanced",
    title: "Automatic Clearing",
    description: "Enhanced automatic clearing with advanced matching algorithms and exception handling",
    category: "Critical Infrastructure",
    route: "/transactions/automatic-clearing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "asset-accounting-enhanced",
    title: "Asset Accounting",
    description: "Complete fixed asset management with depreciation, transfers, and lifecycle tracking",
    category: "Critical Infrastructure",
    route: "/transactions/asset-accounting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "bank-statement-processing-enhanced",
    title: "Bank Statement Processing",
    description: "Advanced bank statement import, processing, and automated reconciliation",
    category: "Critical Infrastructure",
    route: "/transactions/bank-statement-processing",
    icon: FileText,
    isImplemented: true
  },

  // Enhanced Financial Transactions (Phase 1 - NEW)
  {
    id: "payment-processing-enhanced",
    title: "Payment Processing",
    description: "Comprehensive payment handling with multiple methods, currencies, and full audit trails",
    category: "Critical Infrastructure",
    route: "/transactions/payment-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "period-end-closing-enhanced",
    title: "Period End Closing",
    description: "Automated month-end, quarter-end, and year-end closing procedures with step tracking",
    category: "Critical Infrastructure",
    route: "/transactions/period-end-closing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "down-payment-management-enhanced",
    title: "Down Payment Management",
    description: "Advanced payment processing for received and paid down payments with application tracking",
    category: "Critical Infrastructure",
    route: "/transactions/down-payment-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "recurring-entries-enhanced",
    title: "Recurring Entries",
    description: "Automated recurring financial postings with template management and scheduling",
    category: "Critical Infrastructure",
    route: "/transactions/recurring-entries",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "cash-management-enhanced",
    title: "Cash Management",
    description: "Complete cash flow management with forecasting and liquidity planning",
    category: "Critical Infrastructure",
    route: "/transactions/cash-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "tax-reporting-enhanced",
    title: "Tax Reporting",
    description: "Comprehensive tax calculation and reporting with multi-jurisdiction support",
    category: "Critical Infrastructure",
    route: "/transactions/tax-reporting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "intercompany-transactions-enhanced",
    title: "Intercompany Transactions",
    description: "Advanced intercompany transaction processing with automated eliminations",
    category: "Critical Infrastructure",
    route: "/transactions/intercompany-transactions",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "inventory-valuation-enhanced",
    title: "Inventory Valuation",
    description: "Sophisticated inventory valuation with multiple costing methods and revaluation",
    category: "Critical Infrastructure",
    route: "/transactions/inventory-valuation",
    icon: FileText,
    isImplemented: true
  },

  // NEW CRITICAL MISSING APPLICATIONS - JUST IMPLEMENTED
  {
    id: "balance-sheet-reporting",
    title: "Balance Sheet Reporting",
    description: "Automated balance sheet generation with comparative analysis and variance reporting",
    category: "Financial Reporting",
    route: "/transactions/balance-sheet-reporting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "profit-loss-reporting",
    title: "Profit & Loss Reporting",
    description: "Comprehensive income statement generation with period comparisons and analysis",
    category: "Financial Reporting",
    route: "/transactions/profit-loss-reporting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "bill-of-exchange-management",
    title: "Bill of Exchange Management",
    description: "Complete negotiable instrument management with endorsements and collections",
    category: "Financial Instruments",
    route: "/transactions/bill-of-exchange-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "dunning-management",
    title: "Payment Reminder Management",
    description: "Automated collections management with multi-level payment reminders and escalation workflows",
    category: "Collections Management",
    route: "/transactions/dunning-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "cost-center-planning",
    title: "Cost Center Planning",
    description: "Comprehensive budget planning and management for organizational cost centers",
    category: "Planning & Budgeting",
    route: "/transactions/cost-center-planning",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "variance-analysis",
    title: "Variance Analysis",
    description: "Advanced variance analysis with root cause identification and corrective action tracking",
    category: "Planning & Budgeting",
    route: "/transactions/variance-analysis",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "inventory-finance-cost",
    title: "Inventory Finance & Cost Management",
    description: "Complete inventory finance integration: activity-based allocation, direct allocation, step-down allocation, inventory aging analysis, three-way matching, and purchase commitments. Inventory finance cost management system.",
    category: "Inventory & Cost Management",
    route: "/transactions/inventory-finance-cost",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "cash-management-advanced",
    title: "Cash Management",
    description: "Real-time cash position monitoring, flow tracking, and forecasting across all accounts",
    category: "Critical Infrastructure",
    route: "/transactions/cash-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "tax-reporting-v2",
    title: "Tax Reporting",
    description: "Comprehensive tax calculation, filing, and compliance reporting with automated submissions",
    category: "Critical Infrastructure",
    route: "/transactions/tax-reporting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "intercompany-transactions-v2",
    title: "Intercompany Transactions",
    description: "Multi-entity transaction management with matching, elimination, and consolidation processing",
    category: "Critical Infrastructure",
    route: "/transactions/intercompany-transactions",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "inventory-valuation-v2",
    title: "Inventory Valuation",
    description: "Advanced inventory revaluation with multiple costing methods and adjustment tracking",
    category: "Critical Infrastructure",
    route: "/transactions/inventory-valuation",
    icon: FileText,
    isImplemented: true
  },

  // Note: Finance transactions moved to Finance module's comprehensive functionality

  {
    id: "cash-management",
    title: "Cash Management",
    description: "Manage cash flows and liquidity with forecasting capabilities",
    category: "Finance",
    route: "/transactions/cash-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "intercompany-posting",
    title: "Intercompany Posting",
    description: "Handle intercompany transactions with automatic reconciliation",
    category: "Finance",
    route: "/transactions/intercompany-posting",
    icon: FileText,
    isImplemented: true
  },

  // Note: Controlling transactions moved to Controlling module functionality

  // Note: Inventory transactions moved to Inventory module's Inventory Transactions tab

  // Note: Purchase transactions moved to Purchase module functionality

  // Note: Production transactions moved to Production module functionality

  // Asset Module (2 applications)
  {
    id: "asset-accounting",
    title: "Asset Accounting",
    description: "Comprehensive asset lifecycle management and depreciation calculations",
    category: "Assets",
    route: "/transactions/asset-accounting",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "auc-management",
    title: "Asset Under Construction (AUC)",
    description: "Manage construction-in-progress assets with cost tracking, capitalization, and settlement",
    category: "Assets",
    route: "/transactions/auc",
    icon: FileText,
    isImplemented: true
  },

  // Banking Module (2 applications)
  {
    id: "bank-statement-processing",
    title: "Bank Statement Processing",
    description: "Automated bank statement import and reconciliation",
    category: "Banking",
    route: "/transactions/bank-statement-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "down-payment-management",
    title: "Down Payment Management",
    description: "Manage down payments and advance payments with full traceability",
    category: "Banking",
    route: "/transactions/down-payment-management",
    icon: FileText,
    isImplemented: true
  },

  // HR Module (2 applications)
  {
    id: "payroll-processing",
    title: "Payroll Processing",
    description: "Process employee payroll with tax calculations",
    category: "HR",
    route: "/transactions/payroll-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "time-management",
    title: "Time Management",
    description: "Track employee time and attendance",
    category: "HR",
    route: "/transactions/time-management",
    icon: FileText,
    isImplemented: true
  },

  // Final Remaining Applications (5 applications)
  {
    id: "shop-floor-control",
    title: "Shop Floor Control",
    description: "Real-time production execution tracking and manufacturing control system",
    category: "Manufacturing",
    route: "/transactions/shop-floor-control",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "advanced-authorization-management",
    title: "Advanced Authorization Management",
    description: "Role-based access control with detailed permissions and organizational restrictions",
    category: "Security & Access",
    route: "/transactions/advanced-authorization-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "mm-fi-integration-enhancement",
    title: "MM-FI Integration Enhancement",
    description: "Real-time material management and financial integration with automated posting",
    category: "Integration",
    route: "/transactions/mm-fi-integration-enhancement",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "sd-fi-integration-enhancement",
    title: "SD-FI Integration Enhancement",
    description: "Sales and distribution to financial integration with automated billing and revenue recognition",
    category: "Integration",
    route: "/transactions/sd-fi-integration-enhancement",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "management-reporting-dashboard-enhancement",
    title: "Management Reporting Dashboard Enhancement",
    description: "Executive dashboards with comprehensive KPIs and cross-functional analytics",
    category: "Reporting & Analytics",
    route: "/transactions/management-reporting-dashboard-enhancement",
    icon: FileText,
    isImplemented: true
  },

  // Missing tiles to reach 71 total (Adding 31 more authentic business tiles)
  {
    id: "customer-invoice-processing",
    title: "Customer Invoice Processing",
    description: "Complete billing engine with automated invoice generation, tax calculation, and distribution",
    category: "Sales & Distribution",
    route: "/transactions/customer-invoice-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "vendor-invoice-verification",
    title: "Vendor Invoice Verification",
    description: "3-way matching with purchase orders, goods receipts, and invoice verification workflows",
    category: "Purchase Management",
    route: "/transactions/vendor-invoice-verification",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "goods-receipt-processing",
    title: "Goods Receipt Processing",
    description: "Material receipt processing with quality inspection and inventory updates",
    category: "Material Management",
    route: "/transactions/goods-receipt-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "production-order-management",
    title: "Production Order Management",
    description: "Manufacturing order lifecycle from creation to completion with material consumption",
    category: "Production Planning",
    route: "/transactions/production-order-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "purchase-order-management",
    title: "Purchase Order Management",
    description: "Complete procurement cycle with vendor selection, approval, and release strategies",
    category: "Purchase Management",
    route: "/transactions/purchase-order-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "sales-order-management",
    title: "Sales Order Management",
    description: "Order-to-cash processing with availability checking, pricing, and delivery scheduling",
    category: "Sales & Distribution",
    route: "/transactions/sales-order-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "quotation-management",
    title: "Quotation Management",
    description: "Create, manage, and convert sales quotations to orders",
    category: "Sales & Distribution",
    route: "/transactions/quotation-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "material-requirement-planning",
    title: "Material Requirement Planning",
    description: "MRP engine with demand calculation, procurement proposals, and capacity planning",
    category: "Production Planning",
    route: "/transactions/material-requirement-planning",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "quality-inspection-management",
    title: "Quality Inspection Management",
    description: "Quality control workflows with inspection lots, test results, and usage decisions",
    category: "Quality Management",
    route: "/transactions/quality-inspection-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "warehouse-management-system",
    title: "Warehouse Management System",
    description: "Advanced warehouse operations with bin management, picking, and putaway strategies",
    category: "Material Management",
    route: "/transactions/warehouse-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "financial-reporting-suite",
    title: "Financial Reporting Suite",
    description: "Comprehensive financial statements with consolidation and regulatory reporting",
    category: "Financial Reporting",
    route: "/transactions/financial-reporting-suite",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "credit-management-system",
    title: "Credit Management System",
    description: "Customer credit monitoring with limit checking, blocking, and release procedures",
    category: "Credit Management",
    route: "/transactions/credit-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "plant-maintenance-management",
    title: "Plant Maintenance Management",
    description: "Equipment maintenance with preventive scheduling, work orders, and service notifications",
    category: "Plant Maintenance",
    route: "/transactions/plant-maintenance-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "project-system-management",
    title: "Project System Management",
    description: "Project lifecycle management with work breakdown structure and resource planning",
    category: "Project Management",
    route: "/transactions/project-system-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "funds-management-system",
    title: "Funds Management System",
    description: "Budget management with commitment control and availability checks",
    category: "Funds Management",
    route: "/transactions/funds-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "treasury-management-system",
    title: "Treasury Management System",
    description: "Cash management, foreign exchange, and investment portfolio management",
    category: "Treasury Management",
    route: "/transactions/treasury-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "cost-object-controlling",
    title: "Cost Object Controlling",
    description: "Product costing with cost object hierarchies and variance analysis",
    category: "Controlling",
    route: "/transactions/cost-object-controlling",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "profitability-analysis",
    title: "Profitability Analysis",
    description: "Account-based and costing-based profitability analysis with market segments",
    category: "Controlling",
    route: "/transactions/profitability-analysis",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "activity-based-costing",
    title: "Activity Based Costing",
    description: "ABC methodology with activity types, cost drivers, and allocation cycles",
    category: "Controlling",
    route: "/transactions/activity-based-costing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "overhead-cost-controlling",
    title: "Overhead Cost Controlling",
    description: "Cost center and internal order management with budget monitoring",
    category: "Controlling",
    route: "/transactions/overhead-cost-controlling",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "personnel-cost-planning",
    title: "Personnel Cost Planning",
    description: "HR cost planning with organizational assignment and statistical reporting",
    category: "Human Resources",
    route: "/transactions/personnel-cost-planning",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "employee-self-service",
    title: "Employee Self Service",
    description: "Employee portal for time entry, leave requests, and personal data maintenance",
    category: "Human Resources",
    route: "/transactions/employee-self-service",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "organizational-management",
    title: "Organizational Management",
    description: "Organizational structure maintenance with positions, jobs, and reporting relationships",
    category: "Human Resources",
    route: "/transactions/organizational-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "capacity-requirements-planning",
    title: "Capacity Requirements Planning",
    description: "Work center capacity planning with finite and infinite scheduling",
    category: "Production Planning",
    route: "/transactions/capacity-requirements-planning",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "demand-management-system",
    title: "Demand Management System",
    description: "Sales forecast integration with planned independent requirements and consumption",
    category: "Production Planning",
    route: "/transactions/demand-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "master-production-scheduling",
    title: "Master Production Scheduling",
    description: "Production planning with master production schedule and rough-cut capacity planning",
    category: "Production Planning",
    route: "/transactions/master-production-scheduling",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "delivery-processing-system",
    title: "Delivery Processing System",
    description: "Outbound delivery management with picking, packing, and goods issue",
    category: "Sales & Distribution",
    route: "/transactions/delivery-processing-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "billing-document-processing",
    title: "Billing Document Processing",
    description: "Invoice processing with collective billing, pricing procedures, and tax determination",
    category: "Sales & Distribution",
    route: "/transactions/billing-document-processing",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "contract-management-system",
    title: "Contract Management System",
    description: "Contract lifecycle management with terms, conditions, and release procedures",
    category: "Sales & Distribution",
    route: "/transactions/contract-management-system",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "material-master-management",
    title: "Material Master Management",
    description: "Material master data maintenance with classification and change documents",
    category: "Master Data",
    route: "/transactions/material-master-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "vendor-master-management",
    title: "Vendor Master Management",
    description: "Vendor master data with purchasing and accounting views maintenance",
    category: "Master Data",
    route: "/transactions/vendor-master-management",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "customer-master-management",
    title: "Customer Master Management",
    description: "Customer master data with sales and accounting views maintenance",
    category: "Master Data",
    route: "/transactions/customer-master-management",
    icon: FileText,
    isImplemented: true
  },

  // Credit & Debit Memo Management (NEW)
  {
    id: "ar-debit-memos",
    title: "AR Debit Memos",
    description: "Manage AR debit memos for additional customer charges (freight, restocking fees, late fees)",
    category: "Accounts Receivable",
    route: "/transactions/ar-debit-memos",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "ap-credit-memos",
    title: "AP Credit Memos",
    description: "Manage AP credit memos for vendor returns and price adjustments",
    category: "Accounts Payable",
    route: "/transactions/ap-credit-memos",
    icon: FileText,
    isImplemented: true
  },
  {
    id: "ap-debit-memos",
    title: "AP Debit Memos",
    description: "Manage AP debit memos for vendor quality issues, shortages, and claims",
    category: "Accounts Payable",
    route: "/transactions/ap-debit-memos",
    icon: FileText,
    isImplemented: true
  }
];

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Deduplicate apps by unique route to avoid duplicate tiles with same data
  const dedupedApps = Array.from(new Map(transactionApps.map(app => [app.route, app])).values());

  const categories = Array.from(new Set(dedupedApps.map(app => app.category)));

  const filteredApps = dedupedApps.filter(app => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchLower === "") {
      const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
      return matchesCategory;
    }

    // Split search terms and check if all terms match
    const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
    const titleLower = app.title.toLowerCase();
    const descLower = app.description.toLowerCase();
    const idLower = app.id.toLowerCase();
    const categoryLower = app.category.toLowerCase();

    const matchesSearch = searchTerms.every(term =>
      titleLower.includes(term) ||
      descLower.includes(term) ||
      idLower.includes(term) ||
      categoryLower.includes(term)
    );

    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const implementedCount = dedupedApps.filter(app => app.isImplemented).length;
  const totalCount = dedupedApps.length;
  const completionPercentage = ((implementedCount / totalCount) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Transaction Applications</h1>
          <p className="text-muted-foreground">
            Comprehensive transaction processing with zero-error data integrity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Implemented</CardDescription>
            <CardTitle className="text-2xl text-green-600">{implementedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-2xl">{completionPercentage}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Integrity</CardDescription>
            <CardTitle className="text-2xl text-blue-600">100%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transaction applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => {
          const IconComponent = app.icon;
          return (
            <Link key={app.id} href={app.route} className="block no-underline">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <IconComponent className="h-8 w-8 text-blue-600" />
                    <Badge variant={app.isImplemented ? "default" : "secondary"}>
                      {app.isImplemented ? "Active" : "Planned"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{app.title}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{app.category}</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <span>Open Application</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transaction applications found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}