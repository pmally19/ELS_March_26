import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ArrowLeft, BookOpen, Search, RefreshCw, Eye, MoreHorizontal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

interface GLAccountGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  accountCategory: "ASSETS" | "LIABILITIES" | "EQUITY" | "REVENUE" | "EXPENSES";
  accountSubcategory?: string;
  numberRangeId?: number;
  numberRangeCode?: string;
  numberRangeDescription?: string;
  numberRangeObject?: string;
  numberRangeFrom?: string;
  numberRangeTo?: string;
  accountNameRequired: boolean;
  descriptionRequired: boolean;
  currencyRequired: boolean;
  taxSettingsRequired: boolean;
  allowPosting: boolean;
  requiresReconciliation: boolean;
  allowCashPosting: boolean;
  requiresCostCenter: boolean;
  requiresProfitCenter: boolean;
  displayLayout?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
  tenantId?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  ASSETS: "bg-blue-100 text-blue-800",
  LIABILITIES: "bg-red-100 text-red-800",
  EQUITY: "bg-purple-100 text-purple-800",
  REVENUE: "bg-green-100 text-green-800",
  EXPENSES: "bg-orange-100 text-orange-800",
};

export default function GLAccountGroups() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GLAccountGroup | null>(null);
  const [viewingGroup, setViewingGroup] = useState<GLAccountGroup | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showAdminData, setShowAdminData] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/gl-account-groups'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/gl-account-groups');
      if (!res.ok) throw new Error('Failed to fetch GL account groups');
      return res.json();
    },
  });

  const { data: numberRangesData = [] } = useQuery({
    queryKey: ['/api/number-ranges'],
    queryFn: async () => {
      const res = await fetch('/api/number-ranges');
      if (!res.ok) throw new Error('Failed to fetch number ranges');
      const data = await res.json();
      return data.records || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<GLAccountGroup>) =>
      fetch('/api/master-data/gl-account-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/gl-account-groups'] });
      setIsFormOpen(false);
      setEditingGroup(null);
      toast({ title: "GL Account Group created successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GLAccountGroup> }) =>
      fetch(`/api/master-data/gl-account-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/gl-account-groups'] });
      setIsFormOpen(false);
      setEditingGroup(null);
      toast({ title: "GL Account Group updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/gl-account-groups/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/gl-account-groups'] });
      setDeletingId(null);
      toast({ title: "GL Account Group deleted successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleEdit = (group: GLAccountGroup) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const openDetails = (group: GLAccountGroup) => {
    setViewingGroup(group);
    setShowAdminData(false);
    setIsDetailsOpen(true);
  };

  const handleExport = () => {
    const exportData = filteredGroups.map((g: GLAccountGroup) => ({
      'Code': g.code,
      'Name': g.name,
      'Category': g.accountCategory,
      'Subcategory': g.accountSubcategory || '',
      'Allow Posting': g.allowPosting ? 'Yes' : 'No',
      'Status': g.isActive ? 'Active' : 'Inactive',
    }));
    const headers = Object.keys(exportData[0] || {});
    const csv = [headers.join(','), ...exportData.map(row => headers.map(h => `"${(row as any)[h]}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `gl-account-groups-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Exported successfully" });
  };

  const filteredGroups = (groups as GLAccountGroup[]).filter((group) => {
    const matchesSearch =
      group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || group.accountCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ─── Form Component ────────────────────────────────────────────
  const GroupForm = ({ group, onSubmit, onCancel }: {
    group?: GLAccountGroup;
    onSubmit: (data: Partial<GLAccountGroup>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Partial<GLAccountGroup>>({
      code: group?.code || '',
      name: group?.name || '',
      description: group?.description || '',
      accountCategory: group?.accountCategory || 'ASSETS',
      accountSubcategory: group?.accountSubcategory || '',
      numberRangeId: group?.numberRangeId,
      accountNameRequired: group?.accountNameRequired ?? true,
      descriptionRequired: group?.descriptionRequired ?? false,
      currencyRequired: group?.currencyRequired ?? true,
      taxSettingsRequired: group?.taxSettingsRequired ?? false,
      allowPosting: group?.allowPosting ?? true,
      requiresReconciliation: group?.requiresReconciliation ?? false,
      allowCashPosting: group?.allowCashPosting ?? false,
      requiresCostCenter: group?.requiresCostCenter ?? false,
      requiresProfitCenter: group?.requiresProfitCenter ?? false,
      displayLayout: group?.displayLayout || '',
      sortOrder: group?.sortOrder || 0,
      isActive: group?.isActive ?? true,
    });

    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="numbering">Number Rules</TabsTrigger>
            <TabsTrigger value="settings">Behavior Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Group Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., GL-ASSET"
                  maxLength={10}
                  disabled={!!group}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Asset Accounts"
                  maxLength={100}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of this account group"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Account Category *</Label>
                <Select
                  value={formData.accountCategory}
                  onValueChange={(value: any) => setFormData({ ...formData, accountCategory: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSETS">Assets</SelectItem>
                    <SelectItem value="LIABILITIES">Liabilities</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSES">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="accountSubcategory">Subcategory</Label>
                <Input
                  id="accountSubcategory"
                  value={formData.accountSubcategory}
                  onChange={(e) => setFormData({ ...formData, accountSubcategory: e.target.value })}
                  placeholder="e.g., Current Assets"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="displayLayout">Display Layout</Label>
                <Input
                  id="displayLayout"
                  value={formData.displayLayout}
                  onChange={(e) => setFormData({ ...formData, displayLayout: e.target.value })}
                  placeholder="e.g., STANDARD"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable this GL account group</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </TabsContent>

          <TabsContent value="numbering" className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label>Number Range Object</Label>
              <Select
                value={formData.numberRangeId?.toString() || "__none__"}
                onValueChange={(v) => setFormData({ ...formData, numberRangeId: v && v !== "__none__" ? parseInt(v) : undefined })}
              >
                <SelectTrigger><SelectValue placeholder="None (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {numberRangesData.map((nr: any) => (
                    <SelectItem key={nr.id} value={nr.id.toString()}>
                      {nr.number_range_code} - {nr.description} ({nr.range_from} to {nr.range_to})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Select a number range to define automatic numbering for GL accounts in this group
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-3 pt-4">
            {[
              { key: 'accountNameRequired', label: 'Account Name Required' },
              { key: 'descriptionRequired', label: 'Description Required' },
              { key: 'currencyRequired', label: 'Currency Required' },
              { key: 'taxSettingsRequired', label: 'Tax Settings Required' },
              { key: 'allowPosting', label: 'Allow Posting' },
              { key: 'requiresReconciliation', label: 'Requires Reconciliation' },
              { key: 'allowCashPosting', label: 'Allow Cash Posting' },
              { key: 'requiresCostCenter', label: 'Requires Cost Center' },
              { key: 'requiresProfitCenter', label: 'Requires Profit Center' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <Label htmlFor={key}>{label}</Label>
                <Switch
                  id={key}
                  checked={(formData as any)[key]}
                  onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{group ? 'Update' : 'Create'} Group</Button>
        </DialogFooter>
      </form>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">GL Account Groups</h1>
            <p className="text-sm text-muted-foreground">
              Classify and control General Ledger account creation rules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredGroups.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button onClick={() => { setEditingGroup(null); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New GL Account Group
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GL account groups..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ASSETS">Assets</SelectItem>
            <SelectItem value="LIABILITIES">Liabilities</SelectItem>
            <SelectItem value="EQUITY">Equity</SelectItem>
            <SelectItem value="REVENUE">Revenue</SelectItem>
            <SelectItem value="EXPENSES">Expenses</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>GL Account Groups</CardTitle>
          <CardDescription>All GL account groups for chart of accounts management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Number Range</TableHead>
                    <TableHead className="hidden md:table-cell">Posting</TableHead>
                    <TableHead className="text-center w-[100px]">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">Loading...</TableCell>
                    </TableRow>
                  ) : filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                          <p>No GL account groups found.{searchTerm ? " Try a different search." : " Create your first group."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group: GLAccountGroup) => (
                      <TableRow
                        key={group.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openDetails(group)}
                      >
                        <TableCell className="font-medium">{group.code}</TableCell>
                        <TableCell>{group.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[group.accountCategory] || 'bg-gray-100 text-gray-800'}`}>
                            {group.accountCategory}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {group.numberRangeCode ? `${group.numberRangeCode}` : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${group.allowPosting ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {group.allowPosting ? 'Allowed' : 'Blocked'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {group.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetails(group)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(group)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeletingId(group.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
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

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingGroup(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit GL Account Group" : "Create GL Account Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Update the GL account group details" : "Add a new GL account group"}
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            group={editingGroup || undefined}
            onSubmit={(data) => {
              if (editingGroup) {
                updateMutation.mutate({ id: editingGroup.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setIsFormOpen(false); setEditingGroup(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setShowAdminData(false); }}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>GL Account Group Details</DialogTitle>
            <DialogDescription>
              View complete information for {viewingGroup?.code} — {viewingGroup?.name}
            </DialogDescription>
          </DialogHeader>
          {viewingGroup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Group Code</p>
                  <p className="text-sm font-semibold">{viewingGroup.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingGroup.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {viewingGroup.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm">{viewingGroup.name}</p>
                </div>
                {viewingGroup.description && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm">{viewingGroup.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Account Category</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[viewingGroup.accountCategory]}`}>
                    {viewingGroup.accountCategory}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Subcategory</p>
                  <p className="text-sm">{viewingGroup.accountSubcategory || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Number Range</p>
                  <p className="text-sm">{viewingGroup.numberRangeCode || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Display Layout</p>
                  <p className="text-sm">{viewingGroup.displayLayout || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Sort Order</p>
                  <p className="text-sm">{viewingGroup.sortOrder}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Allow Posting</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingGroup.allowPosting ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {viewingGroup.allowPosting ? 'Allowed' : 'Blocked'}
                  </span>
                </div>
              </div>

              {/* Behavior flags */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Behavior Settings</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { label: 'Account Name Required', val: viewingGroup.accountNameRequired },
                    { label: 'Description Required', val: viewingGroup.descriptionRequired },
                    { label: 'Currency Required', val: viewingGroup.currencyRequired },
                    { label: 'Tax Settings Required', val: viewingGroup.taxSettingsRequired },
                    { label: 'Requires Reconciliation', val: viewingGroup.requiresReconciliation },
                    { label: 'Allow Cash Posting', val: viewingGroup.allowCashPosting },
                    { label: 'Requires Cost Center', val: viewingGroup.requiresCostCenter },
                    { label: 'Requires Profit Center', val: viewingGroup.requiresProfitCenter },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between py-0.5">
                      <span className="text-gray-600">{label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {val ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Administrative Data - collapsible */}
              <div
                className="cursor-pointer flex justify-between items-center select-none py-1"
                onClick={() => setShowAdminData(!showAdminData)}
              >
                <p className="font-semibold text-sm text-gray-700">Administrative Data</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showAdminData ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {showAdminData && (
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="text-sm text-gray-900">{viewingGroup.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                    <dd className="text-sm text-gray-900">{viewingGroup.updatedBy ?? viewingGroup.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="text-sm text-gray-900">{viewingGroup.createdAt ? new Date(viewingGroup.createdAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="text-sm text-gray-900">{viewingGroup.updatedAt ? new Date(viewingGroup.updatedAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                    <dd className="text-sm text-gray-900">{viewingGroup.tenantId ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDetailsOpen(false); if (viewingGroup) handleEdit(viewingGroup); }}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the GL account group. This action cannot be undone if no GL accounts reference it.
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
