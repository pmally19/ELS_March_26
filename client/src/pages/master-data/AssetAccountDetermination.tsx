import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Eye, Search, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";

interface AccountDeterminationRule {
  id: number;
  asset_class_id: number;
  asset_class_code: string;
  asset_class_name: string;
  transaction_type: string;
  account_category: string;
  gl_account_id: number;
  gl_account_number?: string;
  gl_account_name?: string;
  gl_account_type?: string;
  company_code_id?: number;
  company_code?: string;
  company_name?: string;
  description?: string;
  is_active: boolean;
}

interface AssetClass {
  id: number;
  code: string;
  name: string;
}

interface GLAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_type: string;
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface AccountCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  account_type: string;
  is_active: boolean;
}

interface TransactionType {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// Form Schema
const accountDeterminationSchema = z.object({
  asset_class_id: z.string().min(1, "Asset class is required"),
  transaction_type: z.string().min(1, "Transaction type is required"),
  account_category: z.string().min(1, "Account category is required"),
  gl_account_id: z.string().min(1, "GL account is required"),
  company_code_id: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type AccountDeterminationFormValues = z.infer<typeof accountDeterminationSchema>;

export default function AssetAccountDetermination() {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AccountDeterminationRule | null>(null);
  const [viewingRule, setViewingRule] = useState<AccountDeterminationRule | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssetClass, setFilterAssetClass] = useState<string>("all");
  const [filterTransactionType, setFilterTransactionType] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, refetch } = useQuery<AccountDeterminationRule[]>({
    queryKey: ["/api/master-data/asset-account-determination"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/asset-account-determination");
      return await response.json();
    },
  });

  const { data: assetClasses = [] } = useQuery<AssetClass[]>({
    queryKey: ["/api/master-data/asset-classes"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/asset-classes");
      return await response.json();
    },
  });

  const { data: glAccounts = [] } = useQuery<GLAccount[]>({
    queryKey: ["/api/general-ledger/gl-accounts"],
    queryFn: async () => {
      const response = await apiRequest("/api/general-ledger/gl-accounts");
      return await response.json();
    },
  });

  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/company-code");
      return await response.json();
    },
  });

  const { data: accountCategories = [] } = useQuery<AccountCategory[]>({
    queryKey: ["/api/master-data/account-categories"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/account-categories?is_active=true");
      return await response.json();
    },
  });

  const { data: transactionTypes = [] } = useQuery<TransactionType[]>({
    queryKey: ["/api/master-data/transaction-types"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/transaction-types?is_active=true");
      return await response.json();
    },
  });

  // Form setup
  const form = useForm<AccountDeterminationFormValues>({
    resolver: zodResolver(accountDeterminationSchema),
    defaultValues: {
      asset_class_id: "",
      transaction_type: "",
      account_category: "",
      gl_account_id: "",
      company_code_id: "all",
      description: "",
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingRule) {
      form.reset({
        asset_class_id: editingRule.asset_class_id.toString(),
        transaction_type: editingRule.transaction_type,
        account_category: editingRule.account_category,
        gl_account_id: editingRule.gl_account_id.toString(),
        company_code_id: editingRule.company_code_id?.toString() || "all",
        description: editingRule.description || "",
        is_active: editingRule.is_active,
      });
    } else {
      form.reset({
        asset_class_id: "",
        transaction_type: "",
        account_category: "",
        gl_account_id: "",
        company_code_id: "all",
        description: "",
        is_active: true,
      });
    }
  }, [editingRule, form]);

  const getFormValue = (value: string | undefined): number | null => {
    if (!value || value === "") return null;
    return parseInt(value);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<AccountDeterminationRule>) => {
      const response = await apiRequest("/api/master-data/asset-account-determination", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account determination rule");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-determination"] });
      toast({
        title: "Success",
        description: "Account determination rule created successfully",
      });
      setOpen(false);
      setEditingRule(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account determination rule",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AccountDeterminationRule> }) => {
      const response = await apiRequest(`/api/master-data/asset-account-determination/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update account determination rule");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-determination"] });
      toast({
        title: "Success",
        description: "Account determination rule updated successfully",
      });
      setOpen(false);
      setEditingRule(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account determination rule",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/asset-account-determination/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account determination rule");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-determination"] });
      toast({
        title: "Success",
        description: "Account determination rule deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account determination rule",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (rule: AccountDeterminationRule) => {
    setEditingRule(rule);
    setOpen(true);
  };

  const handleView = (rule: AccountDeterminationRule) => {
    setViewingRule(rule);
    setViewOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRule(null);
    form.reset();
  };

  const onSubmit = (values: AccountDeterminationFormValues) => {
    const data = {
      asset_class_id: parseInt(values.asset_class_id),
      transaction_type: values.transaction_type,
      account_category: values.account_category,
      gl_account_id: parseInt(values.gl_account_id),
      company_code_id: getFormValue(values.company_code_id) || undefined,
      description: values.description || undefined,
      is_active: values.is_active,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter rules based on search and filters
  const filteredRules = rules.filter((rule) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        rule.asset_class_code.toLowerCase().includes(searchLower) ||
        rule.asset_class_name.toLowerCase().includes(searchLower) ||
        rule.transaction_type.toLowerCase().includes(searchLower) ||
        (rule.company_code || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Asset class filter
    if (filterAssetClass !== "all" && rule.asset_class_id !== parseInt(filterAssetClass)) {
      return false;
    }

    // Transaction type filter
    if (filterTransactionType !== "all" && rule.transaction_type !== filterTransactionType) {
      return false;
    }

    return true;
  });

  const getTransactionTypeLabel = (type: string) => {
    const tt = transactionTypes.find(t => t.code === type);
    return tt ? tt.name : type;
  };

  const getAccountCategoryLabel = (category: string) => {
    const ac = accountCategories.find(c => c.code === category);
    return ac ? ac.name : category;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Account Determination Rules</h1>
            <p className="text-sm text-muted-foreground">
              Configure GL accounts for asset transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRule(null)}>
                <Plus className="mr-2 h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Account Determination Rule" : "Create Account Determination Rule"}
                </DialogTitle>
                <DialogDescription>
                  {editingRule
                    ? "Update GL account assignment for asset transactions"
                    : "Configure which GL accounts to use for asset transactions"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="asset_class_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Class *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select asset class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assetClasses.map((ac) => (
                                <SelectItem key={ac.id} value={ac.id.toString()}>
                                  {ac.code} - {ac.name}
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
                      name="transaction_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {transactionTypes.map((tt) => (
                                <SelectItem key={tt.id} value={tt.code}>
                                  {tt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="account_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accountCategories.map((ac) => (
                                <SelectItem key={ac.id} value={ac.code}>
                                  {ac.name}
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
                      name="gl_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GL Account *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {glAccounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.account_number} - {acc.account_name}
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
                    name="company_code_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Code (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "all"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All companies" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Companies</SelectItem>
                            {companyCodes.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id.toString()}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Leave empty to apply this rule to all company codes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <Input
                          {...field}
                          placeholder="Enter description"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Is this rule active and available for use?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingRule
                        ? "Save Changes"
                        : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules by asset class, transaction type, or company code..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Determination Rules</CardTitle>
              <CardDescription>
                Rules that determine which GL accounts to use for asset transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterAssetClass} onValueChange={setFilterAssetClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by asset class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Classes</SelectItem>
                  {assetClasses.map((ac) => (
                    <SelectItem key={ac.id} value={ac.id.toString()}>
                      {ac.code} - {ac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTransactionType} onValueChange={setFilterTransactionType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map((tt) => (
                    <SelectItem key={tt.id} value={tt.code}>
                      {tt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">Asset Class</TableHead>
                    <TableHead className="hidden sm:table-cell">Transaction Type</TableHead>
                    <TableHead className="hidden md:table-cell">Account Category</TableHead>
                    <TableHead className="hidden md:table-cell">Company Code</TableHead>
                    <TableHead className="hidden lg:table-cell">GL Account</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        {searchQuery || filterAssetClass !== "all" || filterTransactionType !== "all"
                          ? "No rules found matching your filters. Try adjusting your search or filters."
                          : "No account determination rules found. Create your first rule to get started."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {rule.asset_class_code} - {rule.asset_class_name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getTransactionTypeLabel(rule.transaction_type)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getAccountCategoryLabel(rule.account_category)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {rule.company_code || "All Companies"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {rule.gl_account_number ? (
                            <span className="text-sm">
                              {rule.gl_account_number} - {rule.gl_account_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              rule.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {rule.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(rule)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(rule)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Account Determination Rule</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this rule? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(rule.id)}
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Account Determination Rule Details</DialogTitle>
            <DialogDescription>View complete rule configuration</DialogDescription>
          </DialogHeader>
          {viewingRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset Class</p>
                  <p className="font-medium">{viewingRule.asset_class_code} - {viewingRule.asset_class_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Type</p>
                  <p className="font-medium">{getTransactionTypeLabel(viewingRule.transaction_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Category</p>
                  <p className="font-medium">{getAccountCategoryLabel(viewingRule.account_category)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company Code</p>
                  <p className="font-medium">{viewingRule.company_code || "All Companies"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{viewingRule.is_active ? "Active" : "Inactive"}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">GL Account</h4>
                <div className="space-y-2">
                  {viewingRule.gl_account_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="text-sm font-medium">{viewingRule.gl_account_number} - {viewingRule.gl_account_name}</p>
                    </div>
                  )}
                  {viewingRule.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{viewingRule.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
