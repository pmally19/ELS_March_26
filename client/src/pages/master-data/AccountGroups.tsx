import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Download, Upload, Search, RotateCcw, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { Link } from "wouter";

interface AccountGroup {
  id: number;
  code: string;
  name?: string;
  description: string;
  accountType: string;
  numberRange?: string;
  numberRangeTo?: string;
  numberRangeId?: number;
  fieldStatusGroup?: string;
  oneTimeAccountIndicator?: boolean;
  authorizationGroup?: string;
  sortKey?: string;
  blockIndicator?: boolean;
  reconciliationAccountIndicator?: boolean;
  accountNumberFormat?: string;
  accountNumberLength?: number;
  screenLayout?: string;
  paymentTerms?: string;
  dunningArea?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewAccountGroup {
  code: string;
  name?: string;
  description: string;
  accountType: string;
  numberRange?: string;
  numberRangeTo?: string;
  numberRangeId?: number;
  fieldStatusGroup?: string;
  oneTimeAccountIndicator?: boolean;
  authorizationGroup?: string;
  sortKey?: string;
  blockIndicator?: boolean;
  reconciliationAccountIndicator?: boolean;
  accountNumberFormat?: string;
  accountNumberLength?: number;
  screenLayout?: string;
  paymentTerms?: string;
  dunningArea?: string;
  isActive: boolean;
}

interface NumberRange {
  id: number;
  code: string;
  name: string;
  description: string;
  objectType: string;
  numberFrom: string;
  numberTo: string;
  currentNumber: string;
  isActive: boolean;
}

interface PaymentTerm {
  id: number;
  paymentTermKey: string;
  description: string;
  cashDiscountDays: number;
  paymentDueDays: number;
  cashDiscountPercent: number;
  createdAt: string;
}

export default function AccountGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountGroup | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [viewingAccountGroupDetails, setViewingAccountGroupDetails] = useState<AccountGroup | null>(null);
  const [isAccountGroupDetailsOpen, setIsAccountGroupDetailsOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewAccountGroup>({
    code: "",
    name: "",
    description: "",
    accountType: "",
    numberRange: "",
    numberRangeTo: "",
    numberRangeId: undefined,
    fieldStatusGroup: "",
    oneTimeAccountIndicator: false,
    authorizationGroup: "",
    sortKey: "",
    blockIndicator: false,
    reconciliationAccountIndicator: false,
    accountNumberFormat: "",
    accountNumberLength: undefined,
    screenLayout: "",
    paymentTerms: "",
    dunningArea: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch number ranges for dropdown - filter by account type (for create form)
  const { data: numberRanges = [] } = useQuery<NumberRange[]>({
    queryKey: ['numberRanges', 'create', newItem.accountType],
    queryFn: async () => {
      const url = newItem.accountType
        ? `/api/master-data/account-groups/number-ranges?accountType=${encodeURIComponent(newItem.accountType)}`
        : '/api/master-data/account-groups/number-ranges';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch number ranges');
      return response.json();
    },
    enabled: showCreateDialog,
  });

  // Fetch number ranges for edit form (filter by editing item's account type)
  const { data: editNumberRanges = [] } = useQuery<NumberRange[]>({
    queryKey: ['numberRanges', 'edit', editingItem?.accountType],
    queryFn: async () => {
      const url = editingItem?.accountType
        ? `/api/master-data/account-groups/number-ranges?accountType=${encodeURIComponent(editingItem.accountType)}`
        : '/api/master-data/account-groups/number-ranges';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch number ranges');
      return response.json();
    },
    enabled: showEditDialog && !!editingItem,
  });

  // Fetch account types from the account-types API
  const { data: accountTypesData = [], isLoading: accountTypesLoading } = useQuery<Array<{ id: number; code: string; name: string; is_active: boolean }>>({
    queryKey: ["/api/master-data/account-types"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/account-types", {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      // Handle both array response and object with records property
      const rows: any[] = Array.isArray(data) ? data : (data?.records?.rows || []);
      // Filter only active account types and return code and name
      return rows
        .filter((at: any) => at.is_active !== false)
        .map((at: any) => ({
          id: at.id,
          code: at.code || '',
          name: at.name || at.code || '',
          is_active: at.is_active !== false
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    enabled: true,
  });

  // Extract unique account type codes for filter dropdown (from existing account groups)
  const { data: availableAccountTypeCodes = [] } = useQuery<string[]>({
    queryKey: ["/api/master-data/account-groups", "account-type-codes"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/account-groups");
      if (!response.ok) return [];
      const data = await response.json();
      const rows: any[] = Array.isArray(data) ? data : (data?.rows || data?.data || []);
      // Extract unique account types from existing data
      const types = new Set<string>();
      rows.forEach((r: any) => {
        const type = r.accountType || r.account_type;
        if (type) types.add(type);
      });
      return Array.from(types).sort();
    },
    enabled: true,
  });

  // Fetch payment terms from API
  const { data: paymentTerms = [], isLoading: paymentTermsLoading } = useQuery<PaymentTerm[]>({
    queryKey: ['/api/master-data/payment-terms'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/payment-terms');
      if (!response.ok) throw new Error('Failed to fetch payment terms');
      return response.json();
    },
  });

  const { data: accountGroups = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/master-data/account-groups"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/account-groups");
      if (!response.ok) throw new Error("Failed to fetch account groups");
      const raw = await response.json();
      const rows: any[] = Array.isArray(raw) ? raw : (raw?.rows || raw?.data || []);
      // Normalize possible legacy shapes into UI shape
      const normalized = rows.map((r: any) => ({
        id: r.id,
        code: r.code || r.group_name || r.chart_id || "",
        name: r.name || r.group_name || "",
        description: r.description || r.group_name || "",
        accountType: r.accountType || r.account_type || "",
        numberRange: r.numberRange || r.number_range || r.numberRangeFrom || r.number_range_from || undefined,
        numberRangeTo: r.numberRangeTo || r.number_range_to || undefined,
        numberRangeId: r.numberRangeId || r.number_range_id || undefined,
        fieldStatusGroup: r.fieldStatusGroup || r.field_status_group || undefined,
        oneTimeAccountIndicator: r.oneTimeAccountIndicator !== undefined ? r.oneTimeAccountIndicator : (r.one_time_account_indicator || false),
        authorizationGroup: r.authorizationGroup || r.authorization_group || undefined,
        sortKey: r.sortKey || r.sort_key || undefined,
        blockIndicator: r.blockIndicator !== undefined ? r.blockIndicator : (r.block_indicator || false),
        reconciliationAccountIndicator: r.reconciliationAccountIndicator !== undefined ? r.reconciliationAccountIndicator : (r.reconciliation_account_indicator || false),
        accountNumberFormat: r.accountNumberFormat || r.account_number_format || undefined,
        accountNumberLength: r.accountNumberLength || r.account_number_length || undefined,
        screenLayout: r.screenLayout || r.screen_layout || undefined,
        paymentTerms: r.paymentTerms || r.payment_terms || undefined,
        dunningArea: r.dunningArea || r.dunning_area || undefined,
        isActive: typeof r.isActive === "boolean" ? r.isActive : !!(r.active ?? true),
        createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
      }));
      return normalized;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewAccountGroup) => {
      const response = await fetch("/api/master-data/account-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to create account group";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch { }
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-groups"] });
      setShowCreateDialog(false);
      setNewItem({
        code: "",
        name: "",
        description: "",
        accountType: "",
        numberRange: "",
        numberRangeTo: "",
        numberRangeId: undefined,
        fieldStatusGroup: "",
        oneTimeAccountIndicator: false,
        authorizationGroup: "",
        sortKey: "",
        blockIndicator: false,
        reconciliationAccountIndicator: false,
        accountNumberFormat: "",
        accountNumberLength: undefined,
        screenLayout: "",
        paymentTerms: "",
        dunningArea: "",
        isActive: true
      });
      toast({
        title: "Success",
        description: "Account group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account group",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewAccountGroup> }) => {
      const response = await fetch(`/api/master-data/account-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to update account group";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch { }
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-groups"] });
      setShowEditDialog(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Account group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account group",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/account-groups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let msg = "Failed to delete account group";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch { }
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-groups"] });
      setShowDeleteDialog(false);
      setDeletingItemId(null);
      toast({
        title: "Success",
        description: "Account group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account group",
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: NewAccountGroup[]) => {
      const response = await fetch("/api/master-data/account-groups/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: data }),
      });
      if (!response.ok) {
        let msg = "Failed to import account groups";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch { }
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-groups"] });
      toast({
        title: "Import Successful",
        description: `Imported ${result.imported} account groups successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import account groups",
        variant: "destructive",
      });
    },
  });

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importData: NewAccountGroup[] = jsonData.map((row: any) => {
          return {
            code: row['Code'] || row['code'] || '',
            name: row['Name'] || row['name'] || '',
            description: row['Description'] || row['description'] || '',
            accountType: row['Account Type'] || row['accountType'] || '',
            numberRange: row['Number Range From'] || row['numberRange'] || '',
            numberRangeTo: row['Number Range To'] || row['numberRangeTo'] || '',
            isActive: row['Active'] !== false && row['isActive'] !== false
          };
        });

        if (importData.length > 0) {
          bulkImportMutation.mutate(importData);
        }
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to parse Excel file",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = '';
  };

  const handleExcelExport = () => {
    const exportData = filteredAccountGroups.map(item => ({
      'Code': item.code,
      'Name': item.name || '',
      'Description': item.description,
      'Account Type': item.accountType,
      'Number Range From': item.numberRange || '',
      'Number Range To': item.numberRangeTo || '',
      'Active': item.isActive ? 'Yes' : 'No',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
      'Updated At': new Date(item.updatedAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Groups');
    XLSX.writeFile(workbook, 'account_groups.xlsx');

    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} account groups to Excel`,
    });
  };

  const handleCSVExport = () => {
    const exportData = filteredAccountGroups.map(item => ({
      'Code': item.code,
      'Name': item.name || '',
      'Description': item.description,
      'Account Type': item.accountType,
      'Number Range From': item.numberRange || '',
      'Number Range To': item.numberRangeTo || '',
      'Active': item.isActive ? 'Yes' : 'No',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
      'Updated At': new Date(item.updatedAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'account_groups.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} account groups to CSV`,
    });
  };

  const filteredAccountGroups = (accountGroups as any[]).filter((item: any) => {
    const code = (item.code || "").toString();
    const desc = (item.description || "").toString();
    const type = (item.accountType || "").toString();
    const q = (searchTerm || "").toLowerCase();

    const matchesSearch = code.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      type.toLowerCase().includes(q);
    const isActive = !!item.isActive;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);
    const matchesType = typeFilter === "all" || type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleEdit = (item: AccountGroup) => {
    // Ensure all fields are included when editing
    setEditingItem({
      ...item,
      name: item.name || item.description || "",
      numberRangeId: item.numberRangeId || undefined,
      numberRangeTo: item.numberRangeTo || undefined,
      fieldStatusGroup: item.fieldStatusGroup || "",
      oneTimeAccountIndicator: item.oneTimeAccountIndicator || false,
      authorizationGroup: item.authorizationGroup || "",
      sortKey: item.sortKey || "",
      blockIndicator: item.blockIndicator || false,
      reconciliationAccountIndicator: item.reconciliationAccountIndicator || false,
      accountNumberFormat: item.accountNumberFormat || "",
      accountNumberLength: item.accountNumberLength || undefined,
      screenLayout: item.screenLayout || "",
      paymentTerms: item.paymentTerms || "",
      dunningArea: item.dunningArea || "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
    setShowDeleteDialog(true);
  };

  const handleCreate = () => {
    createMutation.mutate(newItem);
  };

  const handleUpdate = () => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          code: editingItem.code,
          name: editingItem.name,
          description: editingItem.description,
          accountType: editingItem.accountType,
          numberRange: editingItem.numberRange,
          numberRangeTo: editingItem.numberRangeTo,
          numberRangeId: editingItem.numberRangeId,
          fieldStatusGroup: editingItem.fieldStatusGroup,
          oneTimeAccountIndicator: editingItem.oneTimeAccountIndicator,
          authorizationGroup: editingItem.authorizationGroup,
          sortKey: editingItem.sortKey,
          blockIndicator: editingItem.blockIndicator,
          reconciliationAccountIndicator: editingItem.reconciliationAccountIndicator,
          accountNumberFormat: editingItem.accountNumberFormat,
          accountNumberLength: editingItem.accountNumberLength,
          screenLayout: editingItem.screenLayout,
          paymentTerms: editingItem.paymentTerms,
          dunningArea: editingItem.dunningArea,
          isActive: editingItem.isActive
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  // Function to open account group details dialog
  const openAccountGroupDetails = (accountGroup: AccountGroup) => {
    setViewingAccountGroupDetails(accountGroup);
    setIsAccountGroupDetailsOpen(true);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Account Groups</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load account groups"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Account Groups
        </div>
      </div>
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Account Groups</h1>
            <p className="text-sm text-muted-foreground">
              Manage customer and vendor account classification groups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExcelExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('excel-import')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Account Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Account Group</DialogTitle>
                <DialogDescription>
                  Add a new account group for customer/vendor classification
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={newItem.code}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                    placeholder="Enter account group code"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newItem.name || ""}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter account group name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type *</Label>
                  {accountTypesLoading ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Loading account types..." />
                      </SelectTrigger>
                    </Select>
                  ) : accountTypesData.length > 0 ? (
                    <Select
                      value={newItem.accountType}
                      onValueChange={(value) => setNewItem({ ...newItem, accountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypesData.map((type) => (
                          <SelectItem key={type.id} value={type.code}>
                            {type.code} - {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="accountType"
                      value={newItem.accountType}
                      onChange={(e) => setNewItem({ ...newItem, accountType: e.target.value.toUpperCase() })}
                      placeholder="Enter account type (e.g., CUSTOMER, VENDOR)"
                      maxLength={20}
                    />
                  )}
                  {accountTypesData.length === 0 && !accountTypesLoading && (
                    <p className="text-xs text-muted-foreground">
                      No account types found. Please create account types in Master Data → Account Types first.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberRange">Number Range</Label>
                  <div className="space-y-2">
                    <Select
                      value={newItem.numberRangeId?.toString() || "manual"}
                      onValueChange={(value) => {
                        if (value === "manual") {
                          setNewItem({ ...newItem, numberRangeId: undefined, numberRange: "", numberRangeTo: "" });
                        } else {
                          const selectedRange = numberRanges.find(nr => nr.id.toString() === value);
                          if (selectedRange) {
                            setNewItem({
                              ...newItem,
                              numberRangeId: selectedRange.id,
                              numberRange: selectedRange.numberFrom,
                              numberRangeTo: selectedRange.numberTo
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select number range or enter manually" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Enter manually</SelectItem>
                        {numberRanges.length === 0 ? (
                          <SelectItem value="none" disabled>No number ranges available</SelectItem>
                        ) : (
                          numberRanges.map((range) => (
                            <SelectItem key={range.id} value={range.id.toString()}>
                              {range.description || `${range.code} - ${range.name}`} ({range.numberFrom} - {range.numberTo})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {(!newItem.numberRangeId) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="numberRangeFrom" className="text-xs">From</Label>
                          <Input
                            id="numberRangeFrom"
                            value={newItem.numberRange || ""}
                            onChange={(e) => setNewItem({ ...newItem, numberRange: e.target.value })}
                            placeholder="From (e.g., 1000000)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="numberRangeTo" className="text-xs">To</Label>
                          <Input
                            id="numberRangeTo"
                            value={newItem.numberRangeTo || ""}
                            onChange={(e) => setNewItem({ ...newItem, numberRangeTo: e.target.value })}
                            placeholder="To (e.g., 1999999)"
                          />
                        </div>
                      </div>
                    )}
                    {newItem.numberRangeId && (
                      <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        Selected range: {newItem.numberRange} - {newItem.numberRangeTo}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="account">Account Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fieldStatusGroup">Field Status Group</Label>
                        <Input
                          id="fieldStatusGroup"
                          value={newItem.fieldStatusGroup || ""}
                          onChange={(e) => setNewItem({ ...newItem, fieldStatusGroup: e.target.value })}
                          placeholder="0001"
                          maxLength={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="authorizationGroup">Authorization Group</Label>
                        <Input
                          id="authorizationGroup"
                          value={newItem.authorizationGroup || ""}
                          onChange={(e) => setNewItem({ ...newItem, authorizationGroup: e.target.value })}
                          placeholder="0001"
                          maxLength={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sortKey">Sort Key</Label>
                        <Input
                          id="sortKey"
                          value={newItem.sortKey || ""}
                          onChange={(e) => setNewItem({ ...newItem, sortKey: e.target.value })}
                          placeholder="01"
                          maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="screenLayout">Screen Layout</Label>
                        <Input
                          id="screenLayout"
                          value={newItem.screenLayout || ""}
                          onChange={(e) => setNewItem({ ...newItem, screenLayout: e.target.value })}
                          placeholder="0001"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumberFormat">Account Number Format</Label>
                        <Input
                          id="accountNumberFormat"
                          value={newItem.accountNumberFormat || ""}
                          onChange={(e) => setNewItem({ ...newItem, accountNumberFormat: e.target.value })}
                          placeholder="NNNNNN"
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumberLength">Account Number Length</Label>
                        <Input
                          id="accountNumberLength"
                          type="number"
                          value={newItem.accountNumberLength || ""}
                          onChange={(e) => setNewItem({ ...newItem, accountNumberLength: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="10"
                          min={1}
                          max={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentTerms">Payment Terms</Label>
                        {paymentTermsLoading ? (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Loading payment terms..." />
                            </SelectTrigger>
                          </Select>
                        ) : paymentTerms.length > 0 ? (
                          <Select
                            value={newItem.paymentTerms || ""}
                            onValueChange={(value) => setNewItem({ ...newItem, paymentTerms: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentTerms.map((term) => (
                                <SelectItem key={term.id} value={term.paymentTermKey}>
                                  {term.paymentTermKey} - {term.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="No payment terms available" />
                            </SelectTrigger>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dunningArea">Dunning Area</Label>
                        <Input
                          id="dunningArea"
                          value={newItem.dunningArea || ""}
                          onChange={(e) => setNewItem({ ...newItem, dunningArea: e.target.value })}
                          placeholder="01"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="oneTimeAccountIndicator"
                          checked={newItem.oneTimeAccountIndicator || false}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, oneTimeAccountIndicator: checked })}
                        />
                        <Label htmlFor="oneTimeAccountIndicator">One-time Account Indicator</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="blockIndicator"
                          checked={newItem.blockIndicator || false}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, blockIndicator: checked })}
                        />
                        <Label htmlFor="blockIndicator">Block Indicator</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="reconciliationAccountIndicator"
                          checked={newItem.reconciliationAccountIndicator || false}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, reconciliationAccountIndicator: checked })}
                        />
                        <Label htmlFor="reconciliationAccountIndicator">Reconciliation Account Indicator</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={newItem.isActive}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, isActive: checked })}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newItem.code || !newItem.name || !newItem.accountType || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search account groups..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableAccountTypeCodes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          title="Refresh account groups data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Hidden file input for Excel import */}
      <input
        id="excel-import"
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleExcelImport}
      />

      {/* Account Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Groups</CardTitle>
          <CardDescription>
            All account classification groups in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Account Type</TableHead>
                    <TableHead className="hidden md:table-cell">Number Range</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
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
                  ) : filteredAccountGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No account groups found. {searchTerm ? "Try a different search." : "Create your first account group."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccountGroups.map((item: AccountGroup) => {
                      // Get number range display - check multiple field name variations
                      const rangeFrom = item.numberRange || item.numberRangeFrom || (item as any).number_range_from || (item as any).number_range;
                      const rangeTo = item.numberRangeTo || (item as any).number_range_to;
                      const numberRangeDisplay = rangeFrom && rangeTo
                        ? `${rangeFrom} - ${rangeTo}`
                        : rangeFrom
                          ? rangeFrom
                          : "N/A";

                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => openAccountGroupDetails(item)}
                        >
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.name || item.description || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.accountType ? (
                              <Badge variant="outline">{item.accountType}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{numberRangeDisplay}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {item.description || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" title="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account Group</DialogTitle>
            <DialogDescription>
              Update account group information
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code *</Label>
                <Input
                  id="edit-code"
                  value={editingItem.code}
                  onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                  placeholder="Enter account group code"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Enter account group name"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-accountType">Account Type *</Label>
                {accountTypesLoading ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Loading account types..." />
                    </SelectTrigger>
                  </Select>
                ) : accountTypesData.length > 0 ? (
                  <Select
                    value={editingItem.accountType}
                    onValueChange={(value) => setEditingItem({ ...editingItem, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypesData.map((type) => (
                        <SelectItem key={type.id} value={type.code}>
                          {type.code} - {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-accountType"
                    value={editingItem.accountType}
                    onChange={(e) => setEditingItem({ ...editingItem, accountType: e.target.value.toUpperCase() })}
                    placeholder="Enter account type"
                    maxLength={20}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-numberRange">Number Range</Label>
                <div className="space-y-2">
                  <Select
                    value={editingItem.numberRangeId?.toString() || "manual"}
                    onValueChange={(value) => {
                      if (value === "manual") {
                        setEditingItem({ ...editingItem, numberRangeId: undefined, numberRange: "", numberRangeTo: "" });
                      } else {
                        const rangesToSearch = (editNumberRanges && editNumberRanges.length > 0) ? editNumberRanges : numberRanges;
                        const selectedRange = rangesToSearch.find(nr => nr.id.toString() === value);
                        if (selectedRange) {
                          setEditingItem({
                            ...editingItem,
                            numberRangeId: selectedRange.id,
                            numberRange: selectedRange.numberFrom,
                            numberRangeTo: selectedRange.numberTo
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select number range or enter manually" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Enter manually</SelectItem>
                      {(editNumberRanges && editNumberRanges.length > 0 ? editNumberRanges : numberRanges).length === 0 ? (
                        <SelectItem value="none" disabled>No number ranges available</SelectItem>
                      ) : (
                        (editNumberRanges && editNumberRanges.length > 0 ? editNumberRanges : numberRanges).map((range) => (
                          <SelectItem key={range.id} value={range.id.toString()}>
                            {range.description || `${range.code} - ${range.name}`} ({range.numberFrom} - {range.numberTo})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {(!editingItem.numberRangeId) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="edit-numberRangeFrom" className="text-xs">From</Label>
                        <Input
                          id="edit-numberRangeFrom"
                          value={editingItem.numberRange || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, numberRange: e.target.value })}
                          placeholder="From (e.g., 1000000)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-numberRangeTo" className="text-xs">To</Label>
                        <Input
                          id="edit-numberRangeTo"
                          value={editingItem.numberRangeTo || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, numberRangeTo: e.target.value })}
                          placeholder="To (e.g., 1999999)"
                        />
                      </div>
                    </div>
                  )}
                  {editingItem.numberRangeId && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      Selected range: {editingItem.numberRange} - {editingItem.numberRangeTo}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="account">Account Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-fieldStatusGroup">Field Status Group</Label>
                      <Input
                        id="edit-fieldStatusGroup"
                        value={editingItem.fieldStatusGroup || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, fieldStatusGroup: e.target.value })}
                        placeholder="0001"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-authorizationGroup">Authorization Group</Label>
                      <Input
                        id="edit-authorizationGroup"
                        value={editingItem.authorizationGroup || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, authorizationGroup: e.target.value })}
                        placeholder="0001"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-sortKey">Sort Key</Label>
                      <Input
                        id="edit-sortKey"
                        value={editingItem.sortKey || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, sortKey: e.target.value })}
                        placeholder="01"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-screenLayout">Screen Layout</Label>
                      <Input
                        id="edit-screenLayout"
                        value={editingItem.screenLayout || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, screenLayout: e.target.value })}
                        placeholder="0001"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="account" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-accountNumberFormat">Account Number Format</Label>
                      <Input
                        id="edit-accountNumberFormat"
                        value={editingItem.accountNumberFormat || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, accountNumberFormat: e.target.value })}
                        placeholder="NNNNNN"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-accountNumberLength">Account Number Length</Label>
                      <Input
                        id="edit-accountNumberLength"
                        type="number"
                        value={editingItem.accountNumberLength || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, accountNumberLength: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="10"
                        min={1}
                        max={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-paymentTerms">Payment Terms</Label>
                      {paymentTermsLoading ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Loading payment terms..." />
                          </SelectTrigger>
                        </Select>
                      ) : paymentTerms.length > 0 ? (
                        <Select
                          value={editingItem.paymentTerms || ""}
                          onValueChange={(value) => setEditingItem({ ...editingItem, paymentTerms: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTerms.map((term) => (
                              <SelectItem key={term.id} value={term.paymentTermKey}>
                                {term.paymentTermKey} - {term.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="No payment terms available" />
                          </SelectTrigger>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-dunningArea">Dunning Area</Label>
                      <Input
                        id="edit-dunningArea"
                        value={editingItem.dunningArea || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, dunningArea: e.target.value })}
                        placeholder="01"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-oneTimeAccountIndicator"
                        checked={editingItem.oneTimeAccountIndicator || false}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, oneTimeAccountIndicator: checked })}
                      />
                      <Label htmlFor="edit-oneTimeAccountIndicator">One-time Account Indicator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-blockIndicator"
                        checked={editingItem.blockIndicator || false}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, blockIndicator: checked })}
                      />
                      <Label htmlFor="edit-blockIndicator">Block Indicator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-reconciliationAccountIndicator"
                        checked={editingItem.reconciliationAccountIndicator || false}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, reconciliationAccountIndicator: checked })}
                      />
                      <Label htmlFor="edit-reconciliationAccountIndicator">Reconciliation Account Indicator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-active"
                        checked={editingItem.isActive}
                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, isActive: checked })}
                      />
                      <Label htmlFor="edit-active">Active</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!editingItem.code || !editingItem.name || !editingItem.accountType || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Group Details Dialog */}
      <Dialog open={isAccountGroupDetailsOpen} onOpenChange={setIsAccountGroupDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingAccountGroupDetails && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAccountGroupDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Account Group Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingAccountGroupDetails.name || viewingAccountGroupDetails.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingAccountGroupDetails.name || viewingAccountGroupDetails.description}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingAccountGroupDetails.code}
                      </Badge>
                      <Badge
                        variant={viewingAccountGroupDetails.isActive ? "default" : "secondary"}
                        className={viewingAccountGroupDetails.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingAccountGroupDetails.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAccountGroupDetailsOpen(false);
                        handleEdit(viewingAccountGroupDetails);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsAccountGroupDetailsOpen(false);
                        handleDelete(viewingAccountGroupDetails.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.name || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Description:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.description || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Account Type:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.accountType || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">
                            {viewingAccountGroupDetails.isActive ? "Active" : "Inactive"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Number Range Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Number Range From:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.numberRange || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Number Range To:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.numberRangeTo || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Number Range ID:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.numberRangeId || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Field Status Group:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.fieldStatusGroup || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Authorization Group:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.authorizationGroup || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sort Key:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.sortKey || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Screen Layout:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.screenLayout || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Payment Terms:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.paymentTerms || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Dunning Area:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.dunningArea || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Advanced Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">One-Time Account:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.oneTimeAccountIndicator ? "Yes" : "No"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Block Indicator:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.blockIndicator ? "Yes" : "No"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Reconciliation Account:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.reconciliationAccountIndicator ? "Yes" : "No"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Account Number Format:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.accountNumberFormat || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Account Number Length:</dt>
                          <dd className="text-sm text-gray-900">{viewingAccountGroupDetails.accountNumberLength || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Timestamps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created At:</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(viewingAccountGroupDetails.createdAt).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Updated At:</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(viewingAccountGroupDetails.updatedAt).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}