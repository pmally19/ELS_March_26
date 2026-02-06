import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, BookOpen, Search } from "lucide-react";
import { useLocation } from "wouter";

// Schema with all section-wise fields
const glAccountSchema = z.object({
  // Section 1: Basic Data
  account_number: z.string().min(1, "Account number is required").max(20, "Account number must be 20 characters or less"),
  account_name: z.string().min(1, "Account name is required").max(100, "Account name must be 100 characters or less"),
  long_text: z.string().optional(),
  chart_of_accounts_id: z.number().min(1, "Chart of accounts is required"),
  account_type: z.enum(["assets", "liabilities", "equity", "revenue", "expenses"]),
  gl_account_group_id: z.number().int().positive("GL Account Group is required").optional(),
  account_group: z.string().optional(), // Legacy field, kept for backward compatibility
  // Section 2: Account Characteristics
  balance_sheet_account: z.boolean().default(false),
  pl_account: z.boolean().default(false),
  reconciliation_account: z.boolean().default(false),
  cash_account_indicator: z.boolean().default(false),
  block_posting: z.boolean().default(false),
  mark_for_deletion: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // Section 3: Company Code Assignment
  company_code_id: z.number().optional(),
  account_currency: z.string().max(3).optional(),
  field_status_group: z.string().max(4).optional(),
  open_item_management: z.boolean().default(false),
  line_item_display: z.boolean().default(true),
  sort_key: z.string().max(2).optional(),
  // Section 4: Tax Settings
  tax_category: z.string().max(2).optional(),
  posting_without_tax_allowed: z.boolean().default(false),
  // Section 5: Interest Calculation
  interest_calculation_indicator: z.boolean().default(false),
  interest_calculation_frequency: z.string().max(2).optional(),
  interest_calculation_date: z.string().optional(),
  // Section 6: Account Relationships
  alternative_account_number: z.string().max(10).optional(),
  group_account_number: z.string().max(10).optional(),
  trading_partner: z.string().max(10).optional(),
  // Section 7: Additional Settings
  posting_allowed: z.boolean().default(true),
  balance_type: z.enum(["debit", "credit"]).optional(),
  // Section 8: Document Splitting
  item_category_id: z.number().int().positive().optional(),
});

type GLAccount = z.infer<typeof glAccountSchema> & { id: number };

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  currency: string;
}

interface ChartOfAccount {
  id: number;
  chart_id: string;
  description: string;
}

interface GLAccountGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  accountCategory: string;
  numberRangeStart?: string;
  numberRangeEnd?: string;
  accountNumberMinLength?: number;
  accountNumberMaxLength?: number;
  accountNumberPattern?: string;
  isActive: boolean;
}

export default function GeneralLedgerAccounts() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch GL accounts
  const { data: glAccounts = [], isLoading, refetch, error } = useQuery<any[]>({
    queryKey: ["/api/master-data/gl-accounts"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/gl-accounts");
        console.log("GL Accounts fetched:", response?.length || 0, "accounts");
        return response || [];
      } catch (error) {
        console.error("Error fetching GL accounts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch GL accounts. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch Chart of Accounts
  const { data: chartOfAccounts = [] } = useQuery<ChartOfAccount[]>({
    queryKey: ["/api/master-data/chart-of-accounts"],
    queryFn: () => apiGet<ChartOfAccount[]>("/api/master-data/chart-of-accounts"),
  });

  // Fetch Company Codes
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: () => apiGet<CompanyCode[]>("/api/master-data/company-code"),
  });

  // Fetch GL Account Groups (dynamic, no hardcoded data)
  const { data: glAccountGroups = [], isLoading: glAccountGroupsLoading } = useQuery<GLAccountGroup[]>({
    queryKey: ["/api/master-data/gl-account-groups"],
    queryFn: async () => {
      try {
        const response = await apiGet<GLAccountGroup[]>("/api/master-data/gl-account-groups?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching GL account groups:", error);
        return [];
      }
    },
  });

  // Fetch item categories for document splitting
  const { data: itemCategories = [] } = useQuery({
    queryKey: ["/api/master-data/document-splitting/item-categories"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/item-categories?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching item categories:", error);
        return [];
      }
    },
  });

  // Fetch GL account category assignments
  const { data: glAccountCategories = [] } = useQuery({
    queryKey: ["/api/master-data/document-splitting/gl-account-categories"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/gl-account-categories");
        return response || [];
      } catch (error) {
        console.error("Error fetching GL account categories:", error);
        return [];
      }
    },
  });

  // Fetch Account Types (if available from API, otherwise use default)
  const accountTypes = [
    { value: "assets", label: "Assets" },
    { value: "liabilities", label: "Liabilities" },
    { value: "equity", label: "Equity" },
    { value: "revenue", label: "Revenue" },
    { value: "expenses", label: "Expenses" }
  ];

  const form = useForm<z.infer<typeof glAccountSchema>>({
    resolver: zodResolver(glAccountSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      account_number: "",
      account_name: "",
      long_text: "",
      chart_of_accounts_id: undefined,
      account_type: "assets",
      gl_account_group_id: undefined,
      account_group: "",
      balance_sheet_account: false,
      pl_account: false,
      reconciliation_account: false,
      cash_account_indicator: false,
      block_posting: false,
      mark_for_deletion: false,
      is_active: true,
      company_code_id: undefined,
      account_currency: "",
      field_status_group: "",
      open_item_management: false,
      line_item_display: true,
      sort_key: "",
      tax_category: "",
      posting_without_tax_allowed: false,
      interest_calculation_indicator: false,
      interest_calculation_frequency: "",
      interest_calculation_date: "",
      alternative_account_number: "",
      group_account_number: "",
      trading_partner: "",
      posting_allowed: true,
      balance_type: undefined,
    },
  });

  // Watch the selected GL Account Group ID to get validation rules
  const selectedGLAccountGroupId = form.watch("gl_account_group_id");
  const selectedGLAccountGroup = glAccountGroups.find((g) => g.id === selectedGLAccountGroupId);
  
  // Re-validate account number when GL Account Group changes
  useEffect(() => {
    if (selectedGLAccountGroupId && form.getValues("account_number")) {
      const accountNumber = form.getValues("account_number");
      const error = validateAccountNumber(accountNumber);
      if (error) {
        form.setError("account_number", { type: "manual", message: error });
      } else {
        form.clearErrors("account_number");
      }
    }
  }, [selectedGLAccountGroupId, selectedGLAccountGroup]);

  // Helper function to validate account number against GL Account Group range
  const validateAccountNumber = (accountNumber: string): string | undefined => {
    if (!selectedGLAccountGroup) {
      return undefined; // No validation if no group selected
    }

    if (!accountNumber || accountNumber.trim() === "") {
      return undefined; // Let required validation handle empty
    }

    const numStr = accountNumber.trim();

    // Validate length if min/max length is defined
    if (selectedGLAccountGroup.accountNumberMinLength || selectedGLAccountGroup.accountNumberMaxLength) {
      const minLength = selectedGLAccountGroup.accountNumberMinLength || 1;
      const maxLength = selectedGLAccountGroup.accountNumberMaxLength || 20;
      if (numStr.length < minLength || numStr.length > maxLength) {
        return `Account number must be between ${minLength} and ${maxLength} characters`;
      }
    }

    // Validate numeric range if range is defined
    if (selectedGLAccountGroup.numberRangeStart && selectedGLAccountGroup.numberRangeEnd) {
      // Check if account number is numeric
      if (!/^\d+$/.test(numStr)) {
        return "Account number must be numeric for this GL Account Group";
      }

      const accountNum = parseInt(numStr, 10);
      const rangeStart = parseInt(selectedGLAccountGroup.numberRangeStart, 10);
      const rangeEnd = parseInt(selectedGLAccountGroup.numberRangeEnd, 10);

      if (isNaN(accountNum)) {
        return "Account number must be a valid number";
      }

      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        return undefined; // Invalid range in group, skip range validation
      }

      if (accountNum < rangeStart || accountNum > rangeEnd) {
        return `Account number must be between ${selectedGLAccountGroup.numberRangeStart} and ${selectedGLAccountGroup.numberRangeEnd} for this GL Account Group`;
      }
    }

    return undefined; // Valid
  };

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof glAccountSchema>) => {
      return apiPost("/api/master-data/gl-accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/gl-accounts"] });
      setOpen(false);
      setEditingAccount(null);
      form.reset();
      toast({ title: "Success", description: "General ledger account created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create GL account";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof glAccountSchema>) => {
      return apiPut(`/api/master-data/gl-accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/gl-accounts"] });
      setOpen(false);
      setEditingAccount(null);
      form.reset();
      toast({ title: "Success", description: "General ledger account updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update GL account";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/master-data/gl-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/gl-accounts"] });
      toast({ title: "Success", description: "General ledger account deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to delete GL account";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  // Mutation for assigning item category
  const assignItemCategoryMutation = useMutation({
    mutationFn: async ({ glAccountNumber, itemCategoryId, chartOfAccountsId }: { 
      glAccountNumber: string; 
      itemCategoryId: number; 
      chartOfAccountsId?: number;
    }) => {
      return apiPost("/api/master-data/document-splitting/gl-account-categories", {
        gl_account_number: glAccountNumber,
        item_category_id: itemCategoryId,
        chart_of_accounts_id: chartOfAccountsId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/gl-account-categories"] });
    },
    onError: (error: any) => {
      console.error("Error assigning item category:", error);
      // Don't show error toast here, let the main save handle it
    },
  });

  const onSubmit = async (data: z.infer<typeof glAccountSchema>) => {
    // Validate that gl_account_group_id is provided
    if (!data.gl_account_group_id) {
      toast({
        title: "Validation Error",
        description: "Please select a GL Account Group.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate account number against selected GL Account Group
    const accountNumberError = validateAccountNumber(data.account_number);
    if (accountNumberError) {
      toast({
        title: "Validation Error",
        description: accountNumberError,
        variant: "destructive",
      });
      form.setError("account_number", { message: accountNumberError });
      return;
    }
    
    // Prepare payload - exclude item_category_id from main payload
    const { item_category_id, ...accountPayload } = data;
    const payload = {
      ...accountPayload,
      gl_account_group_id: data.gl_account_group_id,
    };
    
    try {
      // Save GL account first
      if (editingAccount) {
        await updateMutation.mutateAsync({ id: editingAccount.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      // Then assign item category if provided
      if (item_category_id) {
        await assignItemCategoryMutation.mutateAsync({
          glAccountNumber: data.account_number,
          itemCategoryId: item_category_id,
          chartOfAccountsId: data.chart_of_accounts_id,
        });
      }

      toast({ 
        title: "Success", 
        description: editingAccount 
          ? "GL account updated successfully" 
          : "GL account created successfully" 
      });
    } catch (error: any) {
      // Error handling is done in mutations
      console.error("Error saving GL account:", error);
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    form.reset({
      account_number: account.account_number || "",
      account_name: account.account_name || "",
      long_text: account.long_text || "",
      chart_of_accounts_id: account.chart_of_accounts_id,
      account_type: account.account_type?.toLowerCase() || "assets",
      gl_account_group_id: account.gl_account_group_id || account.glAccountGroupId,
      account_group: account.account_group || "",
      balance_sheet_account: account.balance_sheet_account || false,
      pl_account: account.pl_account || false,
      reconciliation_account: account.reconciliation_account || false,
      cash_account_indicator: account.cash_account_indicator || false,
      block_posting: account.block_posting || false,
      mark_for_deletion: account.mark_for_deletion || false,
      is_active: account.is_active !== undefined ? account.is_active : true,
      company_code_id: account.company_code_id,
      account_currency: account.account_currency || "",
      field_status_group: account.field_status_group || "",
      open_item_management: account.open_item_management || false,
      line_item_display: account.line_item_display !== undefined ? account.line_item_display : true,
      sort_key: account.sort_key || "",
      tax_category: account.tax_category || "",
      posting_without_tax_allowed: account.posting_without_tax_allowed || false,
      interest_calculation_indicator: account.interest_calculation_indicator || false,
      interest_calculation_frequency: account.interest_calculation_frequency || "",
      interest_calculation_date: account.interest_calculation_date || "",
      alternative_account_number: account.alternative_account_number || "",
      group_account_number: account.group_account_number || "",
      trading_partner: account.trading_partner || "",
      posting_allowed: account.posting_allowed !== undefined ? account.posting_allowed : true,
      balance_type: account.balance_type || undefined,
      // Load item category assignment if exists
      item_category_id: (() => {
        if (!glAccountCategories || glAccountCategories.length === 0) return undefined;
        const assignment = glAccountCategories.find(
          (cat: any) => cat.gl_account_number === account.account_number
        );
        return assignment?.item_category_id || undefined;
      })(),
    });
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    form.reset();
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">General Ledger Accounts</h1>
            <p className="text-muted-foreground">Configure chart of accounts structure and GL account definitions</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create GL Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit General Ledger Account" : "Create General Ledger Account"}
                </DialogTitle>
                <DialogDescription>
                  Configure general ledger account settings and account characteristics
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-7">
                      <TabsTrigger value="basic">Basic Data</TabsTrigger>
                      <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
                      <TabsTrigger value="company">Company Code</TabsTrigger>
                      <TabsTrigger value="tax">Tax Settings</TabsTrigger>
                      <TabsTrigger value="interest">Interest</TabsTrigger>
                      <TabsTrigger value="relationships">Relationships</TabsTrigger>
                      <TabsTrigger value="splitting">Document Splitting</TabsTrigger>
                    </TabsList>
                    
                    {/* Section 1: Basic Data */}
                    <TabsContent value="basic" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="account_number"
                        render={({ field }) => {
                          const validationError = validateAccountNumber(field.value);
                          return (
                            <FormItem>
                              <FormLabel>
                                Account Number *
                                {selectedGLAccountGroup && selectedGLAccountGroup.numberRangeStart && selectedGLAccountGroup.numberRangeEnd && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Range: {selectedGLAccountGroup.numberRangeStart} - {selectedGLAccountGroup.numberRangeEnd})
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={
                                    selectedGLAccountGroup?.numberRangeStart 
                                      ? `e.g., ${selectedGLAccountGroup.numberRangeStart}`
                                      : "1000"
                                  } 
                                  {...field} 
                                  maxLength={selectedGLAccountGroup?.accountNumberMaxLength || 20}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Set custom error if validation fails
                                    if (validationError) {
                                      form.setError("account_number", { 
                                        type: "manual", 
                                        message: validationError 
                                      });
                                    } else {
                                      form.clearErrors("account_number");
                                    }
                                    // Trigger validation
                                    form.trigger("account_number");
                                  }}
                                />
                              </FormControl>
                              {validationError && (
                                <p className="text-sm font-medium text-destructive">{validationError}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                        <FormField
                          control={form.control}
                          name="account_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Cash and Cash Equivalents" {...field} maxLength={100} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="long_text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Long Text</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Detailed description of the account" {...field} />
                            </FormControl>
                            <FormDescription>Detailed description of the account</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="chart_of_accounts_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chart of Accounts *</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select chart of accounts" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(chartOfAccounts as ChartOfAccount[]).map((chart) => (
                                    <SelectItem key={chart.id} value={chart.id.toString()}>
                                      {chart.chart_id} - {chart.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="account_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accountTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="gl_account_group_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GL Account Group *</FormLabel>
                            {glAccountGroupsLoading ? (
                              <FormControl>
                                <Input placeholder="Loading GL account groups..." disabled />
                              </FormControl>
                            ) : glAccountGroups.length > 0 ? (
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value ? parseInt(value) : undefined);
                                  // Re-validate account number when group changes
                                  setTimeout(() => {
                                    form.trigger("account_number");
                                  }, 100);
                                }} 
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select GL account group" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {glAccountGroups
                                    .filter((group) => group.isActive !== false)
                                    .map((group) => (
                                      <SelectItem key={group.id} value={group.id.toString()}>
                                        {group.code} - {group.name}
                                        {group.description && ` (${group.description})`}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <FormControl>
                                <Input placeholder="No GL account groups available" disabled />
                              </FormControl>
                            )}
                            <FormDescription>
                              Select a GL Account Group to define account classification and rules
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    {/* Section 2: Account Characteristics */}
                    <TabsContent value="characteristics" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="balance_sheet_account"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Balance Sheet Account</FormLabel>
                                <FormDescription>Indicates this is a balance sheet account</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pl_account"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Profit & Loss Account</FormLabel>
                                <FormDescription>Indicates this is a P&L account</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reconciliation_account"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Reconciliation Account</FormLabel>
                                <FormDescription>For sub-ledger reconciliation</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cash_account_indicator"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Cash Account Indicator</FormLabel>
                                <FormDescription>Identifies cash accounts</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="block_posting"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Block Posting</FormLabel>
                                <FormDescription>Blocks all postings to this account</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mark_for_deletion"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Mark for Deletion</FormLabel>
                                <FormDescription>Soft delete flag</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
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
                                <FormLabel>Active Status</FormLabel>
                                <FormDescription>Account is active</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="posting_allowed"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Posting Allowed</FormLabel>
                                <FormDescription>Allows postings to this account</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="balance_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Balance Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select balance type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="debit">Debit</SelectItem>
                                <SelectItem value="credit">Credit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    {/* Section 3: Company Code Assignment */}
                    <TabsContent value="company" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company_code_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Code</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  const companyCodeId = value === "none" ? undefined : parseInt(value);
                                  field.onChange(companyCodeId);
                                  
                                  // Auto-populate currency from selected company code
                                  if (companyCodeId) {
                                    const selectedCompany = (companyCodes as CompanyCode[]).find(cc => cc.id === companyCodeId);
                                    if (selectedCompany?.currency) {
                                      form.setValue("account_currency", selectedCompany.currency);
                                    }
                                  } else {
                                    form.setValue("account_currency", "");
                                  }
                                }} 
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company code" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {(companyCodes as CompanyCode[]).map((cc) => (
                                    <SelectItem key={cc.id} value={cc.id.toString()}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Links account to company code for multi-company support</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="account_currency"
                          render={({ field }) => {
                            const companyCodeId = form.watch("company_code_id");
                            const selectedCompany = companyCodeId 
                              ? (companyCodes as CompanyCode[]).find(cc => cc.id === companyCodeId)
                              : null;
                            const isAutoPopulated = selectedCompany?.currency === field.value;
                            
                            return (
                              <FormItem>
                                <FormLabel>Account Currency</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="USD" 
                                      {...field} 
                                      maxLength={3}
                                      readOnly={isAutoPopulated}
                                      className={isAutoPopulated ? "bg-muted" : ""}
                                    />
                                    {isAutoPopulated && (
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        Auto-filled
                                      </span>
                                    )}
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  {isAutoPopulated 
                                    ? `Currency automatically set from company code: ${selectedCompany?.code} (${field.value})`
                                    : "Currency code (e.g., USD, EUR). Auto-filled when company code is selected."
                                  }
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="field_status_group"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Status Group</FormLabel>
                              <FormControl>
                                <Input placeholder="0001" {...field} maxLength={4} />
                              </FormControl>
                              <FormDescription>Controls field status in document entry</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sort_key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort Key</FormLabel>
                              <FormControl>
                                <Input placeholder="01" {...field} maxLength={2} />
                              </FormControl>
                              <FormDescription>Default sort sequence for line items</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="open_item_management"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Open Item Management</FormLabel>
                                <FormDescription>Enables open item tracking for reconciliation</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="line_item_display"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Line Item Display</FormLabel>
                                <FormDescription>Controls whether line items are displayed</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Section 4: Tax Settings */}
                    <TabsContent value="tax" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tax_category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Category</FormLabel>
                              <FormControl>
                                <Input placeholder="A1" {...field} maxLength={2} />
                              </FormControl>
                              <FormDescription>Tax code for tax calculations</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="posting_without_tax_allowed"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Posting Without Tax Allowed</FormLabel>
                                <FormDescription>Allows postings without tax</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Section 5: Interest Calculation */}
                    <TabsContent value="interest" className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="interest_calculation_indicator"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Interest Calculation Indicator</FormLabel>
                              <FormDescription>Enables interest calculation</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="interest_calculation_frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interest Calculation Frequency</FormLabel>
                              <FormControl>
                                <Input placeholder="01" {...field} maxLength={2} />
                              </FormControl>
                              <FormDescription>Frequency code for interest calculation</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="interest_calculation_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interest Calculation Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>Next interest calculation date</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Section 6: Account Relationships */}
                    <TabsContent value="relationships" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="alternative_account_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alternative Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="ALT001" {...field} maxLength={10} />
                              </FormControl>
                              <FormDescription>Alternative account identifier</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="group_account_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="GRP001" {...field} maxLength={10} />
                              </FormControl>
                              <FormDescription>Group account for consolidation</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trading_partner"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading Partner</FormLabel>
                              <FormControl>
                                <Input placeholder="TP001" {...field} maxLength={10} />
                              </FormControl>
                              <FormDescription>Trading partner account reference</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Section 8: Document Splitting */}
                    <TabsContent value="splitting" className="space-y-4 pt-4">
                      <div className="rounded-lg border p-4 bg-muted/50">
                        <h3 className="text-sm font-semibold mb-2">Document Splitting Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Assign an item category to this GL account for document splitting functionality.
                          This determines how the account will be split when document splitting is enabled.
                        </p>
                        <FormField
                          control={form.control}
                          name="item_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Category</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "none") {
                                    field.onChange(undefined);
                                  } else {
                                    field.onChange(parseInt(value));
                                  }
                                }}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select item category (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None - No splitting category</SelectItem>
                                  {itemCategories.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.code} - {category.name} ({category.category_type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select an item category to enable document splitting for this account.
                                Categories define how accounts are classified for splitting rules.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {itemCategories.length === 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <strong>No item categories available.</strong> Create item categories in{" "}
                              <a 
                                href="/master-data/document-splitting" 
                                className="underline font-semibold"
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.location.href = "/master-data/document-splitting";
                                }}
                              >
                                Document Splitting Configuration
                              </a>{" "}
                              first.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOpen(false)}
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
                          {editingAccount ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingAccount ? "Update" : "Create"} GL Account
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>General Ledger Accounts</span>
              </CardTitle>
              <CardDescription>
                Manage chart of accounts structure and general ledger account definitions
              </CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by account number, name, type, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p className="text-lg font-medium mb-2">Error loading GL accounts</p>
              <p className="text-sm">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
              <Button onClick={() => refetch()} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading general ledger accounts...</p>
            </div>
          ) : (glAccounts as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">No general ledger accounts found</p>
              <p className="text-sm">Create your first GL account to get started with chart of accounts management.</p>
            </div>
          ) : (
            <>
              {(() => {
                // Filter accounts based on search query
                const filteredAccounts = (glAccounts as any[]).filter((account: any) => {
                  if (!searchQuery.trim()) return true;
                  
                  const query = searchQuery.toLowerCase();
                  const accountNumber = (account.account_number || '').toLowerCase();
                  const accountName = (account.account_name || '').toLowerCase();
                  const accountType = (account.account_type || '').toLowerCase();
                  const accountGroup = (account.account_group || '').toLowerCase();
                  const companyCode = (account.company_code || '').toLowerCase();
                  
                  // Get item category for search
                  const assignment = glAccountCategories.find(
                    (cat: any) => cat.gl_account_number === account.account_number
                  );
                  const category = assignment 
                    ? itemCategories.find((ic: any) => ic.id === assignment.item_category_id)
                    : null;
                  const categoryCode = category ? (category.code || '').toLowerCase() : '';
                  const categoryName = category ? (category.name || '').toLowerCase() : '';
                  
                  return (
                    accountNumber.includes(query) ||
                    accountName.includes(query) ||
                    accountType.includes(query) ||
                    accountGroup.includes(query) ||
                    companyCode.includes(query) ||
                    categoryCode.includes(query) ||
                    categoryName.includes(query)
                  );
                });
                
                if (filteredAccounts.length === 0 && searchQuery.trim()) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-lg font-medium mb-2">No accounts found</p>
                      <p className="text-sm">Try adjusting your search query</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear Search
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Chart</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Item Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell className="capitalize">{account.account_type}</TableCell>
                    <TableCell>{account.account_group}</TableCell>
                    <TableCell>{account.chart_of_accounts_code || account.chart_of_accounts_id}</TableCell>
                    <TableCell>{account.company_code || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const assignment = glAccountCategories.find(
                          (cat: any) => cat.gl_account_number === account.account_number
                        );
                        const category = assignment 
                          ? itemCategories.find((ic: any) => ic.id === assignment.item_category_id)
                          : null;
                        return category ? (
                          <span className="text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                            {category.code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(account)}
                          disabled={deleteMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the GL account "{account.account_number} - {account.account_name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(account.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
