import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgentRoleProvider } from "@/contexts/AgentRoleContext";
import AgentRoleSwitcher from "@/components/AgentRoleSwitcher";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import CustomizableDashboard from "@/pages/CustomizableDashboard";
import { useEffect, useState, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import new master data components
const PriceLists = lazy(() => import('./pages/master-data/PriceLists'));
const PaymentTerms = lazy(() => import('./pages/master-data/PaymentTerms'));
const DocumentTypes = lazy(() => import('./pages/master-data/DocumentTypes'));
const NumberRanges = lazy(() => import('./pages/master-data/NumberRanges'));
const MovementClassesConfig = lazy(() => import('./pages/master-data/MovementClassesConfig'));
const TransactionTypesConfig = lazy(() => import('./pages/master-data/TransactionTypesConfig'));
const BaselineDateConfig = lazy(() => import('./pages/master-data/BaselineDateConfig'));
const DocumentCategoriesConfig = lazy(() => import('./pages/master-data/DocumentCategoriesConfig'));
const AccountTypesConfig = lazy(() => import('./pages/master-data/AccountTypesConfig'));
const NumberRangeObjectsConfig = lazy(() => import('./pages/master-data/NumberRangeObjectsConfig'));
const InventoryDirectionsConfig = lazy(() => import('./pages/master-data/InventoryDirectionsConfig'));
const CostCenterCategories = lazy(() => import('./pages/master-data/CostCenterCategories'));
const CustomerAccountAssignmentGroups = lazy(() => import('./pages/master-data/CustomerAccountAssignmentGroups'));
const MaterialAccountAssignmentGroups = lazy(() => import('./pages/master-data/MaterialAccountAssignmentGroups'));
const ReasonCodes = lazy(() => import('./pages/master-data/ReasonCodes'));
const PostingKeys = lazy(() => import('./pages/master-data/PostingKeys'));
const ShippingPointDetermination = lazy(() => import('./pages/master-data/ShippingPointDetermination'));

const Ledgers = lazy(() => import('./pages/master-data/Ledgers'));
const DocumentSplitting = lazy(() => import('./pages/master-data/DocumentSplitting'));
const AccountingPrinciples = lazy(() => import('./pages/master-data/AccountingPrinciples'));
const ToleranceGroups = lazy(() => import('./pages/master-data/ToleranceGroups'));
const ControllingAreaIntegration = lazy(() => import('./pages/master-data/ControllingAreaIntegration'));
import {
  Package2, Users, Building, Building2, Factory,
  Package, Store, ShoppingBag, CreditCard, Ruler,
  ClipboardCheck, BookOpen, DollarSign, BarChart2,
  UserCircle, Percent, Briefcase, Settings as SettingsIcon, Calendar,
  FileText, Search, Globe, Truck, Network, Coins, Route as RouteIcon,
  Cloud, ShoppingCart, MapPin, Tag, FolderTree, TrendingUp, Calculator, Shield, GitBranch, Scissors, Key, Grid3X3, ArrowRight, Database, Scale
} from "lucide-react";

// Import the DraggableTiles component
import { DraggableTiles } from "@/components/master-data/DraggableTiles";
import { JrChatbot } from "@/components/JrChatbot";

// Import comprehensive AI-powered pages
import ComprehensiveCustomers from "@/pages/comprehensive/ComprehensiveCustomers";
import ComprehensiveInventory from "@/pages/comprehensive/ComprehensiveInventory";

// Import the module dashboards
import Sales from "@/pages/sales/Sales";
// // // import SalesOrderList from "@/pages/sales/SalesOrderList"; // Removed during cleanup // File removed during cleanup // REMOVED: File does not exist
// // // import SalesOrder from "@/pages/sales/SalesOrder"; // Removed during cleanup // File removed during cleanup // REMOVED: File does not exist
import SalesOrderDetail from "@/pages/sales/SalesOrderDetail";
import TestDynamicRoute from "@/pages/sales/TestDynamicRoute";
import SalesOrderWithIncoterms from "@/pages/sales/SalesOrderWithIncoterms";
import OrderToCash from "@/pages/sales/OrderToCash";
import PricingProcedures from "@/pages/sales/PricingProcedures";
import AccessSequences from "@/pages/sales/AccessSequences";
import Inventory from "@/pages/inventory/Inventory";
import InventoryManagement from "@/pages/InventoryManagement";
import Products from "@/pages/inventory/Products";
import Finance from "@/pages/finance/Finance";
import Controlling from "@/pages/Controlling";
import Help from "@/pages/Help";
import UserGuides from "@/pages/UserGuides";
import WorkspaceManager from "@/pages/WorkspaceManager";
import HonestDevelopmentStatus from "@/pages/HonestDevelopmentStatus";
import AgentPlayer from "@/pages/AgentPlayer";
import CoachAgent from "@/pages/CoachAgent";
import ChiefAgent from "@/pages/ChiefAgent";
import RookieAgent from "@/pages/RookieAgent";
import DesignerAgent from "@/pages/DesignerAgent";
import DeveloperAgent from "@/pages/DeveloperAgent";
import APIKeyManager from "@/pages/APIKeyManager";
import IntelligentTestingAgent from "@/pages/IntelligentTestingAgent";
import { TileTrackingReport } from "@/pages/TileTrackingReport";
import DominosPizzaE2ETesting from "@/pages/DominosPizzaE2ETesting";
import CoachAgentHealthDashboard from "@/pages/CoachAgentHealthDashboard";
import ProjectTest from "@/pages/ProjectTest";
import TestResults from "@/pages/TestResults";
import CrossCheckLineage from "@/pages/CrossCheckLineage";
import EndToEndProcesses from "@/pages/EndToEndProcesses";
import ERPStatusDashboard from "@/pages/dashboard/ERPStatusDashboard";
import MasterDataPage from "@/pages/MasterData";
import MasterDataCrossReference from "@/pages/MasterDataCrossReference";

// Import transaction modules
import SalesOrderTransaction from "@/pages/transactions/SalesOrder";
import InvoiceTransaction from "@/pages/transactions/Invoice";
import DocumentNumberRanges from "@/pages/transactions/DocumentNumberRanges";
import DocumentPostingSystem from "@/pages/transactions/DocumentPostingSystem";
import AutomaticClearing from "@/pages/transactions/AutomaticClearing";
import ApplicationTilesManagement from "@/pages/transactions/ApplicationTilesManagement";
import AssetAccounting from "@/pages/transactions/AssetAccounting";
import BankStatementProcessing from "@/pages/transactions/BankStatementProcessing";
import CustomerInvoiceProcessing from "@/pages/transactions/CustomerInvoiceProcessing";
import SalesOrderTransactionManagement from "@/pages/transactions/SalesOrderManagement";
import MaterialMasterManagement from "@/pages/transactions/MaterialMasterManagement";
import ProductionOrderManagement from "@/pages/transactions/ProductionOrderManagement";
import AUCManagement from "@/pages/transactions/AUCManagement";
import AUCDetails from "@/pages/transactions/AUCDetails";

// Import sales components
import SalesLeads from "@/pages/sales/SalesLeads";
import SalesOpportunities from "@/pages/sales/SalesOpportunities";
import SalesQuotes from "@/pages/sales/SalesQuotes";
import CreateQuotation from "@/pages/sales/CreateQuotation";
import SalesQuoteApproval from "@/pages/sales/SalesQuoteApproval";

// Import SD-FI Integration components
// // import SalesOrderManagement from "@/pages/sales/SalesOrderManagement"; // File removed during cleanup // REMOVED: File does not exist
import SDFIIntegrationDashboard from "@/pages/integration/SDFIIntegrationDashboard";
import SalesDistributionConfig from "@/pages/sales/SalesDistributionConfig";
import SDCustomization from "@/pages/sales/SDCustomization";

// Import purchase and production components
import PurchaseModule from "@/pages/purchase/Purchase";
import ProductionModule from "@/pages/production/Production";
import ProductionPlanning from "@/pages/ProductionPlanning";

// Import master data components
import UnitOfMeasure from "@/pages/master-data/UnitOfMeasure";
import CompanyCode from "@/pages/master-data/CompanyCode";
import CustomerPricingProcedures from "@/pages/master-data/CustomerPricingProcedures";
import DocumentPricingProcedures from "@/pages/master-data/DocumentPricingProcedures";
import PricingProcedureDetermination from "@/pages/master-data/PricingProcedureDetermination";
import IndustrySector from "@/pages/master-data/IndustrySector";
import Transport from "@/pages/Transport";
import TransportAdmin from "@/pages/TransportAdmin";
import GitHubSetup from "@/pages/GitHubSetup";
import GitHubIntegration from "@/pages/GitHubIntegration";
import Plant from "@/pages/master-data/Plant";
import Currency from "@/pages/master-data/Currency";
import StorageLocation from "@/pages/master-data/StorageLocation";
import ShippingPoint from "@/pages/master-data/ShippingPoint";
import SalesOrganization from "@/pages/master-data/SalesOrganization";
import SalesOffice from "@/pages/master-data/SalesOffice";
import PurchaseOrganization from "@/pages/master-data/PurchaseOrganization";
import PurchaseReferences from "@/pages/master-data/PurchaseReferences";
import CreditControl from "@/pages/master-data/CreditControl";
import ApprovalLevels from "@/pages/master-data/ApprovalLevels";
// Note: Material master uses MaterialMaster route; legacy Material component removed
import MaterialMaster from "@/pages/master-data/MaterialMaster";
import MRPControllers from "@/pages/master-data/MRPControllers";
import SDDocumentTypes from "@/pages/master-data/SDDocumentTypes";
import SalesDocumentCategories from "@/pages/master-data/SalesDocumentCategories";
import MasterDataChartOfAccounts from "@/pages/master-data/ChartOfAccounts";

import CustomerMaster from "@/pages/master-data/CustomerMaster";
import Vendor from "@/pages/master-data/Vendor";
import VendorMaterialAssignment from "@/pages/master-data/VendorMaterialAssignment";
import BomsContent from "@/components/production/BomsContent";
import UnitsOfMeasure from "@/pages/master-data/UnitsOfMeasure";
import WorkCenters from "@/pages/master-data/WorkCenters";
import CostCenters from "@/pages/master-data/CostCenters";
import ProfitCenters from "@/pages/master-data/ProfitCenters";
import AssetClasses from "@/pages/master-data/AssetClasses";
import AssetAccountDetermination from "@/pages/master-data/AssetAccountDetermination";
import AccountCategories from "@/pages/master-data/AccountCategories";
import TransactionTypes from "@/pages/master-data/TransactionTypes";
import BusinessArea from "@/pages/master-data/BusinessArea";
import Employees from "@/pages/master-data/Employees";
import TaxManagement from "@/pages/master-data/TaxManagement";
import AssetMaster from "@/pages/master-data/AssetMaster";
import DepreciationMethods from "@/pages/master-data/DepreciationMethods";
import DepreciationAreas from "@/pages/master-data/DepreciationAreas";
import Regions from "@/pages/master-data/Regions";

import Currencies from "@/pages/master-data/Currencies";
import FinanceCurrencies from "@/pages/master-data/FinanceCurrencies";
import FiscalCalendar from "@/pages/master-data/FiscalCalendar";
import FactoryCalendar from "@/pages/master-data/FactoryCalendar";
import HolidayCalendar from "@/pages/master-data/HolidayCalendar";
import ItemCategories from "@/pages/master-data/ItemCategories";
import PurchasingItemCategories from "@/pages/master-data/PurchasingItemCategories";
import ConditionCategories from "@/pages/master-data/ConditionCategories";
import CalculationMethods from "@/pages/master-data/CalculationMethods";
import InterestCalculators from "@/pages/master-data/InterestCalculators";
import ItemCategoryGroups from "@/pages/master-data/ItemCategoryGroups";
import ItemCategoryDetermination from "@/pages/master-data/ItemCategoryDetermination";
import SalesProcessTypes from "@/pages/master-data/SalesProcessTypes";
import FiscalYearVariant from "@/pages/master-data/FiscalYearVariant";
import FiscalPeriod from "@/pages/master-data/FiscalPeriod";
import SupplyTypes from "@/pages/master-data/SupplyTypes";
import PurchasingGroups from "@/pages/master-data/PurchasingGroups";
import VendorGroups from "@/pages/master-data/VendorGroups";
import CustomerGroups from "@/pages/master-data/CustomerGroups";
import CustomerTypes from "@/pages/master-data/CustomerTypes";
import Countries from "@/pages/master-data/Countries";
import States from "@/pages/master-data/States";
import TaxJurisdictions from "@/pages/master-data/TaxJurisdictions";
const TaxRules = lazy(() => import('./pages/master-data/TaxRules'));
const TaxProfiles = lazy(() => import('./pages/master-data/TaxProfiles'));
import MaterialGroups from "@/pages/master-data/MaterialGroups";
import DistributionChannels from "@/pages/master-data/DistributionChannels";
import Divisions from "@/pages/master-data/Divisions";
import SalesAreas from "@/pages/master-data/SalesAreas";
import AccountGroups from "@/pages/master-data/AccountGroups";
import ReconciliationAccounts from "@/pages/master-data/ReconciliationAccounts";
import BankMaster from "@/pages/master-data/BankMaster";
import AccountId from "@/pages/master-data/AccountId";
import ToleranceGroupsNew from "@/pages/master-data/ToleranceGroupsNew";
import CurrencyDenominationNew from "@/pages/master-data/CurrencyDenominationNew";
import ExchangeRateTypeNew from "@/pages/master-data/ExchangeRateTypeNew";
import RoutesMaster from "@/pages/master-data/Routes";
import GeneralLedgerAccounts from "@/pages/master-data/GeneralLedgerAccounts";
import GLAccountGroups from "@/pages/master-data/GLAccountGroups";
import PostingPeriodControls from "@/pages/master-data/PostingPeriodControls";
import RetainedEarningsAccounts from "@/pages/master-data/RetainedEarningsAccounts";
import ChartOfDepreciation from "@/pages/master-data/ChartOfDepreciation";
import PurchasingOrganizations from "@/pages/master-data/PurchaseOrganization";
import ValuationClasses from "@/pages/master-data/ValuationClasses";
import MaterialTypes from "@/pages/master-data/MaterialTypes";
import MaterialAccountDetermination from "@/pages/master-data/MaterialAccountDetermination";
import MaterialCategories from "@/pages/master-data/MaterialCategories";
import ParentCategories from "@/pages/master-data/ParentCategories";
import BatchClasses from "@/pages/master-data/BatchClasses";
import QualityGrades from "@/pages/master-data/QualityGrades";
import WarehouseTypes from "@/pages/master-data/WarehouseTypes";
import RouteSchedules from "@/pages/master-data/RouteSchedules";
import ShippingConditions from "@/pages/master-data/ShippingConditions";
import Incoterms from "@/pages/master-data/Incoterms";
import MovementTypes from "@/pages/master-data/MovementTypes";
import DiscountGroups from "@/pages/master-data/DiscountGroups";
import CreditLimitGroups from "@/pages/master-data/CreditLimitGroups";
import ValuationGroupingCodes from "@/pages/master-data/ValuationGroupingCodes";
import LoadingGroups from "@/pages/master-data/LoadingGroups";
import TransportationGroups from "@/pages/master-data/TransportationGroups";
import ShippingConditionKeys from "@/pages/master-data/ShippingConditionKeys";
import WeightGroups from "@/pages/master-data/WeightGroups";
import AccountCategoryReferences from "@/pages/master-data/AccountCategoryReferences";
import MasterDataChecker from "@/pages/tools/MasterDataChecker";
import MasterDataProtection from "@/pages/tools/MasterDataProtection";
import TestApplication from "@/pages/tools/TestApplication";
import ApiTester from "@/pages/tools/ApiTester";
import SystemMetrics from "@/pages/tools/SystemMetrics";
import AppLayout from "@/components/layout/AppLayout";

// Import actual finance components
import AccountsReceivable from "@/pages/finance/AR";
import AccountsPayable from "@/pages/finance/AP";
import GeneralLedger from "@/pages/finance/GL";
import BankAccounts from "@/pages/finance/BankAccounts";
import Reconciliation from "@/pages/finance/Reconciliation";
import CreditManagement from "@/pages/transactions/CreditManagement";
import PeriodEndClosing from "@/pages/finance/PeriodEndClosing";
import AccrualManagement from "@/pages/finance/AccrualManagement";

// Import credit and debit memo pages
const DebitMemos = lazy(() => import('./pages/transactions/DebitMemos'));
const VendorCreditMemos = lazy(() => import('./pages/transactions/VendorCreditMemos'));
const VendorDebitMemos = lazy(() => import('./pages/transactions/VendorDebitMemos'));


// Import authorization management pages
const PRDocumentTypes = lazy(() => import('./pages/master-data/PRDocumentTypes'));
const PODocumentTypes = lazy(() => import('./pages/master-data/PODocumentTypes'));
const AuthorizationLevelsPage = lazy(() => import('./pages/finance/settings/AuthorizationLevelsPage'));
const VendorPaymentApprovalPage = lazy(() => import('./pages/finance/settings/VendorPaymentApprovalPage'));

// Other placeholder components
const HR = () => <div className="p-6">HR module coming soon</div>;
const Settings = lazy(() => import('./pages/Settings'));
import Reports from "@/pages/Reports";
import EnterpriseReports from "@/pages/EnterpriseReports";
import Upload from "@/pages/Upload";
import FinancialConfiguration from "@/pages/FinancialConfiguration";
import EndToEndFinancialGuide from "@/pages/EndToEndFinancialGuide";
import SimpleFinancialConfig from "@/pages/SimpleFinancialConfig";

// Import the Tools page
import Tools from "@/pages/Tools";
import AIAgentsDemo from "@/pages/AIAgentsDemo";
import IssuesMonitoringDashboard from "@/pages/IssuesMonitoringDashboard";
import SystemIntegrityDashboard from "@/pages/SystemIntegrityDashboard";
import ChangeLogDashboard from "@/pages/ChangeLogDashboard";
import DataIntegrityAgent from "@/pages/agents/DataIntegrityAgent";

import GlobalCompanyCodePage from "@/pages/master-data/GlobalCompanyCode";
import VATRegistrationPage from "@/pages/master-data/VATRegistration";
import OneProjectManagement from "@/pages/OneProjectManagement";
import OneProjectSyncManagement from "@/pages/OneProjectSyncManagement";
import AgenticAIManagement from "@/pages/AgenticAIManagement";
import LiveAIAgentsInterface from "@/pages/LiveAIAgentsInterface";
import EnhancedAIAgents from "@/pages/EnhancedAIAgents";

// Master Data dashboard with navigation to submodules and draggable tiles
const MasterDataDashboard = () => {
  const navigate = (path: string) => () => {
    // Handle query parameters properly
    const [pathname, search] = path.split('?');
    if (search) {
      window.location.href = `${pathname}?${search}`;
    } else {
      window.location.pathname = pathname;
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  // Define organizational master data tiles
  const initialOrgTiles = [
    {
      id: "company-code",
      title: "Company Code",
      icon: <Building className="h-5 w-5 text-blue-600" />,
      description: "Legal entities in your organization",
      linkText: "Manage Company Codes →",
      onClick: navigate("/master-data/company-code")
    },
    {
      id: "plant",
      title: "Plant",
      icon: <Factory className="h-5 w-5 text-blue-600" />,
      description: "Manufacturing sites and warehouses",
      linkText: "Manage Plants →",
      onClick: navigate("/master-data/plant")
    },
    {
      id: "storage-location",
      title: "Storage Location",
      icon: <Package className="h-5 w-5 text-blue-600" />,
      description: "Physical inventory locations within plants",
      linkText: "Manage Storage Locations →",
      onClick: navigate("/master-data/storage-location")
    },
    {
      id: "sales-organization",
      title: "Sales Organization",
      icon: <Store className="h-5 w-5 text-blue-600" />,
      description: "Sales units in your organization",
      linkText: "Manage Sales Organizations →",
      onClick: navigate("/master-data/sales-organization")
    },
    {
      id: "distribution-channels",
      title: "Distribution Channels",
      icon: <Truck className="h-5 w-5 text-blue-600" />,
      description: "Channels through which products reach customers",
      linkText: "Manage Distribution Channels →",
      onClick: navigate("/master-data/distribution-channels")
    },
    {
      id: "divisions",
      title: "Divisions",
      icon: <Building2 className="h-5 w-5 text-blue-600" />,
      description: "Organizational divisions for sales structure",
      linkText: "Manage Divisions →",
      onClick: navigate("/master-data/divisions")
    },
    {
      id: "sales-areas",
      title: "Sales Areas",
      icon: <MapPin className="h-5 w-5 text-blue-600" />,
      description: "Sales area combinations (Organization + Channel + Division)",
      linkText: "Manage Sales Areas →",
      onClick: navigate("/master-data/sales-areas")
    },
    {
      id: "purchase-organization",
      title: "Purchasing Org",
      icon: <ShoppingBag className="h-5 w-5 text-blue-600" />,
      description: "Procurement units in your organization",
      linkText: "Manage Purchase Organizations →",
      onClick: navigate("/master-data/purchase-organization")
    },
    {
      id: "purchase-references",
      title: "Purchase References",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      description: "Reference data for procurement",
      linkText: "Manage Purchase References →",
      onClick: navigate("/master-data/purchase-references")
    },
    {
      id: "credit-control",
      title: "Credit Control",
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      description: "Financial risk management units",
      linkText: "Manage Credit Control Areas →",
      onClick: navigate("/master-data/credit-control")
    },
    {
      id: "sales-office",
      title: "Sales Office",
      icon: <Building2 className="h-5 w-5 text-blue-600" />,
      description: "Sales offices in your organization",
      linkText: "Manage Sales Offices →",
      onClick: navigate("/master-data/sales-office")
    }
  ];

  // Define core master data tiles
  const initialCoreTiles = [
    {
      id: "material",
      title: "Material Master",
      icon: <Package2 className="h-5 w-5 text-blue-600" />,
      description: "Products, materials and finished goods",
      linkText: "Manage Materials →",
      onClick: navigate("/master-data/material-master")
    },
    {
      id: "industry-sector",
      title: "Industry Sector",
      icon: <Building2 className="h-5 w-5 text-blue-600" />,
      description: "Industry classifications for material master",
      linkText: "Manage Industry Sectors →",
      onClick: navigate("/master-data/industry-sector")
    },
    {
      id: "bom",
      title: "Bill of Materials",
      icon: <ClipboardCheck className="h-5 w-5 text-blue-600" />,
      description: "Components needed to produce finished goods",
      linkText: "Manage BOMs →",
      onClick: navigate("/master-data/bill-of-materials")
    },
    {
      id: "routing",
      title: "Routing",
      icon: <Network className="h-5 w-5 text-green-600" />,
      description: "Manufacturing operation sequences and work center assignments",
      linkText: "Manage Routing →",
      onClick: navigate("/master-data/routing")
    },
    {
      id: "uom",
      title: "Units of Measure",
      icon: <Ruler className="h-5 w-5 text-blue-600" />,
      description: "Management of measurement units with conversion factors",
      linkText: "View Module →",
      onClick: navigate("/master-data/units-of-measure")
    },
    {
      id: "customer",
      title: "Customer Master",
      icon: <Users className="h-5 w-5 text-blue-600" />,
      description: "Customer information and preferences",
      linkText: "Manage Customers →",
      onClick: navigate("/master-data/customer-master")
    },
    {
      id: "vendor",
      title: "Vendor",
      icon: <Building className="h-5 w-5 text-blue-600" />,
      description: "Supplier and vendor information",
      linkText: "Manage Vendors →",
      onClick: navigate("/master-data/vendor-master")
    },
    {
      id: "currency",
      title: "Currencies",
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      description: "Define currencies and exchange rates for financial transactions",
      linkText: "Manage Currencies →",
      onClick: navigate("/master-data/currencies")
    },
    {
      id: "finance-currencies",
      title: "Finance Master Data - Global Currencies",
      icon: <Coins className="h-5 w-5 text-green-600" />,
      description: "Enterprise currency management with global integration (INR, CNY, GBP) across all ERP modules",
      linkText: "Access Finance Currency System →",
      onClick: navigate("/master-data/finance-currencies")
    },
    {
      id: "supply-types",
      title: "Supply Types",
      icon: <Truck className="h-5 w-5 text-blue-600" />,
      description: "Procurement supply type classifications",
      linkText: "Manage Supply Types →",
      onClick: navigate("/master-data/supply-types")
    },
    {
      id: "chart-of-accounts",
      title: "Chart of Accounts",
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      description: "Financial account structure",
      linkText: "Manage Chart of Accounts →",
      onClick: navigate("/master-data/chart-of-accounts")
    },
    {
      id: "fiscal-calendar",
      title: "Fiscal Calendar",
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      description: "Manage fiscal calendars and posting periods",
      linkText: "Manage Fiscal Calendar →",
      onClick: navigate("/master-data/fiscal-calendar")
    },
    {
      id: "factory-calendar",
      title: "Factory Calendar",
      icon: <Calendar className="h-5 w-5 text-purple-600" />,
      description: "Working time calendars for plants, work centers, and capacity planning",
      linkText: "Manage Factory Calendar →",
      onClick: navigate("/master-data/factory-calendar")
    },
    {
      id: "holiday-calendar",
      title: "Holiday Calendar",
      icon: <Calendar className="h-5 w-5 text-orange-600" />,
      description: "Public holiday calendars for workforce planning",
      linkText: "Manage Holiday Calendar →",
      onClick: navigate("/master-data/holiday-calendar")
    },
    {
      id: "fiscal-year-variant",
      title: "Fiscal Year Variant",
      icon: <Calendar className="h-5 w-5 text-green-600" />,
      description: "Define fiscal year structures and period configurations",
      linkText: "Manage Fiscal Year Variants →",
      onClick: navigate("/master-data/fiscal-year-variant")
    },
    {
      id: "gl-account-groups",
      title: "GL Account Groups",
      icon: <BookOpen className="h-5 w-5 text-indigo-600" />,
      description: "Classify and control General Ledger account creation rules",
      linkText: "Manage GL Account Groups →",
      onClick: navigate("/master-data/gl-account-groups")
    },
    {
      id: "posting-period-controls",
      title: "Posting Period Controls",
      icon: <Calendar className="h-5 w-5 text-teal-600" />,
      description: "Control when transactions can be posted to the general ledger",
      linkText: "Manage Posting Period Controls →",
      onClick: navigate("/master-data/posting-period-controls")
    },
    {
      id: "retained-earnings-accounts",
      title: "Retained Earnings Accounts",
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      description: "Configure accounts for carrying forward profit/loss between fiscal years",
      linkText: "Manage Retained Earnings Accounts →",
      onClick: navigate("/master-data/retained-earnings-accounts")
    },
    {
      id: "chart-of-depreciation",
      title: "Chart of Depreciation",
      icon: <Calculator className="h-5 w-5 text-purple-600" />,
      description: "Configure depreciation methods and rules for asset accounting",
      linkText: "Manage Chart of Depreciation →",
      onClick: navigate("/master-data/chart-of-depreciation")
    },
    {
      id: "gl-accounts",
      title: "GL Accounts",
      icon: <BookOpen className="h-5 w-5 text-purple-600" />,
      description: "General ledger accounts for financial postings",
      linkText: "Manage GL Accounts →",
      onClick: navigate("/master-data/gl-accounts")
    },
    {
      id: "ledgers",
      title: "Ledgers",
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      description: "Accounting books for parallel accounting and reporting",
      linkText: "Manage Ledgers →",
      onClick: navigate("/master-data/ledgers")
    },
    {
      id: "document-splitting",
      title: "Document Splitting",
      icon: <Scissors className="h-5 w-5 text-purple-600" />,
      description: "Configure document splitting rules for segment reporting",
      linkText: "Manage Document Splitting →",
      onClick: navigate("/master-data/document-splitting")
    },
    {
      id: "cost-centers",
      title: "Cost Centers",
      icon: <BarChart2 className="h-5 w-5 text-orange-600" />,
      description: "Organizational units for cost allocation and control",
      linkText: "Manage Cost Centers →",
      onClick: navigate("/master-data/cost-centers")
    },
    {
      id: "profit-centers",
      title: "Profit Centers",
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      description: "Business units for profitability analysis",
      linkText: "Manage Profit Centers →",
      onClick: navigate("/master-data/profit-centers")
    },
    {
      id: "business-areas",
      title: "Business Areas",
      icon: <Building2 className="h-5 w-5 text-indigo-600" />,
      description: "Organizational units for financial reporting and consolidation",
      linkText: "Manage Business Areas →",
      onClick: navigate("/master-data/business-areas")
    },
    {
      id: "condition-types",
      title: "Condition Types",
      icon: <Percent className="h-5 w-5 text-blue-600" />,
      description: "Configure pricing components and calculation rules",
      linkText: "Manage Condition Types →",
      onClick: navigate("/condition-types")
    },
    {
      id: "customer-pricing-procedures",
      title: "Customer Pricing Procedures",
      icon: <Calculator className="h-5 w-5 text-blue-600" />,
      description: "Configure customer-specific pricing procedure codes",
      linkText: "Manage Pricing Procedures →",
      onClick: navigate("/master-data/customer-pricing-procedures")
    },
    {
      id: "document-pricing-procedures",
      title: "Document Pricing Procedures",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      description: "Configure document-level pricing rules and controls",
      linkText: "Manage Document Procedures →",
      onClick: navigate("/master-data/document-pricing-procedures")
    },
    {
      id: "pricing-procedures",
      title: "Pricing Procedures",
      icon: <Calculator className="h-5 w-5 text-emerald-600" />,
      description: "Define global pricing calculation schemas and steps",
      linkText: "Manage Pricing Procedures →",
      onClick: navigate("/sales/pricing-procedures")
    },
    {
      id: "pricing-procedure-determination",
      title: "Pricing Determination",
      icon: <ArrowRight className="h-5 w-5 text-orange-600" />,
      description: "Assign pricing procedures to sales areas and customers",
      linkText: "Manage Determinations →",
      onClick: navigate("/master-data/pricing-procedure-determination")
    }
  ];

  // State for tiles
  const [orgTiles, setOrgTiles] = useState(initialOrgTiles);
  const [coreTiles, setCoreTiles] = useState(initialCoreTiles);

  // Define additional tiles for search functionality  
  const additionalTiles = [
    {
      id: "approval-level",
      title: "Approval Levels",
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      description: "Purchase approval hierarchy and authorization limits",
      linkText: "Manage Approval Levels →",
      onClick: () => window.location.pathname = "/master-data/approval-level"
    },
    {
      id: "chart-of-accounts-master",
      title: "Chart of Accounts (A002)",
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      description: "Independent GL account chart definitions",
      linkText: "Configure Charts →",
      onClick: navigate("/master-data/chart-of-accounts")
    },
    {
      id: "credit-control-area",
      title: "Credit Control Area (A003)",
      icon: <CreditCard className="h-5 w-5 text-green-600" />,
      description: "Credit management and risk assessment areas",
      linkText: "Manage Credit Control →",
      onClick: navigate("/master-data/credit-control-area")
    },
    {
      id: "fiscal-year-variant",
      title: "Fiscal Year Variant (A004)",
      icon: <Calendar className="h-5 w-5 text-green-600" />,
      description: "Fiscal period structures and calendar definitions",
      linkText: "Configure Fiscal Years →",
      onClick: navigate("/master-data/fiscal-year-variant")
    },
    {
      id: "global-company-code",
      title: "Global Company Code (A005)",
      icon: <Building className="h-5 w-5 text-green-600" />,
      description: "Global consolidation and reporting entities",
      linkText: "Manage Global Codes →",
      onClick: navigate("/master-data/global-company-code")
    },
    {
      id: "vat-registration",
      title: "VAT Registration (A006)",
      icon: <Percent className="h-5 w-5 text-green-600" />,
      description: "Tax registration numbers and VAT configurations",
      linkText: "Manage VAT →",
      onClick: navigate("/master-data/vat-registration")
    },
    {
      id: "work-centers",
      title: "Work Centers",
      icon: <SettingsIcon className="h-5 w-5 text-blue-600" />,
      description: "Production capacity units",
      linkText: "View All Work Centers →",
      onClick: () => window.location.pathname = "/master-data/work-centers"
    },
    {
      id: "cost-centers",
      title: "Cost Centers",
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      description: "Organizational cost assignment units",
      linkText: "View All Cost Centers →",
      onClick: () => window.location.pathname = "/master-data/cost-centers"
    },
    {
      id: "profit-centers",
      title: "Profit Centers",
      icon: <BarChart2 className="h-5 w-5 text-blue-600" />,
      description: "Revenue and profitability tracking units",
      linkText: "View All Profit Centers →",
      onClick: () => window.location.pathname = "/master-data/profit-centers"
    },
    {
      id: "business-areas",
      title: "Business Areas",
      icon: <Building2 className="h-5 w-5 text-indigo-600" />,
      description: "Organizational units for financial reporting and consolidation",
      linkText: "View All Business Areas →",
      onClick: () => window.location.pathname = "/master-data/business-areas"
    },
    {
      id: "employees",
      title: "Employees",
      icon: <UserCircle className="h-5 w-5 text-blue-600" />,
      description: "Human resources and personnel records",
      linkText: "View All Employees →",
      onClick: () => window.location.pathname = "/master-data/employees"
    },
    {
      id: "asset-master",
      title: "Asset Master",
      icon: <Briefcase className="h-5 w-5 text-blue-600" />,
      description: "Fixed assets and depreciation rules",
      linkText: "View All Assets →",
      onClick: () => window.location.pathname = "/master-data/asset-master"
    },
    {
      id: "regions",
      title: "Regions",
      icon: <Package2 className="h-5 w-5 text-blue-600" />,
      description: "Global regions with country assignments",
      linkText: "Manage Regions →",
      onClick: () => window.location.pathname = "/master-data/regions"
    },
    {
      id: "posting-keys",
      title: "Posting Keys",
      icon: <Key className="h-5 w-5 text-blue-600" />,
      description: "Universal posting keys for automatic account determination",
      linkText: "Manage Posting Keys →",
      onClick: () => window.location.pathname = "/master-data/posting-keys"
    },
    {
      id: "purchasing-item-categories",
      title: "Purchase Item Categories",
      icon: <Tag className="h-5 w-5 text-blue-600" />,
      description: "Define item categories for purchasing documents",
      linkText: "Manage Item Categories →",
      onClick: () => window.location.pathname = "/master-data/purchasing-item-categories"
    },
    {
      id: "price-lists",
      title: "Price Lists",
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      description: "Sales pricing management with currency support",
      linkText: "Manage Price Lists →",
      onClick: () => window.location.pathname = "/master-data/price-lists"
    },
    {
      id: "payment-terms",
      title: "Payment Terms",
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      description: "Financial terms with discount structures",
      linkText: "Manage Payment Terms →",
      onClick: () => window.location.pathname = "/master-data/payment-terms"
    },
    {
      id: "movement-types",
      title: "Movement Types",
      icon: <Package className="h-5 w-5 text-blue-600" />,
      description: "Inventory transaction categorization",
      linkText: "Manage Movement Types →",
      onClick: () => window.location.pathname = "/master-data/movement-types"
    },
    {
      id: "movement-transaction-types",
      title: "Movement Transaction Types",
      icon: <Tag className="h-5 w-5 text-blue-600" />,
      description: "Transaction type categories for inventory movements",
      linkText: "Manage Movement Transaction Types →",
      onClick: () => window.location.pathname = "/master-data/movement-transaction-types"
    },
    {
      id: "transportation-groups",
      title: "Transportation Groups",
      icon: <Truck className="h-5 w-5 text-blue-600" />,
      description: "Define transportation groups (SAP OVLK)",
      linkText: "Manage Transportation Groups →",
      onClick: () => window.location.pathname = "/master-data/transportation-groups"
    },
    {
      id: "movement-classes",
      title: "Movement Classes",
      icon: <SettingsIcon className="h-5 w-5 text-blue-600" />,
      description: "Technical inventory movement logic and control parameters",
      linkText: "Manage Movement Classes →",
      onClick: () => window.location.pathname = "/master-data/movement-classes"
    },
    {
      id: "document-types",
      title: "Document Types",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      description: "Financial document classification",
      linkText: "Manage Document Types →",
      onClick: () => window.location.pathname = "/master-data/document-types"
    },
    {
      id: "cross-reference-analysis",
      title: "Cross-Reference Analysis",
      icon: <Network className="h-5 w-5 text-indigo-600" />,
      description: "View data relationships across all company codes",
      linkText: "View Cross-Reference Analysis →",
      onClick: () => window.location.pathname = "/master-data-cross-reference"
    }
  ];

  // Define new categorized master data tiles (21 additional tiles)
  const categorizedMasterDataTiles = [
    // Financial Category
    {
      id: "account-groups",
      title: "Account Groups",
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      description: "Customer and vendor account classifications",
      linkText: "Manage Account Groups →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/account-groups"
    },
    {
      id: "reconciliation-accounts",
      title: "Reconciliation Accounts",
      icon: <BarChart2 className="h-5 w-5 text-green-600" />,
      description: "GL accounts for automatic reconciliation",
      linkText: "Manage Reconciliation Accounts →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/reconciliation-accounts"
    },
    {
      id: "bank-master",
      title: "Bank Master",
      icon: <Building2 className="h-5 w-5 text-green-600" />,
      description: "Bank master data and financial institution information",
      linkText: "Manage Bank Master →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/bank-master"
    },


    {
      id: "account-types",
      title: "Account Types",
      icon: <FileText className="h-5 w-5 text-green-600" />,
      description: "Classification of document types (Customer, Vendor, GL, Asset)",
      linkText: "Manage Account Types →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/account-types"
    },
    {
      id: "accounting-principles",
      title: "Accounting Principles",
      icon: <FileText className="h-5 w-5 text-green-600" />,
      description: "Manage accounting standards and principles for financial reporting (IFRS, US GAAP, etc.)",
      linkText: "Manage Accounting Principles →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/accounting-principles"
    },
    {
      id: "tolerance-groups",
      title: "Tolerance Groups",
      icon: <Shield className="h-5 w-5 text-green-600" />,
      description: "Manage posting tolerance limits for financial document processing",
      linkText: "Manage Tolerance Groups →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/tolerance-groups"
    },
    {
      id: "management-control-areas",
      title: "Management Control Areas",
      icon: <Shield className="h-5 w-5 text-green-600" />,
      description: "Configure cost accounting and profitability analysis integration with financial systems",
      linkText: "Manage Control Areas →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/management-control-areas"
    },
    {
      id: "valuation-classes",
      title: "Valuation Classes",
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      description: "Material valuation and costing methods",
      linkText: "Manage Valuation Classes →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/valuation-classes"
    },
    {
      id: "material-account-determination",
      title: "Material Account Determination ",
      icon: <MapPin className="h-5 w-5 text-green-600" />,
      description: "Configure automatic GL account determination for material valuation",
      linkText: "Manage Account Determination →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/material-account-determination"
    },
    {
      id: "tax-management",
      title: "Tax Management",
      icon: <Percent className="h-5 w-5 text-green-600" />,
      description: "Comprehensive tax configuration: profiles, rules, and codes",
      linkText: "Manage Tax →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/tax-master"
    },
    {
      id: "valuation-grouping-codes",
      title: "Valuation Grouping Codes",
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      description: "Material valuation and costing methods",
      linkText: "Manage Valuation Grouping Codes →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/valuation-grouping-codes"
    },
    {
      id: "account-category-references",
      title: "Account Category References",
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      description: "Account category references for material valuation",
      linkText: "Manage Account Category References →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/account-category-references"
    },
    {
      id: "depreciation-methods",
      title: "Depreciation Methods",
      icon: <Calculator className="h-5 w-5 text-green-600" />,
      description: "Asset depreciation calculation methods and configurations",
      linkText: "Manage Depreciation Methods →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/depreciation-methods"
    },
    {
      id: "interest-calculators",
      title: "Interest Calculators",
      icon: <Calculator className="h-5 w-5 text-green-600" />,
      description: "Interest calculation methods for financial transactions (receivables, payables, bank accounts)",
      linkText: "Manage Interest Calculators →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/interest-calculators"
    },
    {
      id: "depreciation-areas",
      title: "Depreciation Areas",
      icon: <Calculator className="h-5 w-5 text-green-600" />,
      description: "Manage depreciation areas for different valuation purposes (Book, Tax, Management)",
      linkText: "Manage Depreciation Areas →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/depreciation-areas"
    },
    {
      id: "asset-classes",
      title: "Asset Classes",
      icon: <Briefcase className="h-5 w-5 text-green-600" />,
      description: "Asset classification and categorization for depreciation",
      linkText: "Manage Asset Classes →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/asset-classes"
    },
    {
      id: "asset-account-determination",
      title: "Account Determination",
      icon: <FileText className="h-5 w-5 text-green-600" />,
      description: "GL account assignment rules for asset transactions",
      linkText: "Manage Account Determination →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/asset-account-determination"
    },
    {
      id: "account-categories",
      title: "Account Categories",
      icon: <Tag className="h-5 w-5 text-green-600" />,
      description: "Account category master data for asset account determination",
      linkText: "Manage Account Categories →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/account-categories"
    },
    {
      id: "transaction-types",
      title: "Transaction Types",
      icon: <GitBranch className="h-5 w-5 text-green-600" />,
      description: "Transaction type master data for asset account determination",
      linkText: "Manage Transaction Types →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/transaction-types"
    },
    {
      id: "account-determination-keys",
      title: "Asset Account Profile",
      icon: <Key className="h-5 w-5 text-green-600" />,
      description: "Asset Account Profile configurations for asset classes",
      linkText: "Manage Asset Account Profile →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/asset-account-profiles"
    },
    {
      id: "account-keys",
      title: "Account Keys",
      icon: <Key className="h-5 w-5 text-purple-600" />,
      description: "GL account keys for pricing procedure steps (ERP)",
      linkText: "Manage Account Keys →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/account-keys"
    },
    {
      id: "account-determination-mapping",
      title: "Account Determination Mapping",
      icon: <MapPin className="h-5 w-5 text-indigo-600" />,
      description: "Map account keys to GL accounts by business scenario",
      linkText: "Manage Mappings →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/account-determination-mapping"
    },
    {
      id: "cost-center-categories",
      title: "Cost Center Categories",
      icon: <BarChart2 className="h-5 w-5 text-green-600" />,
      description: "Classify cost centers (e.g. Administration, Production)",
      linkText: "Manage Categories →",
      category: "Financial",
      onClick: () => window.location.pathname = "/master-data/cost-center-categories"
    },



    // Materials Category  
    {
      id: "material-types",
      title: "Material Types",
      icon: <Package2 className="h-5 w-5 text-blue-600" />,
      description: "Classification of materials and products",
      linkText: "Manage Material Types →",
      category: "Materials",
      onClick: () => window.location.pathname = "/master-data/material-types"
    },
    {
      id: "material-groups",
      title: "Material Groups",
      icon: <Package2 className="h-5 w-5 text-blue-600" />,
      description: "Grouping and categorization of materials",
      linkText: "Manage Material Groups →",
      category: "Materials",
      onClick: () => window.location.pathname = "/master-data/material-groups"
    },
    {
      id: "parent-categories",
      title: "Parent Categories",
      icon: <FolderTree className="h-5 w-5 text-blue-600" />,
      description: "Top-level category classifications",
      linkText: "Manage Parent Categories →",
      category: "Materials",
      onClick: () => window.location.pathname = "/master-data/parent-categories"
    },
    {
      id: "material-categories",
      title: "Material Categories",
      icon: <FolderTree className="h-5 w-5 text-blue-600" />,
      description: "Category classifications for account determination",
      linkText: "Manage Material Categories →",
      category: "Materials",
      onClick: () => window.location.pathname = "/master-data/material-categories"
    },

    {
      id: "pr-document-types",
      title: "PR Document Types",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      description: "Purchase requisition document types with item and processing controls",
      linkText: "Manage PR Document Types →",
      category: "Purchasing",
      onClick: () => window.location.pathname = "/master-data/pr-document-types"
    },
    {
      id: "po-document-types",
      title: "PO Document Types",
      icon: <FileText className="h-5 w-5 text-indigo-600" />,
      description: "Purchase order document types for procurement processes",
      linkText: "Manage PO Document Types →",
      category: "Purchasing",
      onClick: () => window.location.pathname = "/master-data/po-document-types"
    },

    {
      id: "mrp-controllers",
      title: "MRP Controllers",
      icon: <SettingsIcon className="h-5 w-5 text-blue-600" />,
      description: "Material Requirements Planning controller assignments",
      linkText: "Manage MRP Controllers →",
      category: "Materials",
      onClick: () => window.location.pathname = "/master-data/mrp-controllers"
    },

    // Sales Category
    {
      id: "price-lists-new",
      title: "Price Lists",
      icon: <DollarSign className="h-5 w-5 text-purple-600" />,
      description: "Customer pricing with validity periods",
      linkText: "Manage Price Lists →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/price-lists"
    },
    {
      id: "discount-groups",
      title: "Discount Groups",
      icon: <Percent className="h-5 w-5 text-purple-600" />,
      description: "Customer discount categories and rates",
      linkText: "Manage Discount Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/discount-groups"
    },
    {
      id: "credit-limit-groups",
      title: "Credit Limit Groups",
      icon: <CreditCard className="h-5 w-5 text-purple-600" />,
      description: "Customer credit risk classifications",
      linkText: "Manage Credit Limit Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/credit-limit-groups"
    },
    {
      id: "customer-groups",
      title: "Customer Groups",
      icon: <Users className="h-5 w-5 text-purple-600" />,
      description: "Customer classification and account assignments",
      linkText: "Manage Customer Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/customer-groups"
    },
    {
      id: "customer-types",
      title: "Customer Types",
      icon: <UserCircle className="h-5 w-5 text-purple-600" />,
      description: "Customer type classifications and business rules",
      linkText: "Manage Customer Types →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/customer-types"
    },
    {
      id: "sd-document-types",
      title: "Sales Document Types",
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      description: "Sales document type configurations and workflows",
      linkText: "Manage Sales Document Types →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/sd-document-types"
    },
    {
      id: "sales-document-categories",
      title: "Sales Document Categories",
      icon: <Tag className="h-5 w-5 text-purple-600" />,
      description: "Define how sales documents behave in the system",
      linkText: "Manage Sales Document Categories →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/sales-document-categories"
    },
    {
      id: "item-categories",
      title: "Item Categories",
      icon: <Tag className="h-5 w-5 text-purple-600" />,
      description: "Define sales & distribution item categories",
      linkText: "Manage Item Categories →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/item-categories"
    },
    {
      id: "condition-categories",
      title: "Condition Categories",
      icon: <Tag className="h-5 w-5 text-purple-600" />,
      description: "Manage pricing condition categories for sales orders",
      linkText: "Manage Condition Categories →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/condition-categories"
    },
    {
      id: "loading-groups",
      title: "Loading Groups ",
      icon: <Truck className="h-5 w-5 text-purple-600" />,
      description: "Define loading group codes for material logistics",
      linkText: "Manage Loading Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/loading-groups"
    },
    {
      id: "shipping-condition-keys",
      title: "Shipping Condition Keys ",
      icon: <Key className="h-5 w-5 text-purple-600" />,
      description: "Define shipping condition key codes for logistics",
      linkText: "Manage Shipping Condition Keys →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/shipping-condition-keys"
    },
    {
      id: "weight-groups",
      title: "Weight Groups",
      icon: <Scale className="h-5 w-5 text-purple-600" />,
      description: "Define weight group codes for logistics",
      linkText: "Manage Weight Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/weight-groups"
    },
    {
      id: "calculation-methods",
      title: "Calculation Types",
      icon: <Calculator className="h-5 w-5 text-purple-600" />,
      description: "Define methods and formulas for pricing calculations",
      linkText: "Manage Calculation Types →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/calculation-methods"
    },
    {
      id: "item-category-groups",
      title: "Item Category Groups",
      icon: <Grid3X3 className="h-5 w-5 text-purple-600" />,
      description: "Classify materials for sales item category determination",
      linkText: "Manage Item Category Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/item-category-groups"
    },
    {
      id: "item-category-determination",
      title: "Item Category Determination",
      icon: <GitBranch className="h-5 w-5 text-purple-600" />,
      description: "Configure item category determination rules for sales documents",
      linkText: "Manage Item Category Determination →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/item-category-determination"
    },
    {
      id: "sales-process-types",
      title: "Sales Process Types",
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      description: "Define process types for sales documents (ORDER, DELIVERY, BILLING)",
      linkText: "Manage Sales Process Types →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/sales-process-types"
    },
    {
      id: "countries",
      title: "Countries",
      icon: <Globe className="h-5 w-5 text-blue-600" />,
      description: "Country master data and geographic information",
      linkText: "Manage Countries →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/countries"
    },
    {
      id: "states",
      title: "States",
      icon: <MapPin className="h-5 w-5 text-blue-600" />,
      description: "State/province master data and geographic subdivisions",
      linkText: "Manage States →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/states"
    },
    {
      id: "tax-jurisdictions",
      title: "Tax Jurisdictions",
      icon: <Percent className="h-5 w-5 text-blue-600" />,
      description: "Tax jurisdiction master data for tax reporting and compliance",
      linkText: "Manage Tax Jurisdictions →",
      category: "Finance",
      onClick: () => window.location.pathname = "/master-data/tax-jurisdictions"
    },
    // Logistics Category
    {
      id: "incoterms",
      title: "Incoterms",
      icon: <Globe className="h-5 w-5 text-orange-600" />,
      description: "International trade terms and responsibilities",
      linkText: "Manage Incoterms →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/incoterms"
    },
    {
      id: "shipping-conditions",
      title: "Shipping Conditions",
      icon: <Truck className="h-5 w-5 text-orange-600" />,
      description: "Delivery methods and shipping requirements",
      linkText: "Manage Shipping Conditions →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/shipping-conditions"
    },
    {
      id: "shipping-point",
      title: "Shipping Point",
      icon: <Truck className="h-5 w-5 text-orange-600" />,
      description: "Manage shipping points for plant logistics",
      linkText: "Manage Shipping Points →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/shipping-point"
    },
    {
      id: "transportation-zones",
      title: "Transportation Zones",
      icon: <Globe className="h-5 w-5 text-orange-600" />,
      description: "Geographic zones for shipping calculations",
      linkText: "Manage Transportation Zones →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/transportation-zones"
    },
    {
      id: "route-schedules",
      title: "Route Schedules",
      icon: <Calendar className="h-5 w-5 text-orange-600" />,
      description: "Delivery routes and scheduling patterns",
      linkText: "Manage Route Schedules →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/route-schedules"
    },
    {
      id: "routes",
      title: "Routes",
      icon: <RouteIcon className="h-5 w-5 text-orange-600" />,
      description: "Define standard shipping routes and durations",
      linkText: "Manage Routes →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/routes"
    },
    {
      id: "shipping-point-determination",
      title: "Shipping Point Determination",
      icon: <Truck className="h-5 w-5 text-orange-600" />,
      description: "Rules for determining shipping points based on conditions",
      linkText: "Manage Determinations →",
      category: "Logistics",
      onClick: () => window.location.pathname = "/master-data/shipping-point-determination"
    },
    // Inventory Category
    {
      id: "warehouse-types",
      title: "Warehouse Types",
      icon: <Building className="h-5 w-5 text-teal-600" />,
      description: "Storage facility classifications",
      linkText: "Manage Warehouse Types →",
      category: "Inventory",
      onClick: () => window.location.pathname = "/master-data/warehouse-types"
    },
    {
      id: "movement-types-new",
      title: "Movement Types",
      icon: <Package className="h-5 w-5 text-teal-600" />,
      description: "Inventory transaction classifications",
      linkText: "Manage Movement Types →",
      category: "Inventory",
      onClick: () => window.location.pathname = "/master-data/movement-types"
    },
    // Operations Category
    {
      id: "reason-codes",
      title: "Reason Codes",
      icon: <FileText className="h-5 w-5 text-red-600" />,
      description: "Codes for inventory adjustments and exceptions",
      linkText: "Manage Reason Codes →",
      category: "Operations",
      onClick: () => window.location.pathname = "/master-data/reason-codes"
    },
    // Quality Category
    {
      id: "quality-grades",
      title: "Quality Grades",
      icon: <ClipboardCheck className="h-5 w-5 text-indigo-600" />,
      description: "Product quality classifications and standards",
      linkText: "Manage Quality Grades →",
      category: "Quality",
      onClick: () => window.location.pathname = "/master-data/quality-grades"
    },
    {
      id: "batch-classes",
      title: "Batch Classes",
      icon: <Package2 className="h-5 w-5 text-indigo-600" />,
      description: "Batch management and expiration tracking",
      linkText: "Manage Batch Classes →",
      category: "Quality",
      onClick: () => window.location.pathname = "/master-data/batch-classes"
    },
    // Tracking Category
    {
      id: "serial-number-profiles",
      title: "Serial Number Profiles",
      icon: <BarChart2 className="h-5 w-5 text-pink-600" />,
      description: "Asset tracking and warranty management",
      linkText: "Manage Serial Number Profiles →",
      category: "Tracking",
      onClick: () => window.location.pathname = "/master-data/serial-number-profiles"
    },
    // System Category
    {
      id: "document-types-new",
      title: "Document Types",
      icon: <FileText className="h-5 w-5 text-gray-600" />,
      description: "Business document classifications",
      linkText: "Manage Document Types →",
      category: "System",
      onClick: () => window.location.pathname = "/master-data/document-types"
    },
    {
      id: "number-ranges-new",
      title: "Number Ranges",
      icon: <SettingsIcon className="h-5 w-5 text-gray-600" />,
      description: "Automated numbering system configurations",
      linkText: "Manage Number Ranges →",
      category: "System",
      onClick: () => window.location.pathname = "/master-data/number-ranges"
    },
    {
      id: "customer-account-assignment-groups",
      title: "Customer Assignment Groups",
      icon: <Users className="h-5 w-5 text-indigo-600" />,
      description: "Manage customer account assignment groups for revenue determination",
      linkText: "Manage Customer Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/customer-account-assignment-groups"
    },
    {
      id: "material-account-assignment-groups",
      title: "Material Assignment Groups",
      icon: <Package2 className="h-5 w-5 text-indigo-600" />,
      description: "Manage material account assignment groups for revenue determination",
      linkText: "Manage Material Groups →",
      category: "Sales",
      onClick: () => window.location.pathname = "/master-data/material-account-assignment-groups"
    },
  ];

  // Load saved tile order on component mount
  useEffect(() => {
    try {
      // Load organizational tiles order
      const savedOrgTiles = localStorage.getItem('masterDataTiles-Organizational Master Data');
      if (savedOrgTiles) {
        const savedOrgOrder = JSON.parse(savedOrgTiles);
        // Merge saved order with new tiles - ensure all tiles are included
        // First, get all current tile IDs
        const currentOrgIds = initialOrgTiles.map(t => t.id);
        // Combine saved order with any new tiles not in saved order
        const allOrgIds = Array.from(new Set([...savedOrgOrder, ...currentOrgIds]));
        // Map IDs back to tile objects, preserving saved order for existing tiles
        const reorderedOrgTiles = allOrgIds
          .map(id => initialOrgTiles.find(t => t.id === id))
          .filter(Boolean); // Remove any undefined entries
        setOrgTiles(reorderedOrgTiles);
      } else {
        // No saved order, use initial tiles as-is
        setOrgTiles(initialOrgTiles);
      }

      // Load core tiles order
      const savedCoreTiles = localStorage.getItem('masterDataTiles-Core Master Data');
      if (savedCoreTiles) {
        const savedCoreOrder = JSON.parse(savedCoreTiles);
        // Get all current tile IDs
        const currentCoreIds = initialCoreTiles.map(t => t.id);

        // Check if there are new tiles not in saved order
        const newTileIds = currentCoreIds.filter(id => !savedCoreOrder.includes(id));

        // Merge: saved order first, then new tiles at the end
        const mergedOrder = [...savedCoreOrder, ...newTileIds];

        // Map IDs back to tile objects in the merged order
        const reorderedCoreTiles = mergedOrder
          .map(id => initialCoreTiles.find(t => t.id === id))
          .filter(Boolean); // Remove any undefined entries (for tiles that no longer exist)

        // Ensure all current tiles are included (in case some were filtered out)
        const finalCoreTiles = [...reorderedCoreTiles];
        initialCoreTiles.forEach(tile => {
          if (!finalCoreTiles.find(t => t.id === tile.id)) {
            finalCoreTiles.push(tile);
          }
        });

        setCoreTiles(finalCoreTiles);
      } else {
        // No saved order, use initial tiles as-is
        setCoreTiles(initialCoreTiles);
      }
    } catch (error) {
      console.error("Failed to load saved tile order:", error);
    }
  }, []);

  // Filter tiles based on search term
  const filterTiles = (tiles) => {
    if (!searchTerm) return tiles;
    const searchLower = searchTerm.toLowerCase();
    return tiles.filter(tile => {
      const matchesTitle = tile.title.toLowerCase().includes(searchLower);
      const matchesDescription = tile.description.toLowerCase().includes(searchLower);
      const matchesId = tile.id.toLowerCase().includes(searchLower);
      // Also check if search matches any word in the title
      const titleWords = tile.title.toLowerCase().split(' ');
      const matchesTitleWord = titleWords.some(word => word.includes(searchLower) || searchLower.includes(word));
      return matchesTitle || matchesDescription || matchesId || matchesTitleWord;
    });
  };

  // Calculate total tiles count
  const totalTilesCount = orgTiles.length + coreTiles.length + additionalTiles.length + categorizedMasterDataTiles.length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Master Data Management</h1>

        {/* Search Bar with Tile Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-2 border-blue-500 rounded-lg">
            <Database className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-600 font-semibold uppercase">Tiles</span>
              <span className="text-base font-bold text-blue-700">{totalTilesCount}</span>
            </div>
          </div>
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search master data entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Showing results for "{searchTerm}" • {filterTiles([...orgTiles, ...coreTiles, ...additionalTiles, ...categorizedMasterDataTiles]).length} items found
        </div>
      )}

      {/* Organizational Master Data with DraggableTiles */}
      <DraggableTiles
        title="Organizational Master Data"
        description="Defines your company's hierarchy and must be created before transactional data."
        initialTiles={filterTiles(orgTiles)}
      />

      {/* Core Master Data with DraggableTiles */}
      <DraggableTiles
        title="Core Master Data"
        description="Essential master records required for business operations."
        initialTiles={filterTiles(coreTiles)}
      />

      {/* Additional Master Data with draggable tiles */}
      <DraggableTiles
        title="Additional Master Data"
        description="Supporting master records for specialized business processes."
        initialTiles={filterTiles(additionalTiles)}
      />

      {/* Categorized Master Data (21 new tiles) */}
      <DraggableTiles
        title="Categorized Master Data"
        description="New master data entities organized by business categories: Financial, Materials, Sales, Logistics, Inventory, Operations, Quality, Tracking, and System."
        initialTiles={filterTiles(categorizedMasterDataTiles)}
      />
    </div>
  );
};

// Main application router
function Router() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Switch>
            {/* Dashboards */}
            <Route path="/" component={Dashboard} />
            <Route path="/custom-dashboard" component={CustomizableDashboard} />

            {/* Master Data Module and Submodules */}
            <Route path="/master-data" component={MasterDataDashboard} />
            <Route path="/master-data/complete-demo" component={MasterDataDashboard} />
            <Route path="/master-data-cross-reference" component={MasterDataCrossReference} />
            <Route path="/master-data/uom" component={UnitOfMeasure} />
            <Route path="/master-data/company-code" component={CompanyCode} />
            <Route path="/master-data/customer-pricing-procedures" component={CustomerPricingProcedures} />


            <Route path="/master-data/document-pricing-procedures" component={DocumentPricingProcedures} />
            <Route path="/master-data/pricing-procedure-determination" component={PricingProcedureDetermination} />
            <Route path="/sales/pricing-procedures" component={PricingProcedures} />
            <Route path="/master-data/industry-sector" component={IndustrySector} />
            <Route path="/master-data/plant" component={Plant} />
            <Route path="/master-data/currency" component={Currency} />
            <Route path="/master-data/storage-location" component={StorageLocation} />
            <Route path="/master-data/sales-organization" component={SalesOrganization} />
            <Route path="/master-data/sales-office" component={SalesOffice} />
            <Route path="/master-data/purchase-organization" component={PurchaseOrganization} />
            <Route path="/master-data/purchase-references" component={PurchaseReferences} />
            <Route path="/master-data/credit-control" component={CreditControl} />
            <Route path="/master-data/approval-level" component={ApprovalLevels} />
            <Route path="/master-data/material" component={MaterialMaster} />
            <Route path="/master-data/material-master" component={MaterialMaster} />
            <Route path="/master-data/mrp-controllers" component={MRPControllers} />
            <Route path="/master-data/routing" component={lazy(() => import('./pages/master-data/RoutingManagement'))} />
            <Route path="/master-data/sd-document-types" component={SDDocumentTypes} />
            <Route path="/master-data/sales-document-categories" component={SalesDocumentCategories} />
            <Route path="/master-data/distribution-channels" component={DistributionChannels} />
            <Route path="/distribution-channels" component={DistributionChannels} />
            <Route path="/master-data/divisions" component={Divisions} />
            <Route path="/master-data/sales-areas" component={SalesAreas} />
            <Route path="/material-master" component={MaterialMaster} />


            <Route path="/master-data/vendor" component={Vendor} />
            <Route path="/master-data/bom" component={BomsContent} />
            <Route path="/master-data/work-centers" component={WorkCenters} />
            <Route path="/master-data/cost-centers" component={CostCenters} />
            <Route path="/master-data/cost-center-categories" component={CostCenterCategories} />
            <Route path="/master-data/profit-centers" component={ProfitCenters} />
            <Route path="/master-data/asset-classes" component={AssetClasses} />
            <Route path="/master-data/asset-account-determination" component={AssetAccountDetermination} />
            <Route path="/master-data/account-categories" component={AccountCategories} />
            <Route path="/master-data/account-category-references" component={AccountCategoryReferences} />
            <Route path="/master-data/transaction-types" component={TransactionTypes} />
            <Route path="/master-data/asset-account-profiles" component={lazy(() => import('./pages/master-data/AssetAccountProfiles'))} />
            <Route path="/master-data/account-keys" component={lazy(() => import('./pages/master-data/AccountKeys'))} />
            <Route path="/master-data/account-determination-mapping" component={lazy(() => import('./pages/master-data/AccountDeterminationMapping'))} />
            <Route path="/master-data/business-areas" component={BusinessArea} />
            <Route path="/master-data/employees" component={Employees} />
            <Route path="/master-data/asset-master" component={AssetMaster} />
            <Route path="/master-data/depreciation-methods" component={DepreciationMethods} />
            <Route path="/master-data/depreciation-areas" component={DepreciationAreas} />
            <Route path="/master-data/regions" component={Regions} />
            <Route path="/master-data/posting-keys" component={PostingKeys} />
            <Route path="/master-data/purchasing-item-categories" component={PurchasingItemCategories} />
            <Route path="/master-data/currencies" component={Currencies} />
            <Route path="/master-data/finance-currencies" component={FinanceCurrencies} />
            <Route path="/master-data/supply-types" component={SupplyTypes} />
            <Route path="/master-data/factory-calendar" component={FactoryCalendar} />
            <Route path="/master-data/holiday-calendar" component={HolidayCalendar} />
            <Route path="/master-data/purchasing-groups" component={PurchasingGroups} />
            <Route path="/master-data/vendor-groups" component={VendorGroups} />
            <Route path="/master-data/customer-groups" component={CustomerGroups} />
            <Route path="/master-data/customer-types" component={CustomerTypes} />
            <Route path="/master-data/countries" component={Countries} />
            <Route path="/master-data/states" component={States} />
            <Route path="/master-data/tax-jurisdictions" component={TaxJurisdictions} />
            <Route path="/master-data/tax-rules" component={TaxRules} />
            <Route path="/master-data/tax-profiles" component={TaxProfiles} />
            <Route path="/master-data/material-groups" component={MaterialGroups} />
            <Route path="/master-data/distribution-channels" component={DistributionChannels} />
            <Route path="/master-data/account-groups" component={AccountGroups} />
            <Route path="/master-data/reconciliation-accounts" component={ReconciliationAccounts} />
            <Route path="/master-data/bank-master" component={BankMaster} />
            <Route path="/master-data/account-id" component={AccountId} />
            <Route path="/master-data/tax-configuration" component={TaxManagement} />
            <Route path="/master-data/tax-master" component={TaxManagement} />
            <Route path="/master-data/tax-codes" component={TaxManagement} />
            <Route path="/master-data/tolerance-groups" component={ToleranceGroups} />
            <Route path="/master-data/management-control-areas" component={ControllingAreaIntegration} />
            <Route path="/master-data/currency-denomination" component={CurrencyDenominationNew} />
            <Route path="/master-data/exchange-rate-type" component={ExchangeRateTypeNew} />
            <Route path="/master-data/fiscal-calendar" component={FiscalCalendar} />
            <Route path="/master-data/fiscal-year-variant" component={FiscalYearVariant} />
            <Route path="/master-data/fiscal-period" component={FiscalPeriod} />
            <Route path="/master-data/gl-accounts" component={GeneralLedgerAccounts} />
            <Route path="/master-data/gl-account-groups" component={GLAccountGroups} />
            <Route path="/master-data/posting-period-controls" component={PostingPeriodControls} />
            <Route path="/master-data/retained-earnings-accounts" component={RetainedEarningsAccounts} />
            <Route path="/master-data/chart-of-depreciation" component={ChartOfDepreciation} />
            <Route path="/master-data/purchasing-groups" component={PurchasingGroups} />
            <Route path="/master-data/purchasing-organizations" component={PurchasingOrganizations} />
            <Route path="/master-data/valuation-classes" component={ValuationClasses} />
            <Route path="/master-data/valuation-grouping-codes" component={ValuationGroupingCodes} />
            <Route path="/master-data/material-account-determination" component={MaterialAccountDetermination} />
            <Route path="/master-data/loading-groups" component={LoadingGroups} />
            <Route path="/master-data/transportation-groups" component={TransportationGroups} />
            <Route path="/master-data/shipping-condition-keys" component={ShippingConditionKeys} />
            <Route path="/master-data/weight-groups" component={WeightGroups} />
            <Route path="/master-data/routes" component={RoutesMaster} />
            <Route path="/master-data/movement-types" component={MovementTypes} />

            {/* Categorized Master Data Routes - 21 New Tiles - All redirect to main Master Data dashboard */}

            {/* New standardized master data routes */}
            <Route path="/master-data/material-master" component={MaterialMaster} />
            <Route path="/master-data/customer-master" component={CustomerMaster} />
            <Route path="/master-data/vendor-master" component={Vendor} />
            <Route path="/master-data/vendor-material-assignment" component={VendorMaterialAssignment} />
            <Route path="/master-data/bill-of-materials" component={BomsContent} />
            <Route path="/master-data/units-of-measure" component={UnitsOfMeasure} />
            <Route path="/master-data/customer-account-assignment-groups" component={CustomerAccountAssignmentGroups} />
            <Route path="/master-data/material-account-assignment-groups" component={MaterialAccountAssignmentGroups} />

            {/* Transport System */}
            <Route path="/transport" component={Transport} />
            <Route path="/transport/admin" component={TransportAdmin} />
            <Route path="/github-setup" component={GitHubSetup} />
            <Route path="/github-integration" component={GitHubIntegration} />

            {/* Transaction Applications */}
            <Route path="/transactions" component={lazy(() => import("./pages/Transactions"))} />

            {/* All Transaction Component Routes - Complete Set */}
            <Route path="/transactions/accounts-payable" component={lazy(() => import("./pages/transactions/AccountsPayable"))} />
            <Route path="/transactions/accounts-receivable" component={lazy(() => import("./pages/transactions/AccountsReceivable"))} />
            <Route path="/transactions/activity-based-costing" component={lazy(() => import("./pages/transactions/ActivityBasedCosting"))} />
            <Route path="/transactions/advanced-authorization-management" component={lazy(() => import("./pages/transactions/AdvancedAuthorizationManagement"))} />
            <Route path="/transactions/allocation-posting" component={lazy(() => import("./pages/transactions/AllocationPosting"))} />
            <Route path="/transactions/asset-accounting" component={lazy(() => import("./pages/transactions/AssetAccounting"))} />
            <Route path="/transactions/auc" component={AUCManagement} />
            <Route path="/transactions/auc/:id" component={AUCDetails} />
            <Route path="/transactions/automatic-clearing" component={lazy(() => import("./pages/transactions/AutomaticClearing"))} />
            <Route path="/transactions/balance-sheet-reporting" component={lazy(() => import("./pages/transactions/BalanceSheetReporting"))} />
            <Route path="/transactions/bank-statement-processing" component={lazy(() => import("./pages/transactions/BankStatementProcessing"))} />
            <Route path="/transactions/batch-management" component={lazy(() => import("./pages/transactions/BatchManagement"))} />
            <Route path="/transactions/bill-of-exchange-management" component={lazy(() => import("./pages/transactions/BillOfExchangeManagement"))} />
            <Route path="/transactions/capacity-planning" component={lazy(() => import("./pages/transactions/CapacityPlanning"))} />
            <Route path="/transactions/cash-management" component={lazy(() => import("./pages/transactions/CashManagement"))} />
            <Route path="/transactions/consignment-processing" component={lazy(() => import("./pages/transactions/ConsignmentProcessing"))} />
            <Route path="/transactions/contract-management" component={lazy(() => import("./pages/transactions/ContractManagement"))} />
            <Route path="/transactions/cost-center-accounting" component={lazy(() => import("./pages/transactions/CostCenterAccounting"))} />
            <Route path="/transactions/cost-center-planning" component={lazy(() => import("./pages/transactions/CostCenterPlanning"))} />
            <Route path="/transactions/credit-management" component={lazy(() => import("./pages/transactions/CreditManagement"))} />
            <Route path="/transactions/document-number-ranges" component={lazy(() => import("./pages/transactions/DocumentNumberRanges"))} />
            <Route path="/transactions/document-posting" component={lazy(() => import("./pages/transactions/DocumentPosting"))} />
            <Route path="/transactions/document-posting-system" component={lazy(() => import("./pages/transactions/DocumentPostingSystem"))} />
            <Route path="/transactions/down-payment-management" component={lazy(() => import("./pages/transactions/DownPaymentManagement"))} />
            <Route path="/transactions/dunning-management" component={lazy(() => import("./pages/transactions/DunningManagement"))} />
            <Route path="/transactions/exchange-rate-management" component={lazy(() => import("./pages/transactions/ExchangeRateManagement"))} />
            <Route path="/transactions/financial-reporting" component={lazy(() => import("./pages/transactions/FinancialReporting"))} />
            <Route path="/transactions/foreign-currency-valuation" component={lazy(() => import("./pages/transactions/ForeignCurrencyValuation"))} />
            <Route path="/transactions/funds-management" component={lazy(() => import("./pages/transactions/FundsManagement"))} />
            <Route path="/transactions/general-ledger-posting" component={lazy(() => import("./pages/transactions/GeneralLedgerPosting"))} />
            <Route path="/transactions/goods-issue" component={lazy(() => import("./pages/transactions/GoodsIssue"))} />
            <Route path="/transactions/goods-receipt" component={lazy(() => import("./pages/transactions/GoodsReceipt"))} />
            <Route path="/transactions/intercompany-transactions" component={lazy(() => import("./pages/transactions/IntercompanyTransactions"))} />
            <Route path="/transactions/internal-orders" component={lazy(() => import("./pages/transactions/InternalOrders"))} />
            <Route path="/transactions/inventory-management" component={lazy(() => import("./pages/transactions/InventoryManagement"))} />
            <Route path="/transactions/inventory-valuation" component={lazy(() => import("./pages/transactions/InventoryValuation"))} />
            <Route path="/transactions/invoice" component={lazy(() => import("./pages/transactions/Invoice"))} />
            <Route path="/transactions/invoice-verification" component={lazy(() => import("./pages/transactions/InvoiceVerification"))} />
            <Route path="/transactions/ledger-management" component={lazy(() => import("./pages/transactions/LedgerManagement"))} />
            <Route path="/transactions/management-reporting-dashboard-enhancement" component={lazy(() => import("./pages/transactions/ManagementReportingDashboardEnhancement"))} />
            <Route path="/transactions/material-requirement-planning" component={lazy(() => import("./pages/transactions/MaterialRequirementPlanning"))} />
            <Route path="/transactions/material-reservation" component={lazy(() => import("./pages/transactions/MaterialReservation"))} />
            <Route path="/transactions/mm-fi-integration-enhancement" component={lazy(() => import("./pages/transactions/MMFIIntegrationEnhancement"))} />
            <Route path="/transactions/overhead-calculation" component={lazy(() => import("./pages/transactions/OverheadCalculation"))} />
            <Route path="/transactions/payment-run" component={lazy(() => import("./pages/transactions/PaymentRun"))} />
            <Route path="/transactions/payroll-processing" component={lazy(() => import("./pages/transactions/PayrollProcessing"))} />
            <Route path="/transactions/period-end-closing" component={lazy(() => import("./pages/finance/PeriodEndClosing"))} />
            <Route path="/transactions/physical-inventory" component={lazy(() => import("./pages/transactions/PhysicalInventory"))} />
            <Route path="/transactions/pricing-management" component={lazy(() => import("./pages/transactions/PricingManagement"))} />
            <Route path="/transactions/product-costing" component={lazy(() => import("./pages/transactions/ProductCosting"))} />
            <Route path="/transactions/production-order-processing" component={lazy(() => import("./pages/transactions/ProductionOrderProcessing"))} />
            <Route path="/transactions/profit-center-accounting" component={lazy(() => import("./pages/transactions/ProfitCenterAccounting"))} />
            <Route path="/transactions/profit-loss-reporting" component={lazy(() => import("./pages/transactions/ProfitLossReporting"))} />
            <Route path="/transactions/project-accounting" component={lazy(() => import("./pages/transactions/ProjectAccounting"))} />
            <Route path="/transactions/purchase-requisition" component={lazy(() => import("./pages/transactions/PurchaseRequisition"))} />
            <Route path="/transactions/quality-management" component={lazy(() => import("./pages/transactions/QualityManagement"))} />
            <Route path="/transactions/quotation-management" component={lazy(() => import("./pages/transactions/QuotationManagement"))} />
            <Route path="/transactions/recurring-entries" component={lazy(() => import("./pages/transactions/RecurringEntries"))} />
            <Route path="/transactions/sales-billing" component={lazy(() => import("./pages/transactions/SalesBilling"))} />
            <Route path="/transactions/sales-order" component={lazy(() => import("./pages/transactions/SalesOrder"))} />
            <Route path="/transactions/customer-invoice-processing" component={() => <CustomerInvoiceProcessing />} />
            <Route path="/transactions/sales-order-management" component={() => <SalesOrderTransactionManagement />} />
            <Route path="/transactions/material-master-management" component={() => <MaterialMasterManagement />} />
            <Route path="/transactions/production-order-management" component={() => <ProductionOrderManagement />} />
            <Route path="/transactions/vendor-invoice-verification" component={lazy(() => import("./pages/transactions/VendorInvoiceVerification"))} />
            <Route path="/transactions/goods-receipt-processing" component={lazy(() => import("./pages/transactions/GoodsReceiptProcessing"))} />
            <Route path="/transactions/sd-fi-integration-enhancement" component={lazy(() => import("./pages/transactions/SDFIIntegrationEnhancement"))} />
            <Route path="/transactions/serial-number-management" component={lazy(() => import("./pages/transactions/SerialNumberManagement"))} />
            <Route path="/transactions/serial-number-tracking" component={lazy(() => import("./pages/transactions/SerialNumberTracking"))} />
            <Route path="/transactions/shop-floor-control" component={lazy(() => import("./pages/transactions/ShopFloorControl"))} />
            <Route path="/transactions/stock-transfer" component={lazy(() => import("./pages/transactions/StockTransfer"))} />
            <Route path="/transactions/subcontracting" component={lazy(() => import("./pages/transactions/Subcontracting"))} />
            <Route path="/transactions/supplier-evaluation" component={lazy(() => import("./pages/transactions/SupplierEvaluation"))} />
            <Route path="/transactions/tax-processing" component={lazy(() => import("./pages/transactions/TaxProcessing"))} />
            <Route path="/transactions/tax-reporting" component={lazy(() => import("./pages/transactions/TaxReporting"))} />
            <Route path="/transactions/credit-management" component={lazy(() => import("./pages/transactions/CreditManagement"))} />
            <Route path="/transactions/goods-receipt" component={lazy(() => import("./pages/transactions/GoodsReceipt"))} />
            <Route path="/transactions/time-management" component={lazy(() => import("./pages/transactions/TimeManagement"))} />
            <Route path="/transactions/transfer-posting" component={lazy(() => import("./pages/transactions/TransferPosting"))} />
            <Route path="/transactions/validation-substitution" component={lazy(() => import("./pages/transactions/ValidationSubstitution"))} />
            <Route path="/transactions/variance-analysis" component={lazy(() => import("./pages/transactions/VarianceAnalysis"))} />
            <Route path="/transactions/inventory-finance-cost" component={lazy(() => import("./pages/transactions/InventoryFinanceCostManagement"))} />
            <Route path="/transactions/vendor-evaluation" component={lazy(() => import("./pages/transactions/VendorEvaluation"))} />
            <Route path="/transactions/work-center-management" component={lazy(() => import("./pages/transactions/WorkCenterManagement"))} />
            <Route path="/transactions/workflow-management" component={lazy(() => import("./pages/transactions/WorkflowManagement"))} />

            {/* Enhanced Transaction Routes */}
            <Route path="/transactions/cash-management-enhanced" component={lazy(() => import("./pages/transactions/CashManagement"))} />
            <Route path="/transactions/tax-reporting-enhanced" component={lazy(() => import("./pages/transactions/TaxReporting"))} />
            <Route path="/transactions/intercompany-transactions-enhanced" component={lazy(() => import("./pages/transactions/IntercompanyTransactions"))} />
            <Route path="/transactions/inventory-valuation-enhanced" component={lazy(() => import("./pages/transactions/InventoryValuation"))} />
            <Route path="/transactions/period-end-closing-enhanced" component={lazy(() => import("./pages/finance/PeriodEndClosing"))} />
            <Route path="/transactions/down-payment-management-enhanced" component={lazy(() => import("./pages/transactions/DownPaymentManagement"))} />
            <Route path="/transactions/recurring-entries-enhanced" component={lazy(() => import("./pages/transactions/RecurringEntries"))} />
            <Route path="/transactions/automatic-clearing-enhanced" component={lazy(() => import("./pages/transactions/AutomaticClearing"))} />
            <Route path="/transactions/asset-accounting-enhanced" component={lazy(() => import("./pages/transactions/AssetAccounting"))} />
            <Route path="/transactions/bank-statement-processing-enhanced" component={lazy(() => import("./pages/transactions/BankStatementProcessing"))} />

            {/* Other modules */}
            <Route path="/help" component={Help} />
            <Route path="/user-guides" component={UserGuides} />
            <Route path="/workspace-manager" component={WorkspaceManager} />
            <Route path="/honest-development-status" component={HonestDevelopmentStatus} />
            <Route path="/ai-agents" component={AIAgentsDemo} />
            <Route path="/agents/data-integrity" component={DataIntegrityAgent} />
            <Route path="/master-data/chart-of-accounts" component={MasterDataChartOfAccounts} />
            <Route path="/master-data/credit-control-area" component={CreditControl} />
            <Route path="/master-data/global-company-code" component={GlobalCompanyCodePage} />
            <Route path="/master-data/vat-registration" component={VATRegistrationPage} />
            <Route path="/master-data/price-lists" component={PriceLists} />
            <Route path="/master-data/payment-terms" component={PaymentTerms} />
            <Route path="/master-data/movement-types" component={MovementTypes} />
            <Route path="/master-data/movement-classes-config" component={MovementClassesConfig} />
            <Route path="/master-data/transaction-types-config" component={TransactionTypesConfig} />
            <Route path="/master-data/baseline-date-config" component={BaselineDateConfig} />
            <Route path="/master-data/document-categories-config" component={DocumentCategoriesConfig} />
            <Route path="/master-data/account-types" component={AccountTypesConfig} />
            <Route path="/master-data/account-types-config" component={AccountTypesConfig} />
            <Route path="/master-data/accounting-principles" component={AccountingPrinciples} />
            <Route path="/master-data/tolerance-groups" component={ToleranceGroups} />
            <Route path="/master-data/number-range-objects-config" component={NumberRangeObjectsConfig} />
            <Route path="/master-data/inventory-directions-config" component={InventoryDirectionsConfig} />
            <Route path="/master-data/ledgers" component={Ledgers} />
            <Route path="/master-data/document-splitting" component={DocumentSplitting} />
            <Route path="/master-data/serial-number-profiles" component={lazy(() => import('./pages/master-data/SerialNumberProfilesPage'))} />
            <Route path="/master-data/reason-codes" component={ReasonCodes} />
            <Route path="/master-data/quality-grades" component={QualityGrades} />
            <Route path="/master-data/batch-classes" component={BatchClasses} />
            <Route path="/master-data/warehouse-types" component={WarehouseTypes} />
            <Route path="/master-data/incoterms" component={Incoterms} />
            <Route path="/master-data/shipping-conditions" component={ShippingConditions} />
            <Route path="/master-data/shipping-point" component={ShippingPoint} />
            <Route path="/master-data/transportation-zones" component={lazy(() => import('./pages/master-data/TransportationZones'))} />
            <Route path="/master-data/route-schedules" component={RouteSchedules} />
            <Route path="/master-data/discount-groups" component={DiscountGroups} />
            <Route path="/master-data/credit-limit-groups" component={CreditLimitGroups} />
            <Route path="/master-data/material-types" component={MaterialTypes} />
            <Route path="/master-data/material-account-determination" component={MaterialAccountDetermination} />
            <Route path="/master-data/parent-categories" component={ParentCategories} />
            <Route path="/master-data/material-categories" component={MaterialCategories} />
            <Route path="/master-data/account-groups" component={AccountGroups} />
            <Route path="/master-data/reconciliation-accounts" component={ReconciliationAccounts} />
            <Route path="/master-data/document-types" component={DocumentTypes} />
            <Route path="/master-data/number-ranges" component={NumberRanges} />
            <Route path="/master-data/pr-document-types" component={PRDocumentTypes} />
            <Route path="/master-data/po-document-types" component={PODocumentTypes} />
            <Route path="/data-integrity" component={lazy(() => import("./pages/agents/EnhancedDataIntegrityAnalysis"))} />
            <Route path="/agents/data-integrity-sidebyside" component={lazy(() => import("./pages/agents/EnhancedDataIntegrityAnalysis"))} />
            <Route path="/test-results" component={lazy(() => import("./pages/TestResults"))} />
            <Route path="/crosscheck-lineage" component={CrossCheckLineage} />
            <Route path="/issues" component={IssuesMonitoringDashboard} />
            <Route path="/system-integrity" component={SystemIntegrityDashboard} />
            <Route path="/change-log" component={ChangeLogDashboard} />

            {/* Inventory Management */}
            <Route path="/inventory-management" component={InventoryManagement} />
            <Route path="/products" component={Products} />

            {/* Gigantic Tables Management */}
            <Route path="/gigantic-tables" component={lazy(() => import("./pages/GiganticTablesManagement"))} />

            {/* OneProject Management - Unified Business Data Platform */}
            <Route path="/one-project" component={OneProjectManagement} />
            <Route path="/one-project-sync" component={OneProjectSyncManagement} />

            {/* AI Agents Management */}
            <Route path="/ai-agents" component={LiveAIAgentsInterface} />
            <Route path="/ai-agents-management" component={AgenticAIManagement} />

            {/* Admin Section */}
            <Route path="/admin/users" component={lazy(() => import("./pages/admin/UserRoleManagement"))} />
            <Route path="/admin/rbac" component={lazy(() => import("./pages/admin/UserRoleManagement"))} />

            <Route path="/sales" component={Sales} />
            <Route path="/sales/leads" component={SalesLeads} />
            <Route path="/sales/opportunities" component={SalesOpportunities} />
            <Route path="/sales/quotes" component={SalesQuotes} />
            <Route path="/sales/quotes/approved" component={SalesQuotes} />
            <Route path="/sales/quotes/create" component={CreateQuotation} />
            <Route path="/sales/quote-approval" component={SalesQuoteApproval} />
            {/* <Route path="/sales/orders" component={SalesOrderList} /> */}
            {/* <Route path="/sales/orders/new" component={SalesOrder} /> */}
            <Route path="/sales/orders/new-with-incoterms" component={SalesOrderWithIncoterms} />
            <Route path="/sales/orders/test/:id" component={TestDynamicRoute} />
            <Route path="/sales/orders/view/:id" component={SalesOrderDetail} />
            {/* <Route path="/sales/orders/:id/edit" component={SalesOrder} /> */}
            {/* <Route path="/sales/orders/:id" component={SalesOrderDetail} /> */}
            <Route path="/sales/order-to-cash" component={OrderToCash} />
            <Route path="/sales/pricing-procedures" component={PricingProcedures} />
            <Route path="/sales/access-sequences" component={AccessSequences} />
            <Route path="/sales/distribution-config" component={SalesDistributionConfig} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/purchase" component={PurchaseModule} />
            <Route path="/production" component={ProductionModule} />
            <Route path="/production-planning" component={ProductionPlanning} />
            <Route path="/hr" component={HR} />

            {/* Transaction Process Flows */}
            <Route path="/transactions/sales-order" component={SalesOrderTransaction} />
            <Route path="/transactions/invoice" component={InvoiceTransaction} />

            {/* Application Tiles Management - Sheet 1 Critical Infrastructure */}
            <Route path="/transactions/application-tiles" component={ApplicationTilesManagement} />

            {/* Finance Module and Submodules */}
            <Route path="/finance" component={Finance} />
            <Route path="/finance/tiles" component={lazy(() => import("./pages/finance/FinanceTiles"))} />
            <Route path="/finance/ap-tiles" component={lazy(() => import("./pages/finance/APTiles"))} />

            {/* Enhanced Finance Modules */}
            <Route path="/finance/gl-enhanced" component={lazy(() => import("./pages/finance/GLEnhanced"))} />
            <Route path="/finance/asset-management-enhanced" component={lazy(() => import("./pages/finance/AssetManagementEnhanced"))} />

            <Route path="/finance/ap-enhanced" component={lazy(() => import("./pages/finance/APEnhanced"))} />
            <Route path="/finance/ar-enhanced" component={AccountsReceivable} />
            <Route path="/finance/period-closing" component={PeriodEndClosing} />
            <Route path="/finance/accruals" component={AccrualManagement} />
            <Route path="/finance/year-end-closing" component={lazy(() => import("./pages/finance/YearEndClosingDashboard"))} />

            <Route path="/finance/configuration" component={FinancialConfiguration} />
            <Route path="/finance/configuration-assistant" component={SimpleFinancialConfig} />
            <Route path="/finance/end-to-end-guide" component={EndToEndFinancialGuide} />
            <Route path="/finance/accounts-receivable" component={AccountsReceivable} />
            <Route path="/finance/ar-complete" component={lazy(() => import("./pages/finance/ARComplete"))} />

            {/* Authorization Management Settings */}
            <Route path="/finance/settings/authorization-levels" component={() => <AuthorizationLevelsPage />} />
            <Route path="/finance/settings/vendor-payment-approval" component={() => <VendorPaymentApprovalPage />} />
            <Route path="/finance/payment-proposals" component={lazy(() => import("./pages/finance/PaymentProposalDashboard"))} />
            <Route path="/finance/accounts-payable" component={AccountsPayable} />
            <Route path="/finance/credit-management" component={CreditManagement} />
            <Route path="/finance/general-ledger" component={GeneralLedger} />
            <Route path="/general-ledger" component={GeneralLedger} />
            <Route path="/finance/reconciliation" component={Reconciliation} />
            <Route path="/controlling" component={Controlling} />

            {/* Tools and Utilities */}
            <Route path="/tools" component={Tools} />
            <Route path="/tools/master-data-checker" component={MasterDataChecker} />
            <Route path="/tools/master-data-protection" component={MasterDataProtection} />
            <Route path="/tools/test-application" component={TestApplication} />
            <Route path="/tools/api-tester" component={ApiTester} />
            <Route path="/tools/metrics" component={SystemMetrics} />
            <Route path="/tools/business-integration-wizard" component={lazy(() => import("@/pages/tools/BusinessIntegrationWizard"))} />
            <Route path="/tools/business-templates-help" component={lazy(() => import("@/pages/BusinessTemplatesHelp"))} />
            <Route path="/tools/business-rule-testing" component={lazy(() => import("@/pages/BusinessRuleTesting"))} />

            {/* Reports, Upload and Settings */}
            <Route path="/reports" component={lazy(() => import("./pages/ReportsFixed"))} />
            <Route path="/enterprise-reports" component={EnterpriseReports} />
            <Route path="/upload" component={Upload} />
            <Route path="/settings" component={Settings} />

            {/* 404 Not Found */}
            {/* SD-FI Integration Routes - Order-to-Cash Process */}
            {/* <Route path="/sales/sales-order-management" component={SalesOrderManagement} /> */} {/* Component removed during cleanup */}
            <Route path="/sales/configuration" component={SalesDistributionConfig} />
            <Route path="/sales/sd-customization" component={SDCustomization} />
            <Route path="/integration/sd-fi-dashboard" component={SDFIIntegrationDashboard} />
            <Route path="/agent-player" component={AgentPlayer} />
            <Route path="/coach-agent" component={CoachAgent} />
            <Route path="/chief-agent" component={ChiefAgent} />
            <Route path="/rookie-agent" component={RookieAgent} />
            <Route path="/designer-agent" component={DesignerAgent} />
            {/** Advanced workflow disabled: use simple DesignerAgent */}
            <Route path="/developer-agent" component={DeveloperAgent} />
            <Route path="/api-key-manager" component={APIKeyManager} />
            <Route path="/tile-tracking-report" component={TileTrackingReport} />
            <Route path="/intelligent-testing" component={IntelligentTestingAgent} />
            <Route path="/dominos-pizza-e2e" component={DominosPizzaE2ETesting} />
            <Route path="/coach-agent/health-dashboard" component={CoachAgentHealthDashboard} />
            <Route path="/test-results" component={TestResults} />
            <Route path="/project-test" component={ProjectTest} />
            <Route path="/condition-types" component={lazy(() => import("@/pages/ConditionTypesManagement"))} />
            <Route path="/condition-types-management" component={lazy(() => import("@/pages/ConditionTypesManagement"))} />
            <Route path="/end-to-end-processes" component={EndToEndProcesses} />

            {/* Phase 2 Order-to-Cash Enhancement Pages */}
            <Route path="/logistics/shipping" component={lazy(() => import("./pages/logistics/ShippingLogistics"))} />
            <Route path="/revenue-recognition" component={lazy(() => import("./pages/finance/revenue-recognition/RevenueRecognition"))} />
            <Route path="/customer-portal" component={lazy(() => import("./pages/customer-portal/CustomerPortal"))} />

            {/* Comprehensive AI-Powered Module Pages */}
            <Route path="/comprehensive/customers" component={ComprehensiveCustomers} />
            <Route path="/comprehensive/inventory" component={ComprehensiveInventory} />

            {/* OneProject Enhanced CRUD Management */}
            <Route path="/one-project" component={OneProjectManagement} />

            {/* Agentic AI Management - Transformers, HuggingFace, LangChain */}
            <Route path="/agentic-ai" component={AgenticAIManagement} />

            {/* Enhanced AI Agents - Advanced Role-based AI System */}
            <Route path="/enhanced-ai-agents" component={EnhancedAIAgents} />

            {/* Finance - Accrual Management */}
            <Route path="/finance/accruals" component={AccrualManagement} />

            {/* Master Data - Item Categories */}
            <Route path="/master-data/transaction-keys" component={PostingKeys} />
            <Route path="/master-data/reason-codes" component={ReasonCodes} />
            <Route path="/master-data/shipping-point-determination" component={ShippingPointDetermination} />

            {/* Master Data - Condition Categories */}
            <Route path="/master-data/condition-categories" component={ConditionCategories} />

            {/* Master Data - Calculation Methods */}
            <Route path="/master-data/calculation-methods" component={CalculationMethods} />

            {/* Master Data - Interest Calculators */}
            <Route path="/master-data/interest-calculators" component={InterestCalculators} />

            {/* Master Data - Item Category Groups */}
            <Route path="/master-data/item-category-groups" component={ItemCategoryGroups} />

            {/* Master Data - Item Category Determination */}
            <Route path="/master-data/item-category-determination" component={ItemCategoryDetermination} />

            {/* Master Data - Sales Process Types */}
            <Route path="/master-data/sales-process-types" component={SalesProcessTypes} />

            {/* Master Data - Movement Transaction Types */}
            <Route path="/master-data/movement-transaction-types" component={lazy(() => import("./pages/master-data/MovementTransactionTypes"))} />

            {/* Master Data - Movement Classes */}
            <Route path="/master-data/movement-classes" component={lazy(() => import("./pages/master-data/MovementClasses"))} />

            {/* AR Debit Memos */}
            <Route path="/transactions/ar-debit-memos" component={DebitMemos} />

            {/* AP Credit Memos */}
            <Route path="/transactions/ap-credit-memos" component={VendorCreditMemos} />

            {/* AP Debit Memos */}
            <Route path="/transactions/ap-debit-memos" component={VendorDebitMemos} />

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
  );
}

// Main App component
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AgentRoleProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
            <JrChatbot />
          </TooltipProvider>
        </AgentRoleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}