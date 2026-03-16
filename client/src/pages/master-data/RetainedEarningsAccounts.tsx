import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ArrowLeft, TrendingUp, Search, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface RetainedEarningsAccount {
  id: number;
  companyCodeId: number;
  companyCode?: string;
  companyName?: string;
  glAccountId: number;
  glAccountNumber?: string;
  glAccountName?: string;
  fiscalYearVariantId?: number;
  fiscalYearVariantCode?: string;
  fiscalYearVariantDescription?: string;
  accountType: "RETAINED_EARNINGS" | "PROFIT_CARRY_FORWARD" | "LOSS_CARRY_FORWARD";
  description?: string;
  carryForwardProfit: boolean;
  carryForwardLoss: boolean;
  automaticCarryForward: boolean;
  useForYearEndClosing: boolean;
  closingAccountType?: "PROFIT" | "LOSS" | "BOTH";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface GLAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
}

interface FiscalYearVariant {
  id: number;
  variant_id: string;
  description: string;
}

export default function RetainedEarningsAccounts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RetainedEarningsAccount | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/company-codes');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.rows || []);
    },
  });

  // Fetch GL accounts (only EQUITY type)
  const { data: glAccounts = [] } = useQuery<GLAccount[]>({
    queryKey: ['/api/master-data/gl-accounts', 'EQUITY'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/gl-accounts');
      if (!res.ok) return [];
      const data = await res.json();
      const accounts: any[] = Array.isArray(data) ? data : (data?.rows || []);
      return accounts.filter((acc: any) => acc.accountType === 'EQUITY');
    },
  });

  // Fetch fiscal year variants
  const { data: fiscalYearVariants = [] } = useQuery<FiscalYearVariant[]>({
    queryKey: ['/api/master-data/fiscal-year-variants'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/fiscal-year-variants');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.rows || []);
    },
  });

  // Fetch retained earnings accounts
  const { data: accounts = [], isLoading } = useQuery<RetainedEarningsAccount[]>({
    queryKey: ['/api/master-data/retained-earnings-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/retained-earnings-accounts');
      if (!res.ok) throw new Error('Failed to fetch retained earnings accounts');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<RetainedEarningsAccount>) =>
      fetch('/api/master-data/retained-earnings-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.message || 'Failed to create retained earnings account'); });
        }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/retained-earnings-accounts'] });
      setIsAddDialogOpen(false);
      toast({ title: "Retained earnings account created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create retained earnings account",
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RetainedEarningsAccount> }) =>
      fetch(`/api/master-data/retained-earnings-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.message || 'Failed to update retained earnings account'); });
        }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/retained-earnings-accounts'] });
      setEditingAccount(null);
      toast({ title: "Retained earnings account updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update retained earnings account",
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/retained-earnings-accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/retained-earnings-accounts'] });
      setDeletingId(null);
      toast({ title: "Retained earnings account deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete retained earnings account",
        variant: "destructive"
      });
    },
  });

  const AccountForm = ({ account, onSubmit, onCancel }: {
    account?: RetainedEarningsAccount;
    onSubmit: (data: Partial<RetainedEarningsAccount>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Partial<RetainedEarningsAccount>>({
      companyCodeId: account?.companyCodeId || undefined,
      glAccountId: account?.glAccountId || undefined,
      fiscalYearVariantId: account?.fiscalYearVariantId || undefined,
      accountType: account?.accountType || "RETAINED_EARNINGS",
      description: account?.description || "",
      carryForwardProfit: account?.carryForwardProfit ?? true,
      carryForwardLoss: account?.carryForwardLoss ?? true,
      automaticCarryForward: account?.automaticCarryForward ?? false,
      useForYearEndClosing: account?.useForYearEndClosing ?? true,
      closingAccountType: account?.closingAccountType || undefined,
      isActive: account?.isActive ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.companyCodeId || !formData.glAccountId) {
        toast({
          title: "Validation Error",
          description: "Company Code and GL Account are required",
          variant: "destructive"
        });
        return;
      }
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyCodeId">Company Code *</Label>
            <Select
              value={formData.companyCodeId?.toString()}
              onValueChange={(value) => setFormData({ ...formData, companyCodeId: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company code" />
              </SelectTrigger>
              <SelectContent>
                {companyCodes.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id.toString()}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="glAccountId">GL Account (Equity) *</Label>
            <Select
              value={formData.glAccountId?.toString()}
              onValueChange={(value) => setFormData({ ...formData, glAccountId: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select GL account" />
              </SelectTrigger>
              <SelectContent>
                {glAccounts.map((ga) => (
                  <SelectItem key={ga.id} value={ga.id.toString()}>
                    {ga.accountNumber} - {ga.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Only EQUITY type accounts are available</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="accountType">Account Type *</Label>
            <Select
              value={formData.accountType}
              onValueChange={(value: any) => setFormData({ ...formData, accountType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETAINED_EARNINGS">Retained Earnings</SelectItem>
                <SelectItem value="PROFIT_CARRY_FORWARD">Profit Carry Forward</SelectItem>
                <SelectItem value="LOSS_CARRY_FORWARD">Loss Carry Forward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fiscalYearVariantId">Fiscal Year Variant</Label>
            <Select
              value={formData.fiscalYearVariantId?.toString() || "none"}
              onValueChange={(value) => setFormData({ ...formData, fiscalYearVariantId: value === "none" ? undefined : parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fiscal year variant (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {fiscalYearVariants.map((fyv) => (
                  <SelectItem key={fyv.id} value={fyv.id.toString()}>
                    {fyv.variant_id} - {fyv.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description of the account purpose"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="carryForwardProfit">Carry Forward Profit</Label>
            <Switch
              id="carryForwardProfit"
              checked={formData.carryForwardProfit}
              onCheckedChange={(checked) => setFormData({ ...formData, carryForwardProfit: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="carryForwardLoss">Carry Forward Loss</Label>
            <Switch
              id="carryForwardLoss"
              checked={formData.carryForwardLoss}
              onCheckedChange={(checked) => setFormData({ ...formData, carryForwardLoss: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="automaticCarryForward">Automatic Carry Forward</Label>
            <Switch
              id="automaticCarryForward"
              checked={formData.automaticCarryForward}
              onCheckedChange={(checked) => setFormData({ ...formData, automaticCarryForward: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="useForYearEndClosing">Use for Year-End Closing</Label>
            <Switch
              id="useForYearEndClosing"
              checked={formData.useForYearEndClosing}
              onCheckedChange={(checked) => setFormData({ ...formData, useForYearEndClosing: checked })}
            />
          </div>
          {formData.useForYearEndClosing && (
            <div>
              <Label htmlFor="closingAccountType">Closing Account Type</Label>
              <Select
                value={formData.closingAccountType || "none"}
                onValueChange={(value) => setFormData({ ...formData, closingAccountType: value === "none" ? undefined : value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select closing account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="PROFIT">Profit</SelectItem>
                  <SelectItem value="LOSS">Loss</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {account ? 'Update' : 'Create'} Account
          </Button>
        </div>
      </form>
    );
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = 
      (account.companyCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.glAccountNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.glAccountName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = companyFilter === "all" || account.companyCodeId.toString() === companyFilter;
    const matchesType = typeFilter === "all" || account.accountType === typeFilter;
    return matchesSearch && matchesCompany && matchesType;
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading retained earnings accounts...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
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
          Master Data → Retained Earnings Accounts
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Retained Earnings Accounts</h1>
            <p className="text-gray-600">Configure accounts for carrying forward profit/loss between fiscal years</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Retained Earnings Account</DialogTitle>
            </DialogHeader>
            <AccountForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by company, account number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companyCodes.map((cc) => (
              <SelectItem key={cc.id} value={cc.id.toString()}>
                {cc.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="RETAINED_EARNINGS">Retained Earnings</SelectItem>
            <SelectItem value="PROFIT_CARRY_FORWARD">Profit Carry Forward</SelectItem>
            <SelectItem value="LOSS_CARRY_FORWARD">Loss Carry Forward</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Accounts List */}
      <div className="grid gap-4">
        {filteredAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-3">
                    {account.companyCode} - {account.companyName}
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.accountType.replace(/_/g, ' ')}
                    </Badge>
                    {account.useForYearEndClosing && (
                      <Badge variant="outline">Year-End Closing</Badge>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingId(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                GL Account: {account.glAccountNumber} - {account.glAccountName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Carry Forward Profit:</span>
                  <div className="font-medium">
                    {account.carryForwardProfit ? (
                      <CheckCircle className="h-4 w-4 text-green-600 inline ml-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 inline ml-1" />
                    )}
                    {account.carryForwardProfit ? " Yes" : " No"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Carry Forward Loss:</span>
                  <div className="font-medium">
                    {account.carryForwardLoss ? (
                      <CheckCircle className="h-4 w-4 text-green-600 inline ml-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 inline ml-1" />
                    )}
                    {account.carryForwardLoss ? " Yes" : " No"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Automatic:</span>
                  <div className="font-medium">
                    {account.automaticCarryForward ? "Enabled" : "Disabled"}
                  </div>
                </div>
                {account.closingAccountType && (
                  <div>
                    <span className="text-gray-600">Closing Type:</span>
                    <div className="font-medium">{account.closingAccountType}</div>
                  </div>
                )}
                {account.description && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-gray-600">Description:</span>
                    <div className="font-medium">{account.description}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredAccounts.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Retained Earnings Accounts</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first retained earnings account.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Retained Earnings Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingAccount && (
        <Dialog open={true} onOpenChange={() => setEditingAccount(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Retained Earnings Account</DialogTitle>
            </DialogHeader>
            <AccountForm
              account={editingAccount}
              onSubmit={(data) => updateMutation.mutate({ id: editingAccount.id, data })}
              onCancel={() => setEditingAccount(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the retained earnings account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
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

