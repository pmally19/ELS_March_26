import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, ArrowLeft, Calendar, Search, RefreshCw, Eye, MoreHorizontal,
  CheckCircle, XCircle, Lock, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { Link } from "wouter";

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
  createdBy?: number;
  updatedBy?: number;
  tenantId?: string;
  module: "ALL" | "ASSETS" | "CUSTOMERS" | "VENDORS" | "INVENTORY" | "GL";
}

interface CompanyCode { id: number; code: string; name: string; }
interface FiscalYearVariant { id: number; variant_id: string; description: string; }

const MODULES = [
  { value: "ALL", label: "All Modules" },
  { value: "ASSETS", label: "Asset Management" },
  { value: "CUSTOMERS", label: "Customers (AR)" },
  { value: "VENDORS", label: "Vendors (AP)" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "GL", label: "General Ledger" }
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-yellow-100 text-yellow-800",
  LOCKED: "bg-red-100 text-red-800",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "OPEN") return <Unlock className="h-3 w-3 mr-1 inline" />;
  if (status === "LOCKED") return <Lock className="h-3 w-3 mr-1 inline" />;
  return null;
};

export default function PostingPeriodControls() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<PostingPeriodControl | null>(null);
  const [viewingControl, setViewingControl] = useState<PostingPeriodControl | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showAdminData, setShowAdminData] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/company-codes');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.rows || []);
    },
  });

  const { data: fiscalYearVariants = [] } = useQuery<FiscalYearVariant[]>({
    queryKey: ['/api/master-data/fiscal-year-variants'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/fiscal-year-variants');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.rows || []);
    },
  });

  const { data: controls = [], isLoading, refetch } = useQuery<PostingPeriodControl[]>({
    queryKey: ['/api/master-data/posting-period-controls'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/posting-period-controls');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<PostingPeriodControl>) =>
      fetch('/api/master-data/posting-period-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async res => {
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setIsFormOpen(false); setEditingControl(null);
      toast({ title: "Posting period control created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PostingPeriodControl> }) =>
      fetch(`/api/master-data/posting-period-controls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async res => {
        if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setIsFormOpen(false); setEditingControl(null);
      toast({ title: "Posting period control updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/posting-period-controls/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/posting-period-controls'] });
      setDeletingId(null);
      toast({ title: "Posting period control deleted successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEdit = (control: PostingPeriodControl) => {
    setEditingControl(control);
    setIsFormOpen(true);
  };

  const openDetails = (control: PostingPeriodControl) => {
    setViewingControl(control);
    setShowAdminData(false);
    setIsDetailsOpen(true);
  };

  const filteredControls = controls.filter((c) => {
    const matchesSearch =
      (c.companyCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fiscalYear.toString().includes(searchTerm);
    const matchesCompany = companyFilter === "all" || c.companyCodeId.toString() === companyFilter;
    const matchesYear = yearFilter === "all" || c.fiscalYear.toString() === yearFilter;
    const matchesStatus = statusFilter === "all" || c.postingStatus === statusFilter;
    const matchesModule = moduleFilter === "all" || c.module === moduleFilter;
    return matchesSearch && matchesCompany && matchesYear && matchesStatus && matchesModule;
  });

  const uniqueYears = [...new Set(controls.map(c => c.fiscalYear))].sort((a, b) => b - a);

  // ─── Inline Form ─────────────────────────────────────────────
  const ControlForm = ({ control, onSubmit, onCancel }: {
    control?: PostingPeriodControl;
    onSubmit: (data: Partial<PostingPeriodControl>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Partial<PostingPeriodControl>>({
      companyCodeId: control?.companyCodeId,
      fiscalYearVariantId: control?.fiscalYearVariantId,
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

    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!formData.companyCodeId) {
          toast({ title: "Validation Error", description: "Company Code is required", variant: "destructive" });
          return;
        }
        onSubmit(formData);
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Company Code *</Label>
            <Select
              value={formData.companyCodeId?.toString()}
              onValueChange={(v) => setFormData({ ...formData, companyCodeId: parseInt(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select company code" /></SelectTrigger>
              <SelectContent>
                {companyCodes.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id.toString()}>{cc.code} - {cc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Module *</Label>
            <Select
              value={formData.module}
              onValueChange={(v: any) => setFormData({ ...formData, module: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Fiscal Year *</Label>
            <Input type="number" value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
              min={1900} max={9999} required />
          </div>
          <div className="space-y-1">
            <Label>Period From *</Label>
            <Input type="number" value={formData.periodFrom}
              onChange={(e) => setFormData({ ...formData, periodFrom: parseInt(e.target.value) })}
              min={1} max={16} required />
          </div>
          <div className="space-y-1">
            <Label>Period To *</Label>
            <Input type="number" value={formData.periodTo}
              onChange={(e) => setFormData({ ...formData, periodTo: parseInt(e.target.value) })}
              min={1} max={16} required />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Fiscal Year Variant (Optional)</Label>
          <Select
            value={formData.fiscalYearVariantId?.toString() || "none"}
            onValueChange={(v) => setFormData({ ...formData, fiscalYearVariantId: v === "none" ? undefined : parseInt(v) })}
          >
            <SelectTrigger><SelectValue placeholder="Select fiscal year variant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {fiscalYearVariants.map((fyv) => (
                <SelectItem key={fyv.id} value={fyv.id.toString()}>{fyv.variant_id} - {fyv.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Posting Status *</Label>
          <Select
            value={formData.postingStatus}
            onValueChange={(v: any) => setFormData({ ...formData, postingStatus: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          {[
            { key: 'allowPosting', label: 'Allow Posting' },
            { key: 'allowAdjustments', label: 'Allow Adjustments' },
            { key: 'allowReversals', label: 'Allow Reversals' },
            { key: 'isActive', label: 'Active' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={(formData as any)[key]}
                onCheckedChange={(v) => setFormData({ ...formData, [key]: v })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label>Control Reason</Label>
          <Textarea
            value={formData.controlReason}
            onChange={(e) => setFormData({ ...formData, controlReason: e.target.value })}
            placeholder="Reason for closing or locking this period"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{control ? 'Update' : 'Create'} Control</Button>
        </DialogFooter>
      </form>
    );
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Posting Period Controls</h1>
            <p className="text-sm text-muted-foreground">
              Control when transactions can be posted to the general ledger
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditingControl(null); setIsFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Control
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by company, year..." className="pl-8"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companyCodes.map((cc) => <SelectItem key={cc.id} value={cc.id.toString()}>{cc.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[110px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {uniqueYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Posting Period Controls</CardTitle>
          <CardDescription>Manage when posting is allowed per company code, year, and module</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Periods</TableHead>
                    <TableHead className="hidden sm:table-cell">Module</TableHead>
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
                  ) : filteredControls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="h-8 w-8 text-muted-foreground/40" />
                          <p>No posting period controls found.{searchTerm ? " Try a different search." : ""}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredControls.map((control) => (
                      <TableRow
                        key={control.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openDetails(control)}
                      >
                        <TableCell>
                          <div className="font-medium">{control.companyCode}</div>
                          <div className="text-xs text-muted-foreground">{control.companyName}</div>
                        </TableCell>
                        <TableCell className="font-medium">{control.fiscalYear}</TableCell>
                        <TableCell>
                          <span className="text-sm">{control.periodFrom} – {control.periodTo}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800">
                            {control.module}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {control.allowPosting ? (
                            <span className="flex items-center text-green-700 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Allowed
                            </span>
                          ) : (
                            <span className="flex items-center text-red-700 text-xs">
                              <XCircle className="h-3 w-3 mr-1" /> Blocked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[control.postingStatus]}`}>
                            <StatusIcon status={control.postingStatus} />
                            {control.postingStatus}
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
                              <DropdownMenuItem onClick={() => openDetails(control)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(control)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeletingId(control.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingControl(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingControl ? "Edit Posting Period Control" : "Create Posting Period Control"}
            </DialogTitle>
            <DialogDescription>
              {editingControl
                ? `Editing control for ${editingControl.companyCode} — FY ${editingControl.fiscalYear}`
                : "Configure posting period restrictions for a company code"}
            </DialogDescription>
          </DialogHeader>
          <ControlForm
            control={editingControl || undefined}
            onSubmit={(data) => {
              if (editingControl) {
                updateMutation.mutate({ id: editingControl.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setIsFormOpen(false); setEditingControl(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setShowAdminData(false); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Posting Period Control Details</DialogTitle>
            <DialogDescription>
              {viewingControl?.companyCode} — FY {viewingControl?.fiscalYear} | Periods {viewingControl?.periodFrom}–{viewingControl?.periodTo}
            </DialogDescription>
          </DialogHeader>
          {viewingControl && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Company Code</p>
                  <p className="text-sm font-semibold">{viewingControl.companyCode}</p>
                  <p className="text-xs text-muted-foreground">{viewingControl.companyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[viewingControl.postingStatus]}`}>
                    <StatusIcon status={viewingControl.postingStatus} />
                    {viewingControl.postingStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fiscal Year</p>
                  <p className="text-sm">{viewingControl.fiscalYear}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Period Range</p>
                  <p className="text-sm">{viewingControl.periodFrom} — {viewingControl.periodTo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Module</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800">
                    {viewingControl.module}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fiscal Year Variant</p>
                  <p className="text-sm">{viewingControl.fiscalYearVariantCode || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingControl.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {viewingControl.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Posting flags */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Posting Permissions</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Allow Posting', val: viewingControl.allowPosting },
                    { label: 'Allow Adjustments', val: viewingControl.allowAdjustments },
                    { label: 'Allow Reversals', val: viewingControl.allowReversals },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex flex-col items-center p-2 rounded border text-center">
                      {val
                        ? <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
                        : <XCircle className="h-5 w-5 text-red-500 mb-1" />}
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewingControl.controlReason && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-500">Control Reason</p>
                  <p className="text-sm">{viewingControl.controlReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-sm">{viewingControl.createdAt ? new Date(viewingControl.createdAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-sm">{viewingControl.updatedAt ? new Date(viewingControl.updatedAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              <Separator />

              {/* Administrative Data - collapsible */}
              <div
                className="cursor-pointer flex justify-between items-center select-none py-1"
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
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="text-sm text-gray-900">{viewingControl.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                    <dd className="text-sm text-gray-900">{viewingControl.updatedBy ?? viewingControl.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Controlled By</dt>
                    <dd className="text-sm text-gray-900">{viewingControl.controlledBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Controlled At</dt>
                    <dd className="text-sm text-gray-900">{viewingControl.controlledAt ? new Date(viewingControl.controlledAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                    <dd className="text-sm text-gray-900">{viewingControl.tenantId ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDetailsOpen(false); if (viewingControl) handleEdit(viewingControl); }}>
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
              This will permanently delete the posting period control. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
