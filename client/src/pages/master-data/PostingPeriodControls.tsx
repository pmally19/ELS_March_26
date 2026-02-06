import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ArrowLeft, Calendar, Search, Lock, Unlock, CheckCircle, XCircle, Filter } from "lucide-react";
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

interface PostingPeriodControl {
  id: number;
  companyCodeId: number;
  companyCode?: string;
  companyName?: string;
  fiscalYearVariantId?: number;
  fiscalYearVariantCode?: string;
  fiscalYearVariantDescription?: string;
  fiscalYear: number;
  periodFrom: number;
  periodTo: number;
  postingStatus: "OPEN" | "CLOSED" | "LOCKED";
  allowPosting: boolean;
  allowAdjustments: boolean;
  allowReversals: boolean;
  controlReason?: string;
  controlledBy?: number;
  controlledAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  module: "ALL" | "ASSETS" | "CUSTOMERS" | "VENDORS" | "INVENTORY" | "GL";
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface FiscalYearVariant {
  id: number;
  variant_id: string;
  description: string;
}

const MODULES = [
  { value: "ALL", label: "All Modules" },
  { value: "ASSETS", label: "Asset Management" },
  { value: "CUSTOMERS", label: "Customers (AR)" },
  { value: "VENDORS", label: "Vendors (AP)" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "GL", label: "General Ledger" }
];

export default function PostingPeriodControls() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<PostingPeriodControl | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
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

  // Fetch posting period controls
  const { data: controls = [], isLoading } = useQuery<PostingPeriodControl[]>({
    queryKey: ['/api/master-data/posting-period-controls'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/posting-period-controls');
      if (!res.ok) throw new Error('Failed to fetch posting period controls');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<PostingPeriodControl>) =>
      fetch('/api/master-data/posting-period-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create posting period control');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setIsAddDialogOpen(false);
      toast({ title: "Posting period control created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create posting period control",
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PostingPeriodControl> }) =>
      fetch(`/api/master-data/posting-period-controls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update posting period control');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setEditingControl(null);
      toast({ title: "Posting period control updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update posting period control",
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/posting-period-controls/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setDeletingId(null);
      toast({ title: "Posting period control deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete posting period control",
        variant: "destructive"
      });
    },
  });

  const ControlForm = ({ control, onSubmit, onCancel }: {
    control?: PostingPeriodControl;
    onSubmit: (data: Partial<PostingPeriodControl>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Partial<PostingPeriodControl>>({
      companyCodeId: control?.companyCodeId || undefined,
      fiscalYearVariantId: control?.fiscalYearVariantId || undefined,
      fiscalYear: control?.fiscalYear || new Date().getFullYear(),
      periodFrom: control?.periodFrom || 1,
      periodTo: control?.periodTo || 12,
      postingStatus: control?.postingStatus || "OPEN",
      allowPosting: control?.allowPosting ?? true,
      allowAdjustments: control?.allowAdjustments ?? false,
      allowReversals: control?.allowReversals ?? true,
      controlReason: control?.controlReason || "",
      isActive: control?.isActive ?? true,
      module: control?.module || "ALL",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.companyCodeId || !formData.fiscalYear) {
        toast({
          title: "Validation Error",
          description: "Company Code and Fiscal Year are required",
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
            <Label htmlFor="module">Module *</Label>
            <Select
              value={formData.module}
              onValueChange={(value: any) => setFormData({ ...formData, module: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fiscalYear">Fiscal Year *</Label>
            <Input
              id="fiscalYear"
              type="number"
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
              min={1900}
              max={9999}
              required
            />
          </div>
          <div>
            <Label htmlFor="periodFrom">Period From *</Label>
            <Input
              id="periodFrom"
              type="number"
              value={formData.periodFrom}
              onChange={(e) => setFormData({ ...formData, periodFrom: parseInt(e.target.value) })}
              min={1}
              max={16}
              required
            />
          </div>
          <div>
            <Label htmlFor="periodTo">Period To *</Label>
            <Input
              id="periodTo"
              type="number"
              value={formData.periodTo}
              onChange={(e) => setFormData({ ...formData, periodTo: parseInt(e.target.value) })}
              min={1}
              max={16}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="fiscalYearVariantId">Fiscal Year Variant (Optional)</Label>
          <Select
            value={formData.fiscalYearVariantId?.toString() || "none"}
            onValueChange={(value) => setFormData({ ...formData, fiscalYearVariantId: value === "none" ? undefined : parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fiscal year variant" />
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

        <div>
          <Label htmlFor="postingStatus">Posting Status *</Label>
          <Select
            value={formData.postingStatus}
            onValueChange={(value: any) => setFormData({ ...formData, postingStatus: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="allowPosting">Allow Posting</Label>
            <Switch
              id="allowPosting"
              checked={formData.allowPosting}
              onCheckedChange={(checked) => setFormData({ ...formData, allowPosting: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowAdjustments">Allow Adjustments</Label>
            <Switch
              id="allowAdjustments"
              checked={formData.allowAdjustments}
              onCheckedChange={(checked) => setFormData({ ...formData, allowAdjustments: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowReversals">Allow Reversals</Label>
            <Switch
              id="allowReversals"
              checked={formData.allowReversals}
              onCheckedChange={(checked) => setFormData({ ...formData, allowReversals: checked })}
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

        <div>
          <Label htmlFor="controlReason">Control Reason</Label>
          <Textarea
            id="controlReason"
            value={formData.controlReason}
            onChange={(e) => setFormData({ ...formData, controlReason: e.target.value })}
            placeholder="Reason for closing or locking this period"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {control ? 'Update' : 'Create'} Control
          </Button>
        </div>
      </form>
    );
  };

  const filteredControls = controls.filter((control) => {
    const matchesSearch =
      (control.companyCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (control.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.fiscalYear.toString().includes(searchTerm);
    const matchesCompany = companyFilter === "all" || control.companyCodeId.toString() === companyFilter;
    const matchesYear = yearFilter === "all" || control.fiscalYear.toString() === yearFilter;
    const matchesStatus = statusFilter === "all" || control.postingStatus === statusFilter;
    const matchesModule = moduleFilter === "all" || control.module === moduleFilter;

    return matchesSearch && matchesCompany && matchesYear && matchesStatus && matchesModule;
  });

  const uniqueYears = [...new Set(controls.map(c => c.fiscalYear))].sort((a, b) => b - a);

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading posting period controls...</div>;
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
          Master Data → Posting Period Controls
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Posting Period Controls</h1>
            <p className="text-gray-600">Control when transactions can be posted to the general ledger</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Control
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Posting Period Control</DialogTitle>
            </DialogHeader>
            <ControlForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by company, year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Company" />
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
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {uniqueYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Controls List */}
      <div className="grid gap-4">
        {filteredControls.map((control) => (
          <Card key={control.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {control.companyCode} - {control.companyName}
                    </CardTitle>
                    <Badge variant="outline" className="ml-2 font-normal">
                      {control.module === 'ALL' ? 'All Modules' : control.module}
                    </Badge>
                  </div>
                  <CardDescription>
                    Fiscal Year {control.fiscalYear} • Periods {control.periodFrom} - {control.periodTo}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={control.postingStatus === "OPEN" ? "default" : control.postingStatus === "CLOSED" ? "secondary" : "destructive"}>
                    {control.postingStatus}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingControl(control)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(control.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                <div className="flex items-center gap-2">
                  {control.allowPosting ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-gray-600">Posting</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Adjustments</span>
                  <span className={control.allowAdjustments ? "text-green-600 font-medium" : "text-gray-600"}>
                    {control.allowAdjustments ? "Allowed" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Reversals</span>
                  <span className={control.allowReversals ? "text-green-600 font-medium" : "text-gray-600"}>
                    {control.allowReversals ? "Allowed" : "No"}
                  </span>
                </div>

                {control.controlReason && (
                  <div className="col-span-2 md:col-span-4 mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600">
                    <span className="font-semibold">Note:</span> {control.controlReason}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredControls.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Controls Found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                No posting period controls match your current filters. Try adjusting them or create a new control.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Control
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingControl && (
        <Dialog open={true} onOpenChange={() => setEditingControl(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Posting Period Control</DialogTitle>
            </DialogHeader>
            <ControlForm
              control={editingControl}
              onSubmit={(data) => updateMutation.mutate({ id: editingControl.id, data })}
              onCancel={() => setEditingControl(null)}
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
              This will permanently delete the posting period control. This action cannot be undone.
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
