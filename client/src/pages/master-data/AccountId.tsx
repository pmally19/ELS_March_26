import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Download, Search, RotateCcw, Edit, Trash2, CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';

interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface BankMaster {
  id: number;
  bankKey: string;
  bankName: string;
  companyCodeId?: number;
}

interface GLAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_type?: string;
  is_active?: boolean;
}

interface AccountId {
  id: number;
  accountId: string;
  description: string;
  bankMasterId?: number;
  bankKey?: string;
  bankName?: string;
  companyCodeId?: number;
  companyCode?: string;
  companyName?: string;
  accountNumber?: string;
  accountType: string;
  currency: string;
  glAccountId?: number;
  routingNumber?: string;
  iban?: string;
  accountHolderName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewAccountId {
  accountId: string;
  description: string;
  bankMasterId?: number;
  companyCodeId?: number;
  accountNumber?: string;
  accountType: string;
  currency: string;
  glAccountId?: number;
  routingNumber?: string;
  iban?: string;
  accountHolderName?: string;
  isActive: boolean;
}

export default function AccountId() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountId | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<NewAccountId>({
    accountId: "",
    description: "",
    bankMasterId: undefined,
    companyCodeId: undefined,
    accountNumber: "",
    accountType: "checking",
    currency: "USD",
    glAccountId: undefined,
    routingNumber: "",
    iban: "",
    accountHolderName: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/company-code");
      if (!response.ok) throw new Error("Failed to fetch company codes");
      return response.json();
    },
  });

  // Fetch bank masters for dropdown (with company code info)
  const { data: bankMasters = [] } = useQuery<BankMaster[]>({
    queryKey: ["/api/master-data/bank-master"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/bank-master");
      if (!response.ok) throw new Error("Failed to fetch bank masters");
      const raw = await response.json();
      return Array.isArray(raw) ? raw.map((r: any) => ({
        id: r.id,
        bankKey: r.bank_key || r.bankKey || "",
        bankName: r.bank_name || r.bankName || "",
        companyCodeId: r.company_code_id || r.companyCodeId || undefined,
      })) : [];
    },
  });

  // Fetch GL accounts for dropdown
  const { data: glAccounts = [], isLoading: glAccountsLoading } = useQuery<GLAccount[]>({
    queryKey: ["/api/master-data/gl-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/gl-accounts");
      if (!response.ok) throw new Error("Failed to fetch GL accounts");
      const data = await response.json();
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
  });

  const { data: accountIds = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/master-data/account-id"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/master-data/account-id");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || `Failed to fetch account ID data: ${response.status} ${response.statusText}`);
        }
        const raw = await response.json();
        const rows: any[] = Array.isArray(raw) ? raw : (raw?.rows || raw?.data || []);
        return rows.map((r: any) => ({
          id: r.id,
          accountId: r.account_id || r.accountId || "",
          description: r.description || "",
          bankMasterId: r.bank_master_id || r.bankMasterId || undefined,
          bankKey: r.bank_key || r.bankKey || "",
          bankName: r.bank_name || r.bankName || "",
          companyCodeId: r.company_code_id || r.companyCodeId || undefined,
          companyCode: r.company_code || r.companyCode || "",
          companyName: r.company_name || r.companyName || "",
          accountNumber: r.account_number || r.accountNumber || "",
          accountType: r.account_type || r.accountType || "checking",
          currency: r.currency || "USD",
          glAccountId: r.gl_account_id || r.glAccountId || undefined,
          routingNumber: r.routing_number || r.routingNumber || "",
          iban: r.iban || "",
          accountHolderName: r.account_holder_name || r.accountHolderName || "",
          isActive: typeof r.is_active === "boolean" ? r.is_active : !!(r.isActive ?? true),
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
        }));
      } catch (err: any) {
        console.error("Error fetching account ID data:", err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewAccountId) => {
      const response = await fetch("/api/master-data/account-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to create account ID";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-id"] });
      setShowCreateDialog(false);
      setNewItem({
        accountId: "",
        description: "",
        bankMasterId: undefined,
        companyCodeId: undefined,
        accountNumber: "",
        accountType: "checking",
        currency: "USD",
        glAccountId: undefined,
        routingNumber: "",
        iban: "",
        accountHolderName: "",
        isActive: true
      });
      toast({
        title: "Success",
        description: "Account ID created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account ID",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewAccountId> }) => {
      const response = await fetch(`/api/master-data/account-id/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to update account ID";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-id"] });
      setShowEditDialog(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Account ID updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account ID",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/account-id/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let msg = "Failed to delete account ID";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-id"] });
      setShowDeleteDialog(false);
      setDeletingItemId(null);
      toast({
        title: "Success",
        description: "Account ID deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account ID",
        variant: "destructive",
      });
    },
  });

  const filteredData = accountIds.filter((item) => {
    const matchesSearch =
      item.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.accountNumber && item.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.bankName && item.bankName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (item: AccountId) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const dataToExport = filteredData.map(item => ({
      "Account ID": item.accountId,
      "Description": item.description,
      "Bank": item.bankName || "",
      "Bank Key": item.bankKey || "",
      "Company Code": item.companyCode || "",
      "Company Name": item.companyName || "",
      "Account Number": item.accountNumber || "",
      "Account Type": item.accountType,
      "Currency": item.currency,
      "Status": item.isActive ? "Active" : "Inactive",
      "Created At": new Date(item.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Account ID Master");
    XLSX.writeFile(wb, `account-id-master-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: `Exported ${dataToExport.length} account ID records`,
    });
  };

  useEffect(() => {
    document.title = "Account ID Master | MallyERP";
  }, []);

  return (
    <div className="space-y-6 p-6">
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
          Master Data → Account ID
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-blue-600" />
            Account ID Master
          </h1>
          <p className="text-gray-600 mt-2">
            Manage account identifiers for payment processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account ID
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by account ID, description, account number, or bank..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account ID Records</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredData.length} account ID${filteredData.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading account ID data...</div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 font-semibold mb-2">
                Error loading account ID data
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {error instanceof Error ? error.message : "Please try again"}
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No account ID records found. Create your first account ID record.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Account ID</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold">Bank</th>
                    <th className="text-left p-3 font-semibold">Company Code</th>
                    <th className="text-left p-3 font-semibold">Account Number</th>
                    <th className="text-left p-3 font-semibold">Type</th>
                    <th className="text-left p-3 font-semibold">Currency</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm font-semibold">{item.accountId}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3">
                        {item.bankName ? (
                          <div>
                            <div className="font-medium">{item.bankName}</div>
                            {item.bankKey && (
                              <div className="text-xs text-gray-500">{item.bankKey}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.companyCode ? (
                          <div>
                            <div className="font-semibold">{item.companyCode}</div>
                            {item.companyName && (
                              <div className="text-xs text-gray-500">{item.companyName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-sm">{item.accountNumber || "-"}</td>
                      <td className="p-3">
                        <Badge variant="outline">{item.accountType}</Badge>
                      </td>
                      <td className="p-3">{item.currency}</td>
                      <td className="p-3">
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Account ID</DialogTitle>
            <DialogDescription>
              Add a new account identifier for payment processing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountId">Account ID *</Label>
                <Input
                  id="accountId"
                  value={newItem.accountId}
                  onChange={(e) => setNewItem({ ...newItem, accountId: e.target.value.toUpperCase() })}
                  placeholder="e.g., ACC001"
                  maxLength={10}
                />
              </div>
              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={newItem.accountType}
                  onValueChange={(value) => setNewItem({ ...newItem, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="money-market">Money Market</SelectItem>
                    <SelectItem value="certificate">Certificate of Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="e.g., Main Operating Account"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="bankMaster">Bank</Label>
              <Select
                value={newItem.bankMasterId?.toString() || "none"}
                onValueChange={(value) => {
                  const bankId = value === "none" ? undefined : parseInt(value);
                  const selectedBank = bankMasters.find(bm => bm.id === parseInt(value));
                  // Auto-populate company code from selected bank
                  setNewItem({ 
                    ...newItem, 
                    bankMasterId: bankId,
                    companyCodeId: selectedBank?.companyCodeId || newItem.companyCodeId
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bankMasters.map((bm) => (
                    <SelectItem key={bm.id} value={bm.id.toString()}>
                      {bm.bankKey} - {bm.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newItem.bankMasterId && (() => {
              const selectedBank = bankMasters.find(bm => bm.id === newItem.bankMasterId);
              const companyCode = companyCodes.find(cc => cc.id === selectedBank?.companyCodeId);
              if (companyCode) {
                return (
                  <div>
                    <Label>Company Code</Label>
                    <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                      {companyCode.code} - {companyCode.name}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from selected bank</p>
                  </div>
                );
              }
              return null;
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={newItem.accountNumber}
                  onChange={(e) => setNewItem({ ...newItem, accountNumber: e.target.value })}
                  placeholder="e.g., 1234567890"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={newItem.currency}
                  onValueChange={(value) => setNewItem({ ...newItem, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="routingNumber">Routing Number</Label>
                <Input
                  id="routingNumber"
                  value={newItem.routingNumber}
                  onChange={(e) => setNewItem({ ...newItem, routingNumber: e.target.value })}
                  placeholder="e.g., 021000021"
                  maxLength={20}
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={newItem.iban}
                  onChange={(e) => setNewItem({ ...newItem, iban: e.target.value.toUpperCase() })}
                  placeholder="e.g., GB82WEST12345698765432"
                  maxLength={34}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                value={newItem.accountHolderName}
                onChange={(e) => setNewItem({ ...newItem, accountHolderName: e.target.value })}
                placeholder="e.g., Company Name or Individual Name"
                maxLength={100}
              />
            </div>
              <div>
                <Label htmlFor="glAccountId">GL Account *</Label>
                <Select
                  value={newItem.glAccountId?.toString() || ""}
                  onValueChange={(value) => setNewItem({ ...newItem, glAccountId: value ? parseInt(value) : undefined })}
                >
                  <SelectTrigger id="glAccountId">
                    <SelectValue placeholder="Select GL Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccountsLoading ? (
                      <SelectItem value="loading" disabled>Loading GL accounts...</SelectItem>
                    ) : glAccounts && glAccounts.length > 0 ? (
                      glAccounts
                        .filter((acc: GLAccount) => acc.is_active !== false)
                        .map((account: GLAccount) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.account_number} - {account.account_name}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-accounts" disabled>No GL accounts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newItem.isActive}
                onCheckedChange={(checked) => setNewItem({ ...newItem, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newItem.accountId || !newItem.description) {
                    toast({
                      title: "Validation Error",
                      description: "Please fill in all required fields (Account ID and Description)",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!newItem.bankMasterId) {
                    toast({
                      title: "Validation Error",
                      description: "Please select a bank to auto-fill company code",
                      variant: "destructive",
                    });
                    return;
                  }
                  const selectedBank = bankMasters.find(bm => bm.id === newItem.bankMasterId);
                  if (!selectedBank?.companyCodeId) {
                    toast({
                      title: "Validation Error",
                      description: "Selected bank does not have a company code assigned",
                      variant: "destructive",
                    });
                    return;
                  }
                  createMutation.mutate({
                    ...newItem,
                    companyCodeId: selectedBank.companyCodeId
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account ID</DialogTitle>
            <DialogDescription>
              Update account identifier details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-accountId">Account ID *</Label>
                  <Input
                    id="edit-accountId"
                    value={editingItem.accountId}
                    onChange={(e) => setEditingItem({ ...editingItem, accountId: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-accountType">Account Type *</Label>
                  <Select
                    value={editingItem.accountType}
                    onValueChange={(value) => setEditingItem({ ...editingItem, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="money-market">Money Market</SelectItem>
                      <SelectItem value="certificate">Certificate of Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Input
                  id="edit-description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="edit-bankMaster">Bank</Label>
                <Select
                  value={editingItem.bankMasterId?.toString() || "none"}
                  onValueChange={(value) => {
                    const bankId = value === "none" ? undefined : parseInt(value);
                    const selectedBank = bankMasters.find(bm => bm.id === parseInt(value));
                    // Auto-populate company code from selected bank
                    setEditingItem({ 
                      ...editingItem, 
                      bankMasterId: bankId,
                      companyCodeId: selectedBank?.companyCodeId || editingItem.companyCodeId
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {bankMasters.map((bm) => (
                      <SelectItem key={bm.id} value={bm.id.toString()}>
                        {bm.bankKey} - {bm.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingItem.bankMasterId && (() => {
                const selectedBank = bankMasters.find(bm => bm.id === editingItem.bankMasterId);
                const companyCode = companyCodes.find(cc => cc.id === selectedBank?.companyCodeId);
                if (companyCode) {
                  return (
                    <div>
                      <Label>Company Code</Label>
                      <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                        {companyCode.code} - {companyCode.name}
                      </div>
                      <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from selected bank</p>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-accountNumber">Account Number</Label>
                  <Input
                    id="edit-accountNumber"
                    value={editingItem.accountNumber || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, accountNumber: e.target.value })}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-currency">Currency *</Label>
                  <Select
                    value={editingItem.currency}
                    onValueChange={(value) => setEditingItem({ ...editingItem, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-routingNumber">Routing Number</Label>
                  <Input
                    id="edit-routingNumber"
                    value={editingItem.routingNumber || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, routingNumber: e.target.value })}
                    placeholder="e.g., 021000021"
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-iban">IBAN</Label>
                  <Input
                    id="edit-iban"
                    value={editingItem.iban || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, iban: e.target.value.toUpperCase() })}
                    placeholder="e.g., GB82WEST12345698765432"
                    maxLength={34}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-accountHolderName">Account Holder Name</Label>
                <Input
                  id="edit-accountHolderName"
                  value={editingItem.accountHolderName || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, accountHolderName: e.target.value })}
                  placeholder="e.g., Company Name or Individual Name"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="edit-glAccountId">GL Account *</Label>
                <Select
                  value={editingItem.glAccountId?.toString() || ""}
                  onValueChange={(value) => setEditingItem({ ...editingItem, glAccountId: value ? parseInt(value) : undefined })}
                >
                  <SelectTrigger id="edit-glAccountId">
                    <SelectValue placeholder="Select GL Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccountsLoading ? (
                      <SelectItem value="loading" disabled>Loading GL accounts...</SelectItem>
                    ) : glAccounts && glAccounts.length > 0 ? (
                      glAccounts
                        .filter((acc: GLAccount) => acc.is_active !== false)
                        .map((account: GLAccount) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.account_number} - {account.account_name}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-accounts" disabled>No GL accounts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingItem.isActive}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editingItem.accountId || !editingItem.description) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in all required fields (Account ID and Description)",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (editingItem.bankMasterId) {
                      const selectedBank = bankMasters.find(bm => bm.id === editingItem.bankMasterId);
                      if (selectedBank?.companyCodeId) {
                        updateMutation.mutate({ 
                          id: editingItem.id, 
                          data: {
                            ...editingItem,
                            companyCodeId: selectedBank.companyCodeId
                          }
                        });
                        return;
                      }
                    }
                    updateMutation.mutate({ id: editingItem.id, data: editingItem });
                  }}
                  disabled={updateMutation.isPending}
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
            <AlertDialogTitle>Delete Account ID</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account ID record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItemId) {
                  deleteMutation.mutate(deletingItemId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

