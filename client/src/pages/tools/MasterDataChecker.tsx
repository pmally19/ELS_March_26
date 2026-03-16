import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ShieldAlert, 
  Trash2,
  Lock,
  KeyRound,
  AlertTriangle,
  Layout,
  Database,
  ExternalLink
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Define the schema for the config form
const configSchema = z.object({
  checkType: z.enum(["all", "required", "custom"]),
  includeEntities: z.boolean().optional().default(true),
  includeData: z.boolean().optional().default(false),
  downloadReport: z.boolean().optional().default(false),
});

// Define the schema for data protection
const protectionSchema = z.object({
  selectedTables: z.array(z.string()),
  confirmationCode: z.string().min(6, "Confirmation code must be at least 6 characters"),
  acknowledgeRisk: z.boolean().refine(val => val === true, {
    message: "You must acknowledge the risk before proceeding",
  }),
});

// Master data component interfaces
interface ComponentStatus {
  name: string;
  table: string;
  status: "ok" | "warning" | "error";
  message: string;
  count: number;
  requiredForModules: string[];
  lastChecked: Date;
  uiPath?: string; // Path to the UI page for this master data
  hasUi?: boolean; // Whether this has a UI representation
}

// UI screen check interface
interface UiCheckResult {
  name: string;
  path: string;
  hasData: boolean;
  status: "ok" | "warning" | "error";
  message: string;
}

export default function MasterDataChecker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the component
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingUi, setIsCheckingUi] = useState(false);
  const [progress, setProgress] = useState(0);
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>([]);
  const [uiCheckResults, setUiCheckResults] = useState<UiCheckResult[]>([]);
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // State for data protection
  const [activeTab, setActiveTab] = useState<string>("check");
  const [activeCheckTab, setActiveCheckTab] = useState<string>("database");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Data protection form
  const protectionForm = useForm<z.infer<typeof protectionSchema>>({
    resolver: zodResolver(protectionSchema),
    defaultValues: {
      selectedTables: [],
      confirmationCode: "",
      acknowledgeRisk: false,
    },
  });
  
  // Config form
  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      checkType: "required",
      includeEntities: true,
      includeData: false,
      downloadReport: false,
    },
  });

  // Get component data with queries
  const { data: companyCodes = [], isLoading: companyCodesLoading } = useQuery({
    queryKey: ["/api/master-data/company-code"],
    retry: false,
    enabled: isChecking,
  });

  const { data: plants = [], isLoading: plantsLoading } = useQuery({
    queryKey: ["/api/master-data/plant"],
    retry: false,
    enabled: isChecking,
  });

  const { data: salesOrganizations = [], isLoading: salesOrganizationsLoading } = useQuery({
    queryKey: ["/api/master-data/sales-organization"],
    retry: false,
    enabled: isChecking,
  });

  const { data: purchaseOrganizations = [], isLoading: purchaseOrganizationsLoading } = useQuery({
    queryKey: ["/api/master-data/purchase-organization"],
    retry: false,
    enabled: isChecking,
  });

  const { data: storageLocations = [], isLoading: storageLocationsLoading } = useQuery({
    queryKey: ["/api/master-data/storage-location"],
    retry: false,
    enabled: isChecking,
  });

  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ["/api/master-data/currency"],
    retry: false,
    enabled: isChecking,
  });

  const { data: uoms = [], isLoading: uomsLoading } = useQuery({
            queryKey: ["/api/master-data/units-of-measure"],
    retry: false,
    enabled: isChecking,
  });

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["/api/master-data/region"],
    retry: false,
    enabled: isChecking,
  });

  const { data: fiscalPeriods = [], isLoading: fiscalPeriodsLoading } = useQuery({
    queryKey: ["/api/master-data/fiscal-period"],
    retry: false,
    enabled: isChecking,
  });

  // Check if all data has loaded
  useEffect(() => {
    if (isChecking && !companyCodesLoading && !plantsLoading && 
        !salesOrganizationsLoading && !purchaseOrganizationsLoading && 
        !storageLocationsLoading && !currenciesLoading && !uomsLoading && 
        !regionsLoading && !fiscalPeriodsLoading) {
      generateReport();
    }
  }, [
    isChecking, 
    companyCodesLoading, 
    plantsLoading, 
    salesOrganizationsLoading,
    purchaseOrganizationsLoading,
    storageLocationsLoading,
    currenciesLoading,
    uomsLoading,
    regionsLoading,
    fiscalPeriodsLoading
  ]);

  // Progress tracker
  useEffect(() => {
    if (isChecking) {
      const totalQueries = 9;
      const completedQueries = [
        !companyCodesLoading, 
        !plantsLoading, 
        !salesOrganizationsLoading,
        !purchaseOrganizationsLoading,
        !storageLocationsLoading,
        !currenciesLoading,
        !uomsLoading,
        !regionsLoading,
        !fiscalPeriodsLoading
      ].filter(Boolean).length;
      
      setProgress(Math.floor((completedQueries / totalQueries) * 100));
    }
  }, [
    isChecking,
    companyCodesLoading, 
    plantsLoading, 
    salesOrganizationsLoading,
    purchaseOrganizationsLoading,
    storageLocationsLoading,
    currenciesLoading,
    uomsLoading,
    regionsLoading,
    fiscalPeriodsLoading
  ]);

  // Function to start the check process
  const startCheck = (data: z.infer<typeof configSchema>) => {
    setIsChecking(true);
    setProgress(0);
    setComponentStatuses([]);
    setReportGenerated(false);
    
    toast({
      title: "Starting Master Data Check",
      description: "Checking all master data components...",
      variant: "default",
    });
  };

  // Run database check for each component
  const checkDatabaseTable = async (table: string, apiEndpoint: string) => {
    try {
      const response = await fetch(apiEndpoint);
      const data = await response.json();
      
      if (response.ok) {
        return {
          exists: true,
          data: Array.isArray(data) ? data : [],
          error: null
        };
      } else {
        return {
          exists: false,
          data: [],
          error: data.message || `Failed to fetch data from ${table}`
        };
      }
    } catch (error: any) {
      return {
        exists: false,
        data: [],
        error: error.message || `Failed to access ${table} table`
      };
    }
  };

  // Delete table data mutation
  const deleteMutation = useMutation({
    mutationFn: async (tables: string[]) => {
      const response = await fetch('/api/admin/delete-table-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tables }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete table data');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setDeleteResult({
        success: true,
        message: `Successfully deleted data from ${data.tablesAffected} tables.`,
      });
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Data Deleted Successfully",
        description: `Data has been deleted from the selected tables.`,
        variant: "default",
      });
      
      setIsDeleting(false);
      protectionForm.reset();
      setShowDeleteConfirmation(false);
    },
    onError: (error: Error) => {
      setDeleteResult({
        success: false,
        message: error.message || 'An unknown error occurred during deletion',
      });
      
      toast({
        title: "Error Deleting Data",
        description: error.message || "Failed to delete data from tables.",
        variant: "destructive",
      });
      
      setIsDeleting(false);
    },
  });

  // Handle data deletion with confirmation
  const handleDelete = (data: z.infer<typeof protectionSchema>) => {
    if (data.selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table for deletion.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    deleteMutation.mutate(data.selectedTables);
  };

  // Check UI master data pages
  const checkUiPages = () => {
    setIsCheckingUi(true);
    setUiCheckResults([]);
    
    toast({
      title: "Checking Master Data UI Tiles",
      description: "Analyzing UI pages and data display...",
      variant: "default",
    });
    
    // Define the master data pages to check
    const masterDataPages = [
      { name: "Company Code", path: "/master-data/company-code", hasData: false },
      { name: "Plant", path: "/master-data/plant", hasData: false },
      { name: "Storage Location", path: "/master-data/storage-location", hasData: false },
      { name: "Sales Organization", path: "/master-data/sales-organization", hasData: false },
      { name: "Purchase Organization", path: "/master-data/purchase-organization", hasData: false },
      { name: "Unit of Measure", path: "/master-data/uom", hasData: false },
      { name: "Customer", path: "/master-data/customer", hasData: false },
      { name: "Vendor", path: "/master-data/vendor", hasData: false },
      { name: "Material", path: "/master-data/material", hasData: false },
      { name: "Work Centers", path: "/master-data/work-centers", hasData: false },
      { name: "Cost Centers", path: "/master-data/cost-centers", hasData: false },
      { name: "Profit Centers", path: "/master-data/profit-centers", hasData: false },
      { name: "Chart of Accounts", path: "/master-data/chart-of-accounts", hasData: false },
      { name: "Approval Levels", path: "/master-data/approval-levels", hasData: false },
      { name: "Bill of Materials", path: "/master-data/bill-of-materials", hasData: false },
      { name: "Tax Codes", path: "/master-data/tax-codes", hasData: false },
      { name: "Asset Master", path: "/master-data/asset-master", hasData: false },
      { name: "Regions", path: "/master-data/regions", hasData: false },
      { name: "Currencies", path: "/master-data/currencies", hasData: false },
      { name: "Fiscal Calendar", path: "/master-data/fiscal-calendar", hasData: false },
    ];
    
    // Check each page against database tables
    const results: UiCheckResult[] = masterDataPages.map(page => {
      const matchingComponent = componentStatuses.find(c => 
        c.name.toLowerCase() === page.name.toLowerCase() || 
        c.name.replace(/\s+/g, '').toLowerCase() === page.name.replace(/\s+/g, '').toLowerCase()
      );
      
      const hasData = matchingComponent ? matchingComponent.count > 0 : false;
      let status: "ok" | "warning" | "error" = "warning";
      let message = "No data found for this UI page";
      
      if (hasData) {
        status = "ok";
        message = `UI page has corresponding data (${matchingComponent ? matchingComponent.count : 0} records)`;
      } else if (!matchingComponent) {
        status = "error";
        message = "No matching database table found for this UI page";
      }
      
      return {
        name: page.name,
        path: page.path,
        hasData,
        status,
        message
      };
    });
    
    setUiCheckResults(results);
    setIsCheckingUi(false);
    
    toast({
      title: "UI Check Complete",
      description: `Found ${results.filter(r => r.hasData).length} UI pages with data, ${results.filter(r => !r.hasData).length} without data.`,
      variant: "default",
    });
  };

  // Generate the report based on loaded data with more detailed checks
  const generateReport = () => {
    // Create detailed report of all component issues
    const checkTableVersion = (name: string, error: any) => {
      const versionError = error && error.toString().includes("version does not exist");
      if (versionError) {
        return {
          status: "error" as const,
          message: `The '${name}' table is missing the 'version' column. Run database migrations to update table structure.`
        };
      }
      return null;
    };

    const getTableStatus = (name: string, data: any, error: any) => {
      // Check specific issues with error messages
      if (error && error.toString().includes("relation") && error.toString().includes("does not exist")) {
        return {
          status: "error" as const,
          message: `The '${name}' table does not exist in the database. Run 'npm run db:push' to create it.`
        };
      }
      
      // Check version column missing
      const versionStatus = checkTableVersion(name, error);
      if (versionStatus) return versionStatus;
      
      // Check if data exists
      if (Array.isArray(data) && data.length > 0) {
        return {
          status: "ok" as const,
          message: `${data.length} ${name.toLowerCase()} found`
        };
      } else if (Array.isArray(data)) {
        return {
          status: "warning" as const,
          message: `No ${name.toLowerCase()} found. Table exists but contains no data.`
        };
      } else {
        return {
          status: "error" as const,
          message: `Failed to load ${name.toLowerCase()}. Check database connection and table structure.`
        };
      }
    };

    const statuses: ComponentStatus[] = [
      // 1. Organizational Master Data
      {
        name: "Company Code",
        table: "company_codes",
        ...getTableStatus("Company Code", companyCodes, null),
        count: Array.isArray(companyCodes) ? companyCodes.length : 0,
        requiredForModules: ["Finance", "Controlling", "Purchasing", "Sales", "Production"],
        lastChecked: new Date(),
      },
      {
        name: "Plant",
        table: "plants",
        ...getTableStatus("Plant", plants, null),
        count: Array.isArray(plants) ? plants.length : 0,
        requiredForModules: ["Production", "Inventory", "Quality Management"],
        lastChecked: new Date(),
      },
      {
        name: "Storage Location",
        table: "storage_locations",
        ...getTableStatus("Storage Location", storageLocations, null),
        count: Array.isArray(storageLocations) ? storageLocations.length : 0,
        requiredForModules: ["Inventory", "Warehouse Management"],
        lastChecked: new Date(),
      },
      {
        name: "Sales Organization",
        table: "sales_organizations",
        ...getTableStatus("Sales Organization", salesOrganizations, null),
        count: Array.isArray(salesOrganizations) ? salesOrganizations.length : 0,
        requiredForModules: ["Sales", "Distribution"],
        lastChecked: new Date(),
      },
      {
        name: "Purchase Organization",
        table: "purchase_organizations",
        status: Array.isArray(purchaseOrganizations) ? "ok" : "error",
        message: Array.isArray(purchaseOrganizations) 
          ? `${purchaseOrganizations.length} purchase organizations found` 
          : "Purchase Organizations not found",
        count: Array.isArray(purchaseOrganizations) ? purchaseOrganizations.length : 0,
        requiredForModules: ["Purchasing", "Procurement"],
        lastChecked: new Date(),
      },
      {
        name: "Credit Control Area",
        table: "credit_control_areas",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Finance", "Sales", "Credit Management"],
        lastChecked: new Date(),
      },
      {
        name: "Purchase Group",
        table: "purchase_groups",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Purchasing", "Procurement"],
        lastChecked: new Date(),
      },
      {
        name: "Supply Type",
        table: "supply_types",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Purchasing", "Supply Chain"],
        lastChecked: new Date(),
      },
      {
        name: "Approval Level",
        table: "approval_levels",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Purchasing", "Finance"],
        lastChecked: new Date(),
      },
      
      // 2. Core Master Data
      {
        name: "Material",
        table: "materials",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Inventory", "Production", "Sales", "Purchasing"],
        lastChecked: new Date(),
      },
      {
        name: "Customer",
        table: "customers",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Sales", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Vendor",
        table: "vendors",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Purchasing", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Chart of Accounts",
        table: "chart_of_accounts",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Finance", "Controlling"],
        lastChecked: new Date(),
      },
      {
        name: "Unit of Measure",
        table: "uoms",
        status: Array.isArray(uoms) ? "ok" : "warning",
        message: Array.isArray(uoms) 
          ? `${uoms.length} units of measure found` 
          : "Empty response from Units of Measure API. Check if the table exists.",
        count: Array.isArray(uoms) ? uoms.length : 0,
        requiredForModules: ["Sales", "Purchasing", "Inventory", "Production"],
        lastChecked: new Date(),
      },
      {
        name: "Currency",
        table: "currencies",
        ...getTableStatus("Currency", currencies, null),
        count: Array.isArray(currencies) ? currencies.length : 0,
        requiredForModules: ["Finance", "Sales", "Purchasing", "Controlling"],
        lastChecked: new Date(),
      },
      {
        name: "Bill of Materials",
        table: "bill_of_materials",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Production", "Engineering"],
        lastChecked: new Date(),
      },
      {
        name: "Material Category",
        table: "categories",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Materials Management", "Purchasing"],
        lastChecked: new Date(),
      },
      
      // 3. Additional Master Data
      {
        name: "Work Center",
        table: "work_centers",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Production", "Capacity Planning"],
        lastChecked: new Date(),
      },
      {
        name: "Cost Center",
        table: "cost_centers",
        status: "warning",
        message: "Not checked via API - check database directly", 
        count: 0,
        requiredForModules: ["Controlling", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Profit Center",
        table: "profit_centers",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Controlling", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Employee",
        table: "employees",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["HR", "Personnel Management"],
        lastChecked: new Date(),
      },
      {
        name: "Tax Code",
        table: "tax_codes",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Finance", "Sales", "Purchasing"],
        lastChecked: new Date(),
      },
      {
        name: "Asset Master",
        table: "asset_master",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Asset Management", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Region",
        table: "regions",
        ...getTableStatus("Region", regions, null),
        count: Array.isArray(regions) ? regions.length : 0,
        requiredForModules: ["Sales", "Distribution"],
        lastChecked: new Date(),
      },
      {
        name: "Country",
        table: "countries",
        status: "warning",
        message: "Not checked via API - check database directly",
        count: 0,
        requiredForModules: ["Sales", "Distribution", "Finance"],
        lastChecked: new Date(),
      },
      {
        name: "Fiscal Period",
        table: "fiscal_periods",
        ...getTableStatus("Fiscal Period", fiscalPeriods, null),
        count: Array.isArray(fiscalPeriods) ? fiscalPeriods.length : 0,
        requiredForModules: ["Finance", "Controlling", "Reporting"],
        lastChecked: new Date(),
      }
    ];

    // Sort by status (error first, then warning, then ok) and then by name
    const sortedStatuses = [...statuses].sort((a, b) => {
      if (a.status === b.status) {
        return a.name.localeCompare(b.name);
      }
      if (a.status === "error") return -1;
      if (b.status === "error") return 1;
      if (a.status === "warning") return -1;
      if (b.status === "warning") return 1;
      return 0;
    });

    setComponentStatuses(sortedStatuses);
    setReportGenerated(true);
    setLastChecked(new Date());
    setIsChecking(false);
    
    toast({
      title: "Master Data Check Complete",
      description: `Found ${sortedStatuses.filter(c => c.status === "ok").length} healthy components, ${sortedStatuses.filter(c => c.status === "warning").length} warnings, and ${sortedStatuses.filter(c => c.status === "error").length} errors.`,
      variant: "default",
    });
  };

  // Download the report as JSON
  const downloadReport = () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        components: componentStatuses,
      };
      
      const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(reportBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-data-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "The master data report has been downloaded as JSON.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Master Data Manager</h1>
          <p className="text-muted-foreground mt-1">
            Verify and manage master data across the system
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {activeTab === "check" && reportGenerated && (
            <Button variant="outline" onClick={downloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          )}
          {activeTab === "check" && (
            <Button 
              onClick={() => form.handleSubmit(startCheck)()}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Check
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <Tabs
        defaultValue="check"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid w-full md:w-auto grid-cols-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
          <TabsTrigger 
            value="check" 
            className={activeTab === "check" 
              ? "border border-blue-300 rounded-md font-bold bg-blue-100 text-blue-700 shadow-sm" 
              : "hover:bg-blue-50"
            }
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Data Checker
          </TabsTrigger>
          <TabsTrigger 
            value="protect" 
            className={activeTab === "protect" 
              ? "border border-amber-300 rounded-md font-bold bg-amber-100 text-amber-700 shadow-sm" 
              : "hover:bg-amber-50"
            }
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            Data Protection
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {activeTab === "check" && reportGenerated && (
        <Tabs 
          defaultValue="database" 
          value={activeCheckTab}
          onValueChange={setActiveCheckTab}
          className="mb-4"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <TabsTrigger 
              value="database"
              className={activeCheckTab === "database" 
                ? "border border-indigo-300 rounded-md font-bold bg-indigo-100 text-indigo-700 shadow-sm" 
                : "hover:bg-indigo-50"
              }
            >
              <Database className="h-4 w-4 mr-2" />
              Database Tables
            </TabsTrigger>
            <TabsTrigger 
              value="ui"
              className={activeCheckTab === "ui" 
                ? "border border-teal-300 rounded-md font-bold bg-teal-100 text-teal-700 shadow-sm" 
                : "hover:bg-teal-50"
              }
            >
              <Layout className="h-4 w-4 mr-2" />
              UI Master Data Tiles
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {activeTab === "protect" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                  Data Protection
                </CardTitle>
                <CardDescription>
                  Restrict deletion of master data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6 bg-amber-50 text-amber-900 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle>Data Protection Controls</AlertTitle>
                  <AlertDescription>
                    This tool restricts DELETE operations on database tables, only allowing INSERT and UPDATE.
                    Data deletion can only be performed through this interface with proper authorization.
                  </AlertDescription>
                </Alert>
                
                <Form {...protectionForm}>
                  <form onSubmit={protectionForm.handleSubmit(handleDelete)} className="space-y-6">
                    <FormField
                      control={protectionForm.control}
                      name="selectedTables"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Tables for Data Deletion</FormLabel>
                          <FormDescription>
                            Choose the tables you want to delete data from
                          </FormDescription>
                          <div className="grid grid-cols-1 gap-2 mt-2">
                            {componentStatuses.map((component) => (
                              <div key={component.table} className="flex items-center space-x-2">
                                <Checkbox
                                  id={component.table}
                                  checked={field.value.includes(component.table)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, component.table])
                                      : field.onChange(
                                          field.value.filter((value) => value !== component.table)
                                        );
                                  }}
                                />
                                <label
                                  htmlFor={component.table}
                                  className="flex items-center justify-between w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  <span>{component.name}</span>
                                  <Badge variant={component.count > 0 ? "default" : "outline"} className="ml-2">
                                    {component.count > 0 ? `${component.count} records` : "Empty"}
                                  </Badge>
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={protectionForm.control}
                      name="confirmationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmation Code</FormLabel>
                          <FormDescription>
                            Enter the admin authorization code to confirm deletion
                          </FormDescription>
                          <FormControl>
                            <div className="flex items-center">
                              <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                              <Input 
                                placeholder="Enter confirmation code" 
                                {...field} 
                                type="password"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={protectionForm.control}
                      name="acknowledgeRisk"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I acknowledge this action cannot be undone
                            </FormLabel>
                            <FormDescription>
                              Data deletion is permanent and irreversible. Make sure you have backups.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
                        <DialogTrigger asChild>
                          <Button 
                            type="button" 
                            variant="destructive"
                            disabled={protectionForm.getValues().selectedTables.length === 0}
                            onClick={() => {
                              if (protectionForm.getValues().selectedTables.length === 0) {
                                toast({
                                  title: "No Tables Selected",
                                  description: "Please select at least one table for deletion.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              if (protectionForm.formState.isValid) {
                                setShowDeleteConfirmation(true);
                              } else {
                                protectionForm.trigger();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Table Data
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center">
                              <AlertTriangle className="h-5 w-5 mr-2" />
                              Confirm Data Deletion
                            </DialogTitle>
                            <DialogDescription>
                              You are about to permanently delete data from {protectionForm.getValues().selectedTables.length} tables.
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <h4 className="text-sm font-medium mb-2">Selected tables:</h4>
                            <div className="grid grid-cols-1 gap-2 mb-4 max-h-32 overflow-y-auto border rounded-md p-2">
                              {protectionForm.getValues().selectedTables.map((table) => {
                                const component = componentStatuses.find(c => c.table === table);
                                return (
                                  <div key={table} className="flex items-center justify-between">
                                    <span className="text-sm">{component?.name || table}</span>
                                    <Badge variant={component?.count ? "default" : "outline"} className="ml-2">
                                      {component?.count ? `${component.count} records` : "Empty"}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                            
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Irreversible Action</AlertTitle>
                              <AlertDescription>
                                This will permanently delete all data in the selected tables.
                                Are you absolutely sure you want to proceed?
                              </AlertDescription>
                            </Alert>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowDeleteConfirmation(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => {
                                protectionForm.handleSubmit(handleDelete)();
                                setShowDeleteConfirmation(false);
                              }}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>Permanently Delete</>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Data Protection Status</CardTitle>
                <CardDescription>
                  Current protection status for master data tables
                </CardDescription>
              </CardHeader>
              <CardContent>
                {componentStatuses.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Run a check first</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please run a master data check to see the current table status
                    </p>
                    <Button 
                      onClick={() => {
                        setActiveTab("check");
                        form.handleSubmit(startCheck)();
                      }} 
                      className="mt-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Check
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-blue-800">
                                  Protected Tables
                                </p>
                                <h3 className="text-2xl font-bold mt-1">
                                  {componentStatuses.length}
                                </h3>
                              </div>
                              <Lock className="h-8 w-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-amber-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-amber-800">
                                  Tables With Data
                                </p>
                                <h3 className="text-2xl font-bold mt-1">
                                  {componentStatuses.filter(c => c.count > 0).length}
                                </h3>
                              </div>
                              <ShieldAlert className="h-8 w-8 text-amber-500" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Table Name</TableHead>
                            <TableHead className="text-right">Records</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {componentStatuses.map((component) => (
                            <TableRow key={component.name}>
                              <TableCell className="font-medium">{component.name}</TableCell>
                              <TableCell className="font-mono text-xs">{component.table}</TableCell>
                              <TableCell className="text-right">{component.count}</TableCell>
                              <TableCell>
                                {component.count > 0 ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                    Has Data
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100">
                                    Empty
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
                
                {deleteResult && (
                  <Alert className={`mt-6 ${deleteResult.success ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`} variant="default">
                    {deleteResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <AlertTitle>
                      {deleteResult.success ? 'Success' : 'Error'}
                    </AlertTitle>
                    <AlertDescription>
                      {deleteResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Check Configuration</CardTitle>
                <CardDescription>
                  Configure what to include in the master data check
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(startCheck)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="checkType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Check Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="all" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>All Components</FormLabel>
                                  <FormDescription>
                                    Check all master data components
                                  </FormDescription>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="required" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Required Components</FormLabel>
                                  <FormDescription>
                                    Check only components required for basic functionality
                                  </FormDescription>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="custom" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Custom Selection</FormLabel>
                                  <FormDescription>
                                    Choose specific components to check
                                  </FormDescription>
                                </div>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeEntities"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Include Entities
                            </FormLabel>
                            <FormDescription>
                              Check all entity tables like Customer, Vendor, Materials
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeData"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Include Data Counts
                            </FormLabel>
                            <FormDescription>
                              Check the number of records in each table
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="downloadReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Download Report
                            </FormLabel>
                            <FormDescription>
                              Download a JSON report after the check completes
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit"
                      disabled={isChecking}
                      className="w-full"
                    >
                      {isChecking ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Running Check...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Run Master Data Check
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
                
                {isChecking && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                
                {lastChecked && (
                  <div className="text-sm text-muted-foreground text-center border-t pt-4 mt-4">
                    <span>Last checked: {lastChecked.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {reportGenerated && activeCheckTab === "ui" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Master Data UI Tiles Status</CardTitle>
                  <CardDescription>
                    Check if Master Data UI pages have corresponding data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isCheckingUi ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                      <h3 className="text-lg font-medium">Checking UI Tiles...</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Checking if Master Data pages have corresponding data
                      </p>
                    </div>
                  ) : uiCheckResults.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <div className="grid grid-cols-3 gap-4">
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-800">
                                    Pages With Data
                                  </p>
                                  <h3 className="text-2xl font-bold mt-1">
                                    {uiCheckResults.filter(r => r.hasData).length}
                                  </h3>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-yellow-800">
                                    Pages Without Data
                                  </p>
                                  <h3 className="text-2xl font-bold mt-1">
                                    {uiCheckResults.filter(r => !r.hasData && r.status === "warning").length}
                                  </h3>
                                </div>
                                <AlertCircle className="h-8 w-8 text-yellow-500" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-red-800">
                                    Pages With Issues
                                  </p>
                                  <h3 className="text-2xl font-bold mt-1">
                                    {uiCheckResults.filter(r => r.status === "error").length}
                                  </h3>
                                </div>
                                <XCircle className="h-8 w-8 text-red-500" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>UI Page</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Message</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uiCheckResults.map((result) => (
                              <TableRow key={result.name}>
                                <TableCell className="font-medium">{result.name}</TableCell>
                                <TableCell>
                                  {result.hasData ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Has Data
                                    </Badge>
                                  ) : result.status === "warning" ? (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      No Data
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Error
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>{result.message}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={result.path} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      View
                                    </a>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Layout className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No UI Check Results</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click the "Check UI Pages" button to analyze Master Data tiles
                      </p>
                      <Button 
                        onClick={checkUiPages} 
                        className="mt-4"
                        disabled={componentStatuses.length === 0}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Check UI Pages
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : reportGenerated ? (
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({componentStatuses.length})</TabsTrigger>
                  <TabsTrigger value="warning">
                    Warnings ({componentStatuses.filter(c => c.status === "warning").length})
                  </TabsTrigger>
                  <TabsTrigger value="ok">
                    OK ({componentStatuses.filter(c => c.status === "ok").length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Components</CardTitle>
                      <CardDescription>
                        Status of all master data components
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Table</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {componentStatuses.map((component) => (
                            <TableRow key={component.name}>
                              <TableCell className="font-medium">{component.name}</TableCell>
                              <TableCell>
                                {component.status === "ok" ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                ) : component.status === "warning" ? (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Warning
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Error
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell font-mono text-xs">{component.table}</TableCell>
                              <TableCell className="text-right">{component.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="warning">
                  <Card>
                    <CardHeader>
                      <CardTitle>Components with Warnings</CardTitle>
                      <CardDescription>
                        Components that need attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {componentStatuses.filter(c => c.status === "warning").length === 0 ? (
                        <div className="text-center py-8 text-green-600">
                          <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                          <p className="text-lg font-medium">No warnings found!</p>
                          <p className="text-sm text-muted-foreground mt-1">All components are either working correctly or have errors.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Table</TableHead>
                              <TableHead>Issue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {componentStatuses
                              .filter(c => c.status === "warning")
                              .map((component) => (
                                <TableRow key={component.name}>
                                  <TableCell className="font-medium">{component.name}</TableCell>
                                  <TableCell className="font-mono text-xs">{component.table}</TableCell>
                                  <TableCell>{component.message}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ok">
                  <Card>
                    <CardHeader>
                      <CardTitle>Working Components</CardTitle>
                      <CardDescription>
                        Components that are working correctly
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {componentStatuses.filter(c => c.status === "ok").length === 0 ? (
                        <div className="text-center py-8 text-red-600">
                          <XCircle className="mx-auto h-12 w-12 mb-4" />
                          <p className="text-lg font-medium">No working components found!</p>
                          <p className="text-sm text-muted-foreground mt-1">All components have issues that need to be addressed.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Table</TableHead>
                              <TableHead className="text-right">Count</TableHead>
                              <TableHead className="hidden md:table-cell">Required By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {componentStatuses
                              .filter(c => c.status === "ok")
                              .map((component) => (
                                <TableRow key={component.name}>
                                  <TableCell className="font-medium">{component.name}</TableCell>
                                  <TableCell className="font-mono text-xs">{component.table}</TableCell>
                                  <TableCell className="text-right">{component.count}</TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                      {component.requiredForModules.map((module) => (
                                        <Badge key={module} variant="outline" className="text-xs">
                                          {module}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Master Data Checker</CardTitle>
                  <CardDescription>
                    Run a check to verify all master data components
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <div className="text-center mb-4">
                    <RefreshCw className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">Run a master data check</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This tool will verify all master data components and their relationships
                    </p>
                  </div>
                  <Button onClick={() => form.handleSubmit(startCheck)()} className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Check
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}