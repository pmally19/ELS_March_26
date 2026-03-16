import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, BookOpen, MoreHorizontal, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Ledger type definition (matches database structure)
type Ledger = {
  id: number;
  code: string;
  name: string;
  description?: string;
  ledger_type: string;
  ledger_category?: string;
  fiscal_year_variant_id?: number;
  fiscal_year_variant_code?: string;
  fiscal_year_variant_name?: string;
  default_currency_code: string;
  parallel_currency_code?: string;
  ledger_group_id?: number;
  ledger_group_code?: string;
  ledger_group_name?: string;
  accounting_principle?: string;
  base_ledger_id?: number;
  base_ledger_code?: string;
  base_ledger_name?: string;
  extension_type?: string;
  chart_of_accounts_id?: number;
  chart_of_accounts_code?: string;
  chart_of_accounts_name?: string;
  company_code_id?: number;
  company_code?: string;
  company_name?: string;
  company_code_currency_active?: boolean;
  group_currency_active?: boolean;
  hard_currency_active?: boolean;
  index_currency_active?: boolean;
  index_currency_code?: string;
  document_splitting_active?: boolean;
  posting_period_control_id?: number;
  allow_postings: boolean;
  is_consolidation_ledger: boolean;
  requires_approval: boolean;
  display_order: number;
  sort_key?: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  tenant_id?: string;
};

// Fiscal Year Variant type
type FiscalYearVariant = {
  id: number;
  variant_id: string;
  description: string;
  is_active: boolean;
};

// Accounting Principle type
type AccountingPrinciple = {
  id: number;
  code: string;
  name: string;
  description?: string;
  standard_type?: string;
  jurisdiction?: string;
  effective_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Ledger Form Schema (matches all database fields)
const ledgerSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  ledger_type: z.enum(["PRIMARY", "SECONDARY", "REPORTING"], {
    errorMap: () => ({ message: "Ledger type must be PRIMARY, SECONDARY, or REPORTING" }),
  }),
  ledger_category: z.enum(["FINANCIAL_REPORTING", "TAX_REPORTING", "MANAGEMENT_REPORTING"]).optional().or(z.literal("")),
  fiscal_year_variant_id: z.number().int().positive().optional().or(z.null()),
  default_currency_code: z.string().length(3, "Currency code must be 3 characters"),
  parallel_currency_code: z.string().length(3, "Currency code must be 3 characters").optional().or(z.literal("")),
  ledger_group_id: z.number().int().positive().optional().or(z.null()),
  accounting_principle: z.string().optional().or(z.literal("")),
  base_ledger_id: z.number().int().positive().optional().or(z.null()),
  extension_type: z.enum(["ADJUSTMENT", "REPORTING", "TAX"]).optional().or(z.literal("")),
  chart_of_accounts_id: z.number().int().positive().optional().or(z.null()),
  company_code_id: z.number().int().positive().optional().or(z.null()),
  company_code_currency_active: z.boolean().default(true),
  group_currency_active: z.boolean().default(false),
  hard_currency_active: z.boolean().default(false),
  index_currency_active: z.boolean().default(false),
  index_currency_code: z.string().length(3, "Currency code must be 3 characters").optional().or(z.literal("")),
  document_splitting_active: z.boolean().default(false),
  posting_period_control_id: z.number().int().positive().optional().or(z.null()),
  allow_postings: z.boolean().default(true),
  is_consolidation_ledger: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
  display_order: z.number().int().default(0),
  sort_key: z.string().max(10).optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

// Ledgers Management Page
export default function Ledgers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [viewingLedger, setViewingLedger] = useState<Ledger | null>(null);
  const [showAdminData, setShowAdminData] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ledgers
  const { data: ledgers = [], isLoading, error, refetch } = useQuery<Ledger[]>({
    queryKey: ["/api/master-data/ledgers"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/ledgers");
        console.log("Ledgers fetched:", response?.length || 0, "ledgers");
        // Normalize snake_case to camelCase and convert empty strings to undefined
        const normalizeValue = (val: any) => (val && val !== "") ? val : undefined;

        const normalized = (response || []).map((item: any) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          ledger_type: item.ledger_type || item.ledgerType,
          ledger_category: normalizeValue(item.ledger_category || item.ledgerCategory),
          fiscal_year_variant_id: item.fiscal_year_variant_id || item.fiscalYearVariantId || undefined,
          fiscal_year_variant_code: item.fiscal_year_variant_code || item.fiscalYearVariantCode,
          fiscal_year_variant_name: item.fiscal_year_variant_name || item.fiscalYearVariantName,
          default_currency_code: item.default_currency_code || item.defaultCurrencyCode,
          parallel_currency_code: normalizeValue(item.parallel_currency_code || item.parallelCurrencyCode),
          ledger_group_id: item.ledger_group_id || item.ledgerGroupId || undefined,
          ledger_group_code: item.ledger_group_code || item.ledgerGroupCode,
          ledger_group_name: item.ledger_group_name || item.ledgerGroupName,
          accounting_principle: normalizeValue(item.accounting_principle || item.accountingPrinciple),
          base_ledger_id: item.base_ledger_id || item.baseLedgerId || undefined,
          base_ledger_code: item.base_ledger_code || item.baseLedgerCode,
          base_ledger_name: item.base_ledger_name || item.baseLedgerName,
          extension_type: normalizeValue(item.extension_type || item.extensionType),
          chart_of_accounts_id: item.chart_of_accounts_id || item.chartOfAccountsId,
          chart_of_accounts_code: item.chart_of_accounts_code || item.chartOfAccountsCode,
          chart_of_accounts_name: item.chart_of_accounts_name || item.chartOfAccountsName,
          company_code_id: item.company_code_id || item.companyCodeId,
          company_code: item.company_code || item.companyCode,
          company_name: item.company_name || item.companyName,
          company_code_currency_active: item.company_code_currency_active !== undefined ? item.company_code_currency_active : item.companyCodeCurrencyActive,
          group_currency_active: item.group_currency_active !== undefined ? item.group_currency_active : item.groupCurrencyActive,
          hard_currency_active: item.hard_currency_active !== undefined ? item.hard_currency_active : item.hardCurrencyActive,
          index_currency_active: item.index_currency_active !== undefined ? item.index_currency_active : item.indexCurrencyActive,
          index_currency_code: item.index_currency_code || item.indexCurrencyCode,
          document_splitting_active: item.document_splitting_active !== undefined ? item.document_splitting_active : item.documentSplittingActive,
          posting_period_control_id: item.posting_period_control_id || item.postingPeriodControlId,
          allow_postings: item.allow_postings !== undefined ? item.allow_postings : item.allowPostings,
          is_consolidation_ledger: item.is_consolidation_ledger !== undefined ? item.is_consolidation_ledger : item.isConsolidationLedger,
          requires_approval: item.requires_approval !== undefined ? item.requires_approval : item.requiresApproval,
          display_order: item.display_order || item.displayOrder || 0,
          sort_key: item.sort_key || item.sortKey,
          is_active: item.is_active !== undefined ? item.is_active : item.isActive,
          is_default: item.is_default !== undefined ? item.is_default : item.isDefault,
          created_at: item.created_at || item.createdAt,
          updated_at: item.updated_at || item.updatedAt,
          created_by: item.created_by || item.createdBy,
          updated_by: item.updated_by || item.updatedBy,
          tenant_id: item.tenant_id || item.tenantId,
        }));
        return normalized;
      } catch (error) {
        console.error("Error fetching ledgers:", error);
        toast({
          title: "Error",
          description: "Failed to fetch ledgers. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch fiscal year variants
  const { data: fiscalYearVariants = [] } = useQuery<FiscalYearVariant[]>({
    queryKey: ["/api/master-data/fiscal-year-variants"],
    queryFn: async () => {
      try {
        const response = await apiGet<FiscalYearVariant[]>("/api/master-data/fiscal-year-variants?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching fiscal year variants:", error);
        return [];
      }
    },
  });

  // Fetch accounting principles for dropdown
  const { data: accountingPrinciples = [] } = useQuery<AccountingPrinciple[]>({
    queryKey: ["/api/master-data/accounting-principles"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/accounting-principles?active=true");
        return (response || []).filter((ap: any) => ap.is_active !== false);
      } catch (error) {
        console.error("Error fetching accounting principles:", error);
        return [];
      }
    },
  });

  // Fetch chart of accounts for dropdown
  const { data: chartOfAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/chart-of-accounts"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/chart-of-accounts");
        return response || [];
      } catch (error) {
        console.error("Error fetching chart of accounts:", error);
        return [];
      }
    },
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/company-code");
        return response || [];
      } catch (error) {
        console.error("Error fetching company codes:", error);
        return [];
      }
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof ledgerSchema>>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      ledger_type: "PRIMARY",
      ledger_category: undefined,
      fiscal_year_variant_id: undefined,
      default_currency_code: "USD",
      parallel_currency_code: undefined,
      ledger_group_id: undefined,
      company_code_id: undefined,
      accounting_principle: undefined,
      base_ledger_id: undefined,
      extension_type: undefined,
      chart_of_accounts_id: undefined,
      company_code_currency_active: true,
      group_currency_active: false,
      hard_currency_active: false,
      index_currency_active: false,
      index_currency_code: undefined,
      document_splitting_active: false,
      posting_period_control_id: undefined,
      allow_postings: true,
      is_consolidation_ledger: false,
      requires_approval: false,
      display_order: 0,
      sort_key: "",
      is_active: true,
      is_default: false,
    },
  });

  // Filter ledgers based on search query
  const filteredLedgers = ledgers.filter((ledger) => {
    if (searchQuery.trim() === "") return true;
    const query = searchQuery.toLowerCase();
    return (
      ledger.code.toLowerCase().includes(query) ||
      ledger.name.toLowerCase().includes(query) ||
      (ledger.description && ledger.description.toLowerCase().includes(query)) ||
      ledger.ledger_type.toLowerCase().includes(query) ||
      (ledger.ledger_category && ledger.ledger_category.toLowerCase().includes(query))
    );
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof ledgerSchema>) => {
      // Convert snake_case to camelCase for backend
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        ledgerType: data.ledger_type,
        ledgerCategory: data.ledger_category || undefined,
        fiscalYearVariantId: data.fiscal_year_variant_id || undefined,
        defaultCurrencyCode: data.default_currency_code,
        parallelCurrencyCode: data.parallel_currency_code || undefined,
        ledgerGroupId: data.ledger_group_id || undefined,
        accountingPrinciple: data.accounting_principle || undefined,
        baseLedgerId: data.base_ledger_id || undefined,
        extensionType: data.extension_type || undefined,
        chartOfAccountsId: data.chart_of_accounts_id || undefined,
        companyCodeId: data.company_code_id || undefined,
        companyCodeCurrencyActive: data.company_code_currency_active,
        groupCurrencyActive: data.group_currency_active,
        hardCurrencyActive: data.hard_currency_active,
        indexCurrencyActive: data.index_currency_active,
        indexCurrencyCode: data.index_currency_code || undefined,
        documentSplittingActive: data.document_splitting_active,
        postingPeriodControlId: data.posting_period_control_id || undefined,
        allowPostings: data.allow_postings,
        isConsolidationLedger: data.is_consolidation_ledger,
        requiresApproval: data.requires_approval,
        displayOrder: data.display_order,
        sortKey: data.sort_key || undefined,
        isActive: data.is_active,
        isDefault: data.is_default,
      };
      return apiPost("/api/master-data/ledgers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/ledgers"] });
      setOpen(false);
      setEditingLedger(null);
      form.reset();
      toast({ title: "Success", description: "Ledger created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create ledger";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof ledgerSchema>) => {
      // Convert snake_case to camelCase for backend
      const payload: any = {};

      // Map all fields from snake_case to camelCase
      if (data.code !== undefined) payload.code = data.code;
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description || undefined;
      if (data.ledger_type !== undefined) payload.ledgerType = data.ledger_type;
      if (data.ledger_category !== undefined) payload.ledgerCategory = data.ledger_category || undefined;
      if (data.fiscal_year_variant_id !== undefined) payload.fiscalYearVariantId = data.fiscal_year_variant_id ?? null;
      if (data.default_currency_code !== undefined) payload.defaultCurrencyCode = data.default_currency_code;
      if (data.parallel_currency_code !== undefined) payload.parallelCurrencyCode = data.parallel_currency_code || undefined;
      if (data.ledger_group_id !== undefined) payload.ledgerGroupId = data.ledger_group_id ?? null;
      if (data.accounting_principle !== undefined) payload.accountingPrinciple = data.accounting_principle || undefined;
      if (data.base_ledger_id !== undefined) payload.baseLedgerId = data.base_ledger_id ?? null;
      if (data.extension_type !== undefined) payload.extensionType = data.extension_type || undefined;
      if (data.chart_of_accounts_id !== undefined) payload.chartOfAccountsId = data.chart_of_accounts_id ?? null;
      // Always include company_code_id when editing (even if null, to clear it)
      // Use !== undefined to catch both null and actual values
      if (data.company_code_id !== undefined) {
        payload.companyCodeId = data.company_code_id ?? null;
      }
      if (data.company_code_currency_active !== undefined) payload.companyCodeCurrencyActive = data.company_code_currency_active;
      if (data.group_currency_active !== undefined) payload.groupCurrencyActive = data.group_currency_active;
      if (data.hard_currency_active !== undefined) payload.hardCurrencyActive = data.hard_currency_active;
      if (data.index_currency_active !== undefined) payload.indexCurrencyActive = data.index_currency_active;
      if (data.index_currency_code !== undefined) payload.indexCurrencyCode = data.index_currency_code || undefined;
      if (data.document_splitting_active !== undefined) payload.documentSplittingActive = data.document_splitting_active;
      if (data.posting_period_control_id !== undefined) payload.postingPeriodControlId = data.posting_period_control_id || undefined;
      if (data.allow_postings !== undefined) payload.allowPostings = data.allow_postings;
      if (data.is_consolidation_ledger !== undefined) payload.isConsolidationLedger = data.is_consolidation_ledger;
      if (data.requires_approval !== undefined) payload.requiresApproval = data.requires_approval;
      if (data.display_order !== undefined) payload.displayOrder = data.display_order;
      if (data.sort_key !== undefined) payload.sortKey = data.sort_key || undefined;
      if (data.is_active !== undefined) payload.isActive = data.is_active;
      if (data.is_default !== undefined) payload.isDefault = data.is_default;

      console.log('Updating ledger:', { id, payload, companyCodeId: payload.companyCodeId });
      return apiPut(`/api/master-data/ledgers/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/ledgers"] });
      setOpen(false);
      setEditingLedger(null);
      form.reset();
      toast({ title: "Success", description: "Ledger updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update ledger";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/master-data/ledgers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/ledgers"] });
      toast({ title: "Success", description: "Ledger deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to delete ledger";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  // Form submission
  const onSubmit = (data: any) => {
    // Convert "NONE" values and empty strings to null/undefined before validation
    // For ID fields, use null to explicitly clear them; for optional strings, use undefined
    const cleanedData: any = {
      ...data,
      ledger_category: (data.ledger_category === "NONE" || data.ledger_category === "" || !data.ledger_category) ? undefined : data.ledger_category,
      accounting_principle: (data.accounting_principle === "NONE" || data.accounting_principle === "" || !data.accounting_principle) ? undefined : data.accounting_principle,
      extension_type: (data.extension_type === "NONE" || data.extension_type === "" || !data.extension_type) ? undefined : data.extension_type,
      parallel_currency_code: (data.parallel_currency_code === "" || !data.parallel_currency_code) ? undefined : data.parallel_currency_code,
      index_currency_code: (data.index_currency_code === "" || !data.index_currency_code) ? undefined : data.index_currency_code,
      // For ID fields: convert 0, undefined, or null to null (to explicitly clear the field)
      fiscal_year_variant_id: (data.fiscal_year_variant_id === 0 || data.fiscal_year_variant_id === undefined || data.fiscal_year_variant_id === null) ? null : data.fiscal_year_variant_id,
      base_ledger_id: (data.base_ledger_id === 0 || data.base_ledger_id === undefined || data.base_ledger_id === null) ? null : data.base_ledger_id,
      chart_of_accounts_id: (data.chart_of_accounts_id === 0 || data.chart_of_accounts_id === undefined || data.chart_of_accounts_id === null) ? null : data.chart_of_accounts_id,
      posting_period_control_id: (data.posting_period_control_id === 0 || data.posting_period_control_id === undefined || data.posting_period_control_id === null) ? null : data.posting_period_control_id,
      ledger_group_id: (data.ledger_group_id === 0 || data.ledger_group_id === undefined || data.ledger_group_id === null) ? null : data.ledger_group_id,
      // Explicitly handle company_code_id - always include it if it's in the form data
      company_code_id: (data.company_code_id === 0 || data.company_code_id === undefined || data.company_code_id === null) ? null : (typeof data.company_code_id === 'number' ? data.company_code_id : parseInt(data.company_code_id)),
      sort_key: (data.sort_key === "" || !data.sort_key) ? undefined : data.sort_key,
    };

    // Validate the cleaned data
    const validationResult = ledgerSchema.safeParse(cleanedData);
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error.errors);
      toast({
        title: "Validation Error",
        description: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        variant: "destructive",
      });
      return;
    }

    if (editingLedger) {
      // Ensure company_code_id is always included when editing (even if null)
      const updateData = {
        ...validationResult.data,
        company_code_id: validationResult.data.company_code_id ?? null,
      };
      console.log('Submitting update with data:', updateData);
      updateMutation.mutate({ id: editingLedger.id, ...updateData });
    } else {
      createMutation.mutate(validationResult.data);
    }
  };

  // Handle edit
  const handleEdit = (ledger: Ledger) => {
    setEditingLedger(ledger);
    form.reset({
      code: ledger.code,
      name: ledger.name,
      description: ledger.description || "",
      ledger_type: ledger.ledger_type as "PRIMARY" | "SECONDARY" | "REPORTING",
      ledger_category: ledger.ledger_category ? (ledger.ledger_category as "FINANCIAL_REPORTING" | "TAX_REPORTING" | "MANAGEMENT_REPORTING") : undefined,
      fiscal_year_variant_id: ledger.fiscal_year_variant_id ?? undefined,
      default_currency_code: ledger.default_currency_code,
      parallel_currency_code: ledger.parallel_currency_code ?? undefined,
      ledger_group_id: ledger.ledger_group_id ?? undefined,
      company_code_id: ledger.company_code_id ?? undefined,
      accounting_principle: ledger.accounting_principle ?? undefined,
      base_ledger_id: ledger.base_ledger_id ?? undefined,
      extension_type: ledger.extension_type ? (ledger.extension_type as "ADJUSTMENT" | "REPORTING" | "TAX") : undefined,
      chart_of_accounts_id: ledger.chart_of_accounts_id ?? undefined,
      company_code_currency_active: ledger.company_code_currency_active !== undefined ? ledger.company_code_currency_active : true,
      group_currency_active: ledger.group_currency_active !== undefined ? ledger.group_currency_active : false,
      hard_currency_active: ledger.hard_currency_active !== undefined ? ledger.hard_currency_active : false,
      index_currency_active: ledger.index_currency_active !== undefined ? ledger.index_currency_active : false,
      index_currency_code: ledger.index_currency_code ?? undefined,
      document_splitting_active: ledger.document_splitting_active !== undefined ? ledger.document_splitting_active : false,
      posting_period_control_id: ledger.posting_period_control_id ?? undefined,
      allow_postings: ledger.allow_postings,
      is_consolidation_ledger: ledger.is_consolidation_ledger,
      requires_approval: ledger.requires_approval,
      display_order: ledger.display_order,
      sort_key: ledger.sort_key || "",
      is_active: ledger.is_active,
      is_default: ledger.is_default,
    });
    setOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/master-data">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Master Data
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Ledgers</h1>
          <p className="text-muted-foreground mt-1">
            Manage accounting books for parallel accounting and reporting
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={(open) => {
            setOpen(open);
            if (!open) {
              setEditingLedger(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Ledger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLedger ? "Edit Ledger" : "Create Ledger"}
                </DialogTitle>
                <DialogDescription>
                  Configure accounting book settings for parallel accounting
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="L001" {...field} maxLength={10} />
                          </FormControl>
                          <FormDescription>Unique code for the ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Primary Accounting Book" {...field} maxLength={100} />
                          </FormControl>
                          <FormDescription>Display name of the ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detailed description of the ledger" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ledger_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ledger Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ledger type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PRIMARY">Primary</SelectItem>
                              <SelectItem value="SECONDARY">Secondary</SelectItem>
                              <SelectItem value="REPORTING">Reporting</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Type of accounting book</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ledger_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : value)}
                            value={field.value || "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="FINANCIAL_REPORTING">Financial Reporting</SelectItem>
                              <SelectItem value="TAX_REPORTING">Tax Reporting</SelectItem>
                              <SelectItem value="MANAGEMENT_REPORTING">Management Reporting</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Category for reporting purposes</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_code_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))}
                            value={field.value ? field.value.toString() : "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None (Global)</SelectItem>
                              {companyCodes.map((cc: any) => (
                                <SelectItem key={cc.id} value={cc.id.toString()}>
                                  {cc.code} - {cc.name || cc.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Company code for this ledger (optional - leave as None for global ledger)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fiscal_year_variant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiscal Year Variant</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))}
                            value={field.value?.toString() || "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fiscal year variant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {fiscalYearVariants.map((fyv) => (
                                <SelectItem key={fyv.id} value={fyv.id.toString()}>
                                  {fyv.variant_id} - {fyv.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Fiscal year variant for this ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="display_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>Order for display in lists</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_currency_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Currency *</FormLabel>
                          <FormControl>
                            <Input placeholder="USD" {...field} maxLength={3} />
                          </FormControl>
                          <FormDescription>Primary currency for this ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parallel_currency_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parallel Currency</FormLabel>
                          <FormControl>
                            <Input placeholder="EUR" {...field} maxLength={3} />
                          </FormControl>
                          <FormDescription>Optional parallel currency for reporting</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="accounting_principle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accounting Principle</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : value)}
                            value={field.value || "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select accounting principle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {accountingPrinciples
                                .filter((ap) => ap.is_active !== false)
                                .map((ap) => (
                                  <SelectItem key={ap.id} value={ap.code}>
                                    {ap.code} - {ap.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Accounting standard for this ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chart_of_accounts_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chart of Accounts</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))}
                            value={field.value ? field.value.toString() : "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select chart of accounts" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {chartOfAccounts.map((coa: any) => (
                                <SelectItem key={coa.id} value={coa.id.toString()}>
                                  {coa.code || coa.chart_id || coa.name} - {coa.name || coa.description || coa.chart_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Chart of accounts for this ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="base_ledger_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Ledger (for Extension Ledgers)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))}
                            value={field.value ? field.value.toString() : "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select base ledger" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {ledgers.filter(l => !editingLedger || l.id !== editingLedger.id).map((baseLedger) => (
                                <SelectItem key={baseLedger.id} value={baseLedger.id.toString()}>
                                  {baseLedger.code} - {baseLedger.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Base ledger for extension ledgers</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="extension_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Extension Type</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? undefined : value)}
                            value={field.value || "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select extension type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                              <SelectItem value="REPORTING">Reporting</SelectItem>
                              <SelectItem value="TAX">Tax</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Type of extension ledger</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Currency Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_code_currency_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Company Code Currency</FormLabel>
                              <FormDescription>Use company code currency</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="group_currency_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Group Currency</FormLabel>
                              <FormDescription>Use group currency for consolidation</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hard_currency_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Hard Currency</FormLabel>
                              <FormDescription>Use hard currency for statutory reporting</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="index_currency_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Index Currency</FormLabel>
                              <FormDescription>Use index currency</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    {form.watch("index_currency_active") && (
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="index_currency_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Index Currency Code</FormLabel>
                              <FormControl>
                                <Input placeholder="USD" {...field} maxLength={3} />
                              </FormControl>
                              <FormDescription>Currency code if index currency is active</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="allow_postings"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Allow Postings</FormLabel>
                            <FormDescription>Enable postings to this ledger</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_consolidation_ledger"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Consolidation Ledger</FormLabel>
                            <FormDescription>For consolidation purposes</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="document_splitting_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Document Splitting</FormLabel>
                            <FormDescription>Enable document splitting</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requires_approval"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Requires Approval</FormLabel>
                            <FormDescription>Postings require approval</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>Ledger is active</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Default Ledger</FormLabel>
                            <FormDescription>Set as default ledger</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        setEditingLedger(null);
                        form.reset();
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {editingLedger ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingLedger ? "Update" : "Create"} Ledger
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ledgers by code, name, type, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ledgers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Ledgers</span>
          </CardTitle>
          <CardDescription>
            Manage accounting books for parallel accounting and reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p className="text-lg font-medium mb-2">Error loading ledgers</p>
              <p className="text-sm">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
              <Button onClick={() => refetch()} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading ledgers...</p>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">No ledgers found</p>
              <p className="text-sm">Create your first ledger to get started with parallel accounting.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Accounting Principle</TableHead>
                  <TableHead>Fiscal Year Variant</TableHead>
                  <TableHead>Default Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedgers.map((ledger) => (
                  <TableRow key={ledger.id}>
                    <TableCell className="font-medium">{ledger.code}</TableCell>
                    <TableCell>{ledger.name}</TableCell>
                    <TableCell>
                      <Badge variant={ledger.ledger_type === "PRIMARY" ? "default" : "secondary"}>
                        {ledger.ledger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ledger.ledger_category ? (
                        <Badge variant="outline">{ledger.ledger_category.replace(/_/g, " ")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ledger.company_code ? (
                        <span className="font-medium">{ledger.company_code}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ledger.accounting_principle ? (
                        <Badge variant="outline">{ledger.accounting_principle}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ledger.fiscal_year_variant_code ? (
                        <span>{ledger.fiscal_year_variant_code}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{ledger.default_currency_code}</TableCell>
                    <TableCell>
                      <Badge variant={ledger.is_active ? "default" : "secondary"}>
                        {ledger.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {ledger.is_default && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingLedger(ledger)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(ledger)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the ledger "{ledger.code} - {ledger.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(ledger.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Ledger Dialog (Read-Only) */}
      <Dialog open={!!viewingLedger} onOpenChange={(open) => !open && setViewingLedger(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Ledger</DialogTitle>
            <DialogDescription>
              Read-only view of Ledger {viewingLedger?.code}
            </DialogDescription>
          </DialogHeader>

          {viewingLedger && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Code</label>
                  <p className="text-sm mt-1">{viewingLedger.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm mt-1">{viewingLedger.name}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1">{viewingLedger.description || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ledger Type</label>
                  <p className="text-sm mt-1">{viewingLedger.ledger_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm mt-1">{viewingLedger.ledger_category ? viewingLedger.ledger_category.replace(/_/g, " ") : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Code</label>
                  <p className="text-sm mt-1">{viewingLedger.company_code || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fiscal Year Variant</label>
                  <p className="text-sm mt-1">{viewingLedger.fiscal_year_variant_code ? `${viewingLedger.fiscal_year_variant_code} - ${viewingLedger.fiscal_year_variant_name}` : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Default Currency</label>
                  <p className="text-sm mt-1">{viewingLedger.default_currency_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parallel Currency</label>
                  <p className="text-sm mt-1">{viewingLedger.parallel_currency_code || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Accounting Principle</label>
                  <p className="text-sm mt-1">{viewingLedger.accounting_principle || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ledger Group</label>
                  <p className="text-sm mt-1">{viewingLedger.ledger_group_code || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Flags</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={viewingLedger.allow_postings} disabled />
                    <label className="text-sm">Allow Postings</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={viewingLedger.is_consolidation_ledger} disabled />
                    <label className="text-sm">Consolidation Ledger</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={viewingLedger.requires_approval} disabled />
                    <label className="text-sm">Requires Approval</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={viewingLedger.is_active} disabled />
                    <label className="text-sm">Active</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={viewingLedger.is_default} disabled />
                    <label className="text-sm">Default</label>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />
              {/* Administrative Data - collapsible */}
              <div
                className="cursor-pointer flex justify-between items-center select-none py-1 px-1"
                onClick={() => setShowAdminData(!showAdminData)}
              >
                <p className="font-semibold text-sm text-gray-700">Administrative Data</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showAdminData ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {showAdminData && (
                <dl className="grid grid-cols-2 gap-3 px-1 pb-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="text-sm text-gray-900">{(viewingLedger as any)?.created_by ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                    <dd className="text-sm text-gray-900">{(viewingLedger as any)?.updated_by ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="text-sm text-gray-900">{(viewingLedger as any)?.created_at ? new Date((viewingLedger as any).created_at).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="text-sm text-gray-900">{(viewingLedger as any)?.updated_at ? new Date((viewingLedger as any).updated_at).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                    <dd className="text-sm text-gray-900">{(viewingLedger as any)?.tenant_id ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

