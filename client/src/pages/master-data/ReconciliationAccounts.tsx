import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Upload, Download, RefreshCw, MoreVertical, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

interface ReconciliationAccount {
  id: number;
  code: string;
  name: string;
  description?: string;
  glAccountId: number;
  glAccountNumber?: string;
  glAccountName?: string;
  accountType: string;
  companyCodeId: number;
  companyCode?: string;
  companyName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewReconciliationAccount {
  code: string;
  name: string;
  description?: string;
  glAccountId: number;
  accountType: string;
  companyCodeId: number;
  isActive: boolean;
}

interface GLAccount {
  id: number;
  account_number: string;
  account_name: string;
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

export default function ReconciliationAccounts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ReconciliationAccount | null>(null);
  const [newAccount, setNewAccount] = useState<NewReconciliationAccount>({
    code: "",
    name: "",
    description: "",
    glAccountId: 0,
    accountType: "",
    companyCodeId: 0,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reconciliation accounts
  const { data: reconciliationAccounts = [], isLoading, refetch } = useQuery<ReconciliationAccount[]>({
    queryKey: ["/api/master-data/reconciliation-accounts"],
  });

  // Fetch GL accounts
  const { data: glAccounts = [] } = useQuery<GLAccount[]>({
    queryKey: ["/api/master-data/gl-accounts"],
  });

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: NewReconciliationAccount) => {
      const response = await apiRequest("/api/master-data/reconciliation-accounts", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error("Failed to create reconciliation account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/reconciliation-accounts"] });
      setShowAddDialog(false);
      setNewAccount({ 
        code: "", 
        name: "",
        description: "", 
        glAccountId: 0,
        accountType: "", 
        companyCodeId: 0,
        isActive: true 
      });
      toast({ title: "Reconciliation account created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create reconciliation account", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewReconciliationAccount> }) => {
      const response = await apiRequest(`/api/master-data/reconciliation-accounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error("Failed to update reconciliation account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/reconciliation-accounts"] });
      setEditingAccount(null);
      toast({ title: "Reconciliation account updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update reconciliation account", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/reconciliation-accounts/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Failed to delete reconciliation account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/reconciliation-accounts"] });
      toast({ title: "Reconciliation account deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete reconciliation account", variant: "destructive" });
    }
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (accounts: NewReconciliationAccount[]) => {
      const response = await apiRequest("/api/master-data/reconciliation-accounts/bulk-import", {
        method: "POST",
        body: JSON.stringify({ accounts })
      });
      if (!response.ok) {
        throw new Error("Failed to import reconciliation accounts");
      }
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/reconciliation-accounts"] });
      toast({ title: `Successfully imported ${result.imported} reconciliation accounts` });
    },
    onError: () => {
      toast({ title: "Failed to import reconciliation accounts", variant: "destructive" });
    }
  });

  const filteredReconciliationAccounts = reconciliationAccounts.filter((item: ReconciliationAccount) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      item.accountType.toLowerCase().includes(searchLower) ||
      (item.glAccountNumber && item.glAccountNumber.toLowerCase().includes(searchLower)) ||
      (item.companyCode && item.companyCode.toLowerCase().includes(searchLower))
    );
  });

  const handleEdit = (item: ReconciliationAccount) => {
    setEditingAccount(item);
  };

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const accounts = jsonData.map((row: any) => {
          // Find GL account by account number
          const glAccount = glAccounts.find(ga => 
            ga.account_number === (row["GL Account Number"] || row.glAccountNumber || row["GL Account"])
          );
          
          // Find company code by code
          const companyCode = companyCodes.find(cc => 
            cc.code === (row["Company Code"] || row.companyCode || row["Company Code Code"])
          );

          return {
            code: row.Code || row.code || "",
            name: row.Name || row.name || row.Description || row.description || "",
            description: row.Description || row.description || "",
            glAccountId: glAccount?.id || parseInt(row["GL Account ID"] || row.glAccountId || "0"),
            accountType: row["Account Type"] || row.accountType || row.AccountType || "",
            companyCodeId: companyCode?.id || parseInt(row["Company Code ID"] || row.companyCodeId || "0"),
            isActive: row["Is Active"] !== undefined ? Boolean(row["Is Active"]) : 
                     row.isActive !== undefined ? Boolean(row.isActive) : 
                     row["IsActive"] !== undefined ? Boolean(row["IsActive"]) : true
          };
        }).filter(acc => acc.code && acc.name && acc.glAccountId > 0 && acc.companyCodeId > 0 && acc.accountType);

        if (accounts.length === 0) {
          toast({ title: "No valid accounts found in Excel file", variant: "destructive" });
          return;
        }

        bulkImportMutation.mutate(accounts);
      } catch (error) {
        toast({ title: "Failed to parse Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleExcelExport = () => {
    const exportData = filteredReconciliationAccounts.map(item => ({
      Code: item.code,
      Name: item.name,
      Description: item.description || "",
      "GL Account ID": item.glAccountId,
      "GL Account Number": item.glAccountNumber || "",
      "GL Account Name": item.glAccountName || "",
      "Account Type": item.accountType,
      "Company Code ID": item.companyCodeId,
      "Company Code": item.companyCode || "",
      "Company Name": item.companyName || "",
      "Is Active": item.isActive,
      "Created At": new Date(item.createdAt).toLocaleDateString(),
      "Updated At": new Date(item.updatedAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation Accounts");
    XLSX.writeFile(workbook, "reconciliation_accounts.xlsx");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
          Master Data → Reconciliation Accounts
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reconciliation Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage account reconciliation settings and automation rules
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredReconciliationAccounts.length} accounts
        </Badge>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Account List</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reconciliation Accounts</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Reconciliation Account</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="code">Code *</Label>
                            <Input
                              id="code"
                              value={newAccount.code}
                              onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                              placeholder="Enter account code"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                              id="name"
                              value={newAccount.name}
                              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                              placeholder="Enter account name"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newAccount.description || ""}
                            onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                            placeholder="Enter description (optional)"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="glAccountId">GL Account *</Label>
                            <Select
                              value={newAccount.glAccountId.toString()}
                              onValueChange={(value) => setNewAccount({ ...newAccount, glAccountId: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select GL account" />
                              </SelectTrigger>
                              <SelectContent>
                                {glAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id.toString()}>
                                    {account.account_number} - {account.account_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="companyCodeId">Company Code *</Label>
                            <Select
                              value={newAccount.companyCodeId.toString()}
                              onValueChange={(value) => setNewAccount({ ...newAccount, companyCodeId: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                              <SelectContent>
                                {companyCodes.map((code) => (
                                  <SelectItem key={code.id} value={code.id.toString()}>
                                    {code.code} - {code.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="accountType">Account Type *</Label>
                          <Select
                            value={newAccount.accountType}
                            onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AR">Accounts Receivable</SelectItem>
                              <SelectItem value="AP">Accounts Payable</SelectItem>
                              <SelectItem value="INVENTORY">Inventory</SelectItem>
                              <SelectItem value="BANK">Bank</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isActive"
                            checked={newAccount.isActive}
                            onCheckedChange={(checked) => setNewAccount({ ...newAccount, isActive: checked })}
                          />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => createMutation.mutate(newAccount)}
                            disabled={createMutation.isPending}
                          >
                            {createMutation.isPending ? "Creating..." : "Create"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReconciliationAccounts.map((item: ReconciliationAccount) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        {item.glAccountNumber ? (
                          <div>
                            <div className="font-medium">{item.glAccountNumber}</div>
                            {item.glAccountName && (
                              <div className="text-xs text-muted-foreground">{item.glAccountName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.companyCode ? (
                          <div>
                            <div className="font-medium">{item.companyCode}</div>
                            {item.companyName && (
                              <div className="text-xs text-muted-foreground">{item.companyName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.accountType}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Reconciliation Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload an Excel file with reconciliation account data. Required columns: Code, Name, GL Account Number (or GL Account ID), Company Code (or Company Code ID), Account Type, Is Active.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Reconciliation Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download current reconciliation account data as an Excel file.
                </p>
                <Button onClick={handleExcelExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingAccount && (
        <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Reconciliation Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    value={editingAccount.code}
                    onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingAccount.description || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-glAccountId">GL Account</Label>
                  <Select
                    value={editingAccount.glAccountId.toString()}
                    onValueChange={(value) => setEditingAccount({ ...editingAccount, glAccountId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {glAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.account_number} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-companyCodeId">Company Code</Label>
                  <Select
                    value={editingAccount.companyCodeId.toString()}
                    onValueChange={(value) => setEditingAccount({ ...editingAccount, companyCodeId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companyCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id.toString()}>
                          {code.code} - {code.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-accountType">Account Type</Label>
                <Select
                  value={editingAccount.accountType}
                  onValueChange={(value) => setEditingAccount({ ...editingAccount, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AR">Accounts Receivable</SelectItem>
                    <SelectItem value="AP">Accounts Payable</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingAccount.isActive}
                  onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateMutation.mutate({ 
                    id: editingAccount.id, 
                    data: {
                      code: editingAccount.code,
                      name: editingAccount.name,
                      description: editingAccount.description,
                      glAccountId: editingAccount.glAccountId,
                      accountType: editingAccount.accountType,
                      companyCodeId: editingAccount.companyCodeId,
                      isActive: editingAccount.isActive
                    }
                  })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}