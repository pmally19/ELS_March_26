import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ArrowLeft, BookOpen, Search, RefreshCw } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

export default function GLAccountGroups() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GLAccountGroup | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['/api/master-data/gl-account-groups'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/gl-account-groups');
      if (!res.ok) throw new Error('Failed to fetch GL account groups');
      return res.json();
    },
  });

  const numberRanges = useQuery({
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
      setIsAddDialogOpen(false);
      toast({ title: "GL Account Group created successfully" });
    },
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
      setEditingGroup(null);
      toast({ title: "GL Account Group updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/gl-account-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/gl-account-groups'] });
      setDeletingId(null);
      toast({ title: "GL Account Group deleted successfully" });
    },
  });

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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="numbering">Number Rules</TabsTrigger>
            <TabsTrigger value="settings">Behavior Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Group Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., GL-ASSET"
                  maxLength={10}
                  required
                />
              </div>
              <div>
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

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of this account group"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountCategory">Account Category *</Label>
                <Select
                  value={formData.accountCategory}
                  onValueChange={(value: any) => setFormData({ ...formData, accountCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSETS">Assets</SelectItem>
                    <SelectItem value="LIABILITIES">Liabilities</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSES">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountSubcategory">Account Subcategory</Label>
                <Input
                  id="accountSubcategory"
                  value={formData.accountSubcategory}
                  onChange={(e) => setFormData({ ...formData, accountSubcategory: e.target.value })}
                  placeholder="e.g., Current Assets"
                  maxLength={50}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="numbering" className="space-y-4">
            <div>
              <Label htmlFor="numberRange">Number Range Object</Label>
              <Select
                value={formData.numberRangeId?.toString()}
                onValueChange={(value) => setFormData({ ...formData, numberRangeId: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger id="numberRange">
                  <SelectValue placeholder="None (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {numberRanges.data?.map((nr: any) => (
                    <SelectItem key={nr.id} value={nr.id.toString()}>
                      {nr.number_range_code} - {nr.description} ({nr.range_from} to {nr.range_to})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Select a number range to define automatic numbering for GL accounts in this group
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="accountNameRequired">Account Name Required</Label>
                <Switch
                  id="accountNameRequired"
                  checked={formData.accountNameRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, accountNameRequired: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="descriptionRequired">Description Required</Label>
                <Switch
                  id="descriptionRequired"
                  checked={formData.descriptionRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, descriptionRequired: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="currencyRequired">Currency Required</Label>
                <Switch
                  id="currencyRequired"
                  checked={formData.currencyRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, currencyRequired: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="taxSettingsRequired">Tax Settings Required</Label>
                <Switch
                  id="taxSettingsRequired"
                  checked={formData.taxSettingsRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, taxSettingsRequired: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowPosting">Allow Posting</Label>
                <Switch
                  id="allowPosting"
                  checked={formData.allowPosting}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowPosting: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requiresReconciliation">Requires Reconciliation</Label>
                <Switch
                  id="requiresReconciliation"
                  checked={formData.requiresReconciliation}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresReconciliation: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowCashPosting">Allow Cash Posting</Label>
                <Switch
                  id="allowCashPosting"
                  checked={formData.allowCashPosting}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowCashPosting: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requiresCostCenter">Requires Cost Center</Label>
                <Switch
                  id="requiresCostCenter"
                  checked={formData.requiresCostCenter}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresCostCenter: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requiresProfitCenter">Requires Profit Center</Label>
                <Switch
                  id="requiresProfitCenter"
                  checked={formData.requiresProfitCenter}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresProfitCenter: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs >

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {group ? 'Update' : 'Create'} Group
          </Button>
        </div>
      </form >
    );
  };

  const filteredGroups = groups.filter((group: GLAccountGroup) => {
    const matchesSearch =
      group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || group.accountCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading GL account groups...</div>;
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
          Master Data → GL Account Groups
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">GL Account Groups</h1>
            <p className="text-gray-600">Classify and control General Ledger account creation rules</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Account Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create GL Account Group</DialogTitle>
            </DialogHeader>
            <GroupForm
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
            placeholder="Search account groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
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
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {filteredGroups.map((group: GLAccountGroup) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-3">
                    {group.code} - {group.name}
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{group.accountCategory}</Badge>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingGroup(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingId(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {group.numberRangeCode && (
                  <div>
                    <span className="text-gray-600">Number Range:</span>
                    <div className="font-medium">{group.numberRangeCode} - {group.numberRangeDescription || ''}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Posting:</span>
                  <div className="font-medium">
                    <Badge variant={group.allowPosting ? "default" : "secondary"}>
                      {group.allowPosting ? "Allowed" : "Blocked"}
                    </Badge>
                  </div>
                </div>
                {group.requiresReconciliation && (
                  <div>
                    <span className="text-gray-600">Reconciliation:</span>
                    <div className="font-medium">Required</div>
                  </div>
                )}
                {group.accountSubcategory && (
                  <div>
                    <span className="text-gray-600">Subcategory:</span>
                    <div className="font-medium">{group.accountSubcategory}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No GL Account Groups</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first GL account group.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add GL Account Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingGroup && (
        <Dialog open={true} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit GL Account Group</DialogTitle>
            </DialogHeader>
            <GroupForm
              group={editingGroup}
              onSubmit={(data) => updateMutation.mutate({ id: editingGroup.id, data })}
              onCancel={() => setEditingGroup(null)}
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
              This will permanently delete the GL account group. This action cannot be undone.
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

