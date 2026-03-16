import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, RefreshCw, MoreHorizontal, ArrowLeft, Layers, GitBranch, List, Loader2, Tag, Settings, AlertTriangle, Sigma, BookOpen, FileText, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Types ─────────────────────────────────────────────────────────────────
type RefRow = { id: number; code: string; name: string; description?: string; sort_order?: number; is_active: boolean;[key: string]: any };
type MovementType = {
  id: number; movementTypeCode: string; description: string; movementClass: string;
  transactionType: string; inventoryDirection: string;
  isActive: boolean;
  reversalMovementType?: string; documentTypeId?: string;
  referenceDocumentRequired?: string; accountAssignmentMandatory?: string; printControl?: string;
  reasonCodeRequired?: boolean; createFiDocument?: boolean; createMaterialDocument?: boolean;
  postingRules?: any[];
};
type ValueString = { id: number; value_string: string; transaction_key: string; debit_credit: string; account_modifier: string; description?: string; sort_order?: number; is_active: boolean; };
type PostingRule = { id: number; movement_type_id: number; movement_type_code?: string; special_stock_ind: string; movement_ind: string; value_string: string; quantity_update: boolean; value_update: boolean; consumption_posting?: string; is_active: boolean; };

const BASE = "/api/master-data-crud";
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}/${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Request failed");
  return r.json();
}

// ─── Generic reference table tab ──────────────────────────────────────────────
function RefTab({
  title, description, endpoint, columns, extraFields,
  newRowDefaults, queryKey, hideSortOrder,
}: {
  title: string; description: string; endpoint: string;
  columns: { key: string; label: string; mono?: boolean; type?: string }[];
  extraFields?: { key: string; label: string; type?: "text" | "textarea" | "boolean"; hint?: string }[];
  newRowDefaults: Record<string, any>;
  queryKey: string[];
  hideSortOrder?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<RefRow | null>(null);
  const [form, setForm] = useState<Record<string, any>>({ ...newRowDefaults });

  const { data = [], isLoading, refetch } = useQuery<RefRow[]>({
    queryKey, queryFn: () => apiFetch(endpoint),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => apiFetch(endpoint, { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast({ title: "Created" }); setDialogOpen(false); setForm({ ...newRowDefaults }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => apiFetch(`${endpoint}/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast({ title: "Updated" }); setDialogOpen(false); setEditRow(null); setForm({ ...newRowDefaults }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`${endpoint}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEdit = (row: RefRow) => {
    setEditRow(row); setForm({ ...newRowDefaults, ...row }); setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (editRow) updateMut.mutate({ id: editRow.id, d: form });
    else createMut.mutate(form);
  };

  const filtered = data.filter(r =>
    !search || r.code.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase())
  );

  const allColumns = [{ key: "code", label: "Code", mono: true }, { key: "name", label: "Name" }, ...columns.filter(c => c.key !== "code" && c.key !== "name")];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
            <Button onClick={() => { setForm({ ...newRowDefaults }); setEditRow(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New {title.replace(/s$/, "")}
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${title.toLowerCase()}…`} className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {allColumns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={allColumns.length + 2} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={allColumns.length + 2} className="text-center py-10 text-muted-foreground">No {title.toLowerCase()} found.</TableCell></TableRow>
              ) : filtered.map(row => (
                <TableRow key={row.id}>
                  {allColumns.map(c => (
                    <TableCell key={c.key} className={c.mono ? "font-mono font-bold" : ""}>{String(row[c.key] ?? "—")}</TableCell>
                  ))}
                  <TableCell><Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm(`Delete "${row.code}"?`)) deleteMut.mutate(row.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditRow(null); setForm({ ...newRowDefaults }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRow ? `Edit: ${editRow.code}` : `New ${title.replace(/s$/, "")}`}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className={`grid ${hideSortOrder ? 'grid-cols-1' : 'grid-cols-2 gap-3'}`}>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Code *</Label>
                <Input value={form.code || ""} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. B" className="font-mono" disabled={!!editRow} />
              </div>
              {!hideSortOrder && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Sort Order</Label>
                  <Input type="number" value={form.sort_order ?? 10} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 10 }))} />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Display name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={2} />
            </div>
            {(extraFields || []).map(f => (
              <div key={f.key} className={f.type === "boolean" ? "pt-2" : "space-y-1"}>
                {f.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                    <input type="checkbox" checked={!!form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} className="w-4 h-4" />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <Label className="text-xs font-medium">{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2} />
                    ) : (
                      <Input value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    )}
                  </>
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            {editRow && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
                Active
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditRow(null); setForm({ ...newRowDefaults }); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending || !form.code || !form.name}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editRow ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MovementTypes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("movement-types");
  const [search, setSearch] = useState("");

  // Movement Type form/dialog state
  const [mtDialogOpen, setMtDialogOpen] = useState(false);
  const [editingMt, setEditingMt] = useState<MovementType | null>(null);
  const emptyMtForm = { movementTypeCode: "", description: "", movementClass: "", transactionType: "", inventoryDirection: "", isActive: true, reversalMovementType: "", documentTypeId: "", referenceDocumentRequired: "NONE", accountAssignmentMandatory: "NONE", printControl: "N", reasonCodeRequired: false, createFiDocument: true, createMaterialDocument: true };
  const [mtForm, setMtForm] = useState({ ...emptyMtForm });

  // Value String form/dialog
  const [vsDialogOpen, setVsDialogOpen] = useState(false);
  const emptyVsForm = { value_string: "", transaction_key: "", debit_credit: "D", account_modifier: "", description: "", sort_order: 10 };
  const [vsForm, setVsForm] = useState({ ...emptyVsForm });

  // Posting Rule form/dialog
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const emptyPrForm = { movement_type_id: 0, special_stock_ind: "", movement_ind: "", value_string: "", quantity_update: true, value_update: true, consumption_posting: "" };
  const [prForm, setPrForm] = useState({ ...emptyPrForm });

  // ─── Reference Data (ALL from DB) ─────────────────────────────────────────
  const { data: movementClasses = [] } = useQuery<RefRow[]>({ queryKey: ["ref-mvtcls"], queryFn: () => apiFetch("movement-classes?is_active=true") });
  const { data: transactionTypes = [] } = useQuery<RefRow[]>({ queryKey: ["ref-txntypes"], queryFn: () => apiFetch("movement-transaction-types?is_active=true") });
  const { data: inventoryDirections = [] } = useQuery<RefRow[]>({ queryKey: ["ref-invdirs"], queryFn: () => apiFetch("inventory-directions") });
  const { data: transactionKeys = [] } = useQuery<RefRow[]>({ queryKey: ["ref-txnkeys"], queryFn: () => apiFetch("transaction-keys") });
  const { data: movementIndicators = [] } = useQuery<RefRow[]>({ queryKey: ["ref-mvtinds"], queryFn: () => apiFetch("movement-indicators") });
  const { data: specialStockTypes = [] } = useQuery<RefRow[]>({ queryKey: ["ref-spstock"], queryFn: () => apiFetch("special-stock-types") });
  const { data: consumptionPostings = [] } = useQuery<RefRow[]>({ queryKey: ["ref-conpost"], queryFn: () => apiFetch("consumption-postings") });
  const { data: accountModifiers = [] } = useQuery<RefRow[]>({ queryKey: ["ref-accmods"], queryFn: () => apiFetch("account-modifiers") });
  const { data: referenceDocuments = [] } = useQuery<RefRow[]>({ queryKey: ["ref-docs"], queryFn: () => apiFetch("reference-documents") });
  const { data: accountAssignments = [] } = useQuery<RefRow[]>({ queryKey: ["ref-accassign"], queryFn: () => apiFetch("account-assignments") });
  const { data: apiDocumentTypes = [] } = useQuery<any[]>({
    queryKey: ["document-types"], queryFn: async () => {
      const res = await fetch("/api/master-data/document-types");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Format Document Types for DbSelect - using id as code so the selection captures the DB ID
  const documentTypesOptions = (apiDocumentTypes as any[]).map((dt: any) => ({
    id: dt.id,
    code: dt.id.toString(),
    name: `${dt.document_type_code} - ${dt.description}`,
    is_active: dt.is_active !== false,
  }));

  // ─── Main Data ────────────────────────────────────────────────────────────
  const { data: movementTypes = [], isLoading: loadingMt, refetch: refetchMt } = useQuery<MovementType[]>({
    queryKey: ["movement-types"],
    queryFn: async () => {
      const d = await apiFetch("movement-types");
      return (d.records?.rows || []).map((item: any) => ({
        id: item.id, movementTypeCode: item.movement_type_code, description: item.description,
        movementClass: item.movement_class, transactionType: item.transaction_type,
        inventoryDirection: item.inventory_direction,
        isActive: item.is_active ?? true,
        documentTypeId: item.document_type_id ? item.document_type_id.toString() : "",
        reversalMovementType: item.reversal_movement_type || "",
        referenceDocumentRequired: item.reference_document_required || "NONE",
        accountAssignmentMandatory: item.account_assignment_mandatory || "NONE",
        printControl: item.print_control || "N", reasonCodeRequired: !!item.reason_code_required,
        createFiDocument: item.create_fi_document !== false, createMaterialDocument: item.create_material_document !== false,
        postingRules: item.posting_rules || [],
      }));
    },
  });

  const { data: valueStrings = [], isLoading: loadingVs, refetch: refetchVs } = useQuery<ValueString[]>({
    queryKey: ["value-strings"],
    queryFn: () => apiFetch("value-strings"),
  });

  const { data: postingRules = [], isLoading: loadingPr, refetch: refetchPr } = useQuery<PostingRule[]>({
    queryKey: ["posting-rules-all"],
    queryFn: () => apiFetch("posting-rules"),
  });

  const distinctValueStrings = [...new Set((valueStrings as ValueString[]).map(v => v.value_string))].sort();

  // ─── DB Select helper ─────────────────────────────────────────────────────
  const DbSelect = ({ value, onChange, options, placeholder = "Select…", noneLabel, noneValue = "__NONE__" }: {
    value: string; onChange: (v: string) => void; options: RefRow[];
    placeholder?: string; noneLabel?: string; noneValue?: string;
  }) => (
    <Select value={value || noneValue} onValueChange={v => onChange(v === noneValue ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={options.length === 0 ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={noneValue}>{noneLabel}</SelectItem>}
        {options.map(o => <SelectItem key={o.code} value={o.code}>{o.code} — {o.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const F = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  // ─── Movement Type mutations ──────────────────────────────────────────────
  const createMt = useMutation({
    mutationFn: (d: any) => apiFetch("movement-types", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movement-types"] }); toast({ title: "Created" }); setMtDialogOpen(false); setMtForm({ ...emptyMtForm }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMt = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => apiFetch(`movement-types/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movement-types"] }); toast({ title: "Updated" }); setMtDialogOpen(false); setEditingMt(null); setMtForm({ ...emptyMtForm }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMt = useMutation({
    mutationFn: (id: number) => apiFetch(`movement-types/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movement-types"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Value String mutations
  const createVs = useMutation({
    mutationFn: (d: any) => apiFetch("value-strings", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["value-strings"] }); toast({ title: "Added" }); setVsDialogOpen(false); setVsForm({ ...emptyVsForm }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteVs = useMutation({
    mutationFn: (id: number) => apiFetch(`value-strings/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["value-strings"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Posting Rule mutations
  const createPr = useMutation({
    mutationFn: (d: any) => apiFetch(`movement-types/${d.movement_type_id}/posting-rules`, { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posting-rules-all"] }); qc.invalidateQueries({ queryKey: ["movement-types"] }); toast({ title: "Added" }); setPrDialogOpen(false); setPrForm({ ...emptyPrForm }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deletePr = useMutation({
    mutationFn: ({ mtId, id }: { mtId: number; id: number }) => apiFetch(`movement-types/${mtId}/posting-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posting-rules-all"] }); qc.invalidateQueries({ queryKey: ["movement-types"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEditMt = (mt: MovementType) => {
    setEditingMt(mt);
    setMtForm({ movementTypeCode: mt.movementTypeCode, description: mt.description, movementClass: mt.movementClass, transactionType: mt.transactionType, inventoryDirection: mt.inventoryDirection, isActive: mt.isActive, documentTypeId: mt.documentTypeId || "", reversalMovementType: mt.reversalMovementType || "", referenceDocumentRequired: mt.referenceDocumentRequired || "NONE", accountAssignmentMandatory: mt.accountAssignmentMandatory || "NONE", printControl: mt.printControl || "N", reasonCodeRequired: mt.reasonCodeRequired || false, createFiDocument: mt.createFiDocument !== false, createMaterialDocument: mt.createMaterialDocument !== false });
    setMtDialogOpen(true);
  };

  const filteredMt = (movementTypes as MovementType[]).filter(mt => !search || mt.movementTypeCode.toLowerCase().includes(search.toLowerCase()) || mt.description.toLowerCase().includes(search.toLowerCase()));
  const filteredVs = (valueStrings as ValueString[]).filter(vs => !search || vs.value_string.toLowerCase().includes(search.toLowerCase()) || vs.transaction_key.toLowerCase().includes(search.toLowerCase()));
  const filteredPr = (postingRules as PostingRule[]).filter(pr => !search || pr.value_string?.toLowerCase().includes(search.toLowerCase()) || pr.movement_type_code?.toLowerCase().includes(search.toLowerCase()));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/master-data" className="p-1.5 rounded-md hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Movement Types</h1>
          <p className="text-sm text-muted-foreground">Manage movement types and all related reference configuration data</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={v => { setSelectedTab(v); setSearch(""); }}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="movement-types" className="flex items-center gap-1.5 text-xs"><List className="h-3.5 w-3.5" /> Movement Types</TabsTrigger>
          <TabsTrigger value="value-strings" className="flex items-center gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Value Strings</TabsTrigger>
          <TabsTrigger value="posting-rules" className="flex items-center gap-1.5 text-xs"><GitBranch className="h-3.5 w-3.5" /> Posting Rules</TabsTrigger>
          <TabsTrigger value="movement-classes" className="flex items-center gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" /> Movement Classes</TabsTrigger>
          <TabsTrigger value="transaction-keys" className="flex items-center gap-1.5 text-xs"><Tag className="h-3.5 w-3.5" /> Transaction Keys</TabsTrigger>
          <TabsTrigger value="account-modifiers" className="flex items-center gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Account Modifiers</TabsTrigger>
          <TabsTrigger value="mvt-indicators" className="flex items-center gap-1.5 text-xs"><Sigma className="h-3.5 w-3.5" /> Movement Indicators</TabsTrigger>
          <TabsTrigger value="special-stock" className="flex items-center gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Special Stock</TabsTrigger>
          <TabsTrigger value="consumption" className="flex items-center gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Consumption Postings</TabsTrigger>
          <TabsTrigger value="ref-docs" className="flex items-center gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Reference Docs</TabsTrigger>
          <TabsTrigger value="acc-assign" className="flex items-center gap-1.5 text-xs"><Briefcase className="h-3.5 w-3.5" /> Account Assign</TabsTrigger>
        </TabsList>

        {/* ══ Movement Types ══════════════════════════════════════════════ */}
        <TabsContent value="movement-types" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle>Movement Types</CardTitle><CardDescription>Core movement type definitions</CardDescription></div>
                <Button onClick={() => { setMtForm({ ...emptyMtForm }); setEditingMt(null); setMtDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New</Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <Button variant="outline" size="icon" onClick={() => refetchMt()} disabled={loadingMt}><RefreshCw className={`h-4 w-4 ${loadingMt ? "animate-spin" : ""}`} /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead>Class</TableHead>
                    <TableHead>Transaction Type</TableHead><TableHead>Value String(s)</TableHead>
                    <TableHead>Direction</TableHead><TableHead>Reversal</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMt ? <TableRow><TableCell colSpan={10} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    : filteredMt.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No movement types found.</TableCell></TableRow>
                      : filteredMt.map(mt => (
                        <TableRow key={mt.id}>
                          <TableCell className="font-mono font-bold">{mt.movementTypeCode}</TableCell>
                          <TableCell className="max-w-[160px] truncate text-sm">{mt.description}</TableCell>
                          <TableCell className="text-sm">{mt.movementClass}</TableCell>
                          <TableCell className="text-sm capitalize">{mt.transactionType}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {mt.postingRules && mt.postingRules.length > 0
                                ? [...new Set(mt.postingRules.map((r: any) => r.value_string))].map(vs => <Badge key={vs} variant="secondary" className="font-mono text-xs">{vs}</Badge>)
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{mt.inventoryDirection}</TableCell>
                          <TableCell className="font-mono text-xs">{mt.reversalMovementType || "—"}</TableCell>
                          <TableCell><Badge variant={mt.isActive ? "default" : "secondary"}>{mt.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditMt(mt)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedTab("posting-rules"); setSearch(mt.movementTypeCode); }}><GitBranch className="mr-2 h-4 w-4" /> View Rules</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm("Delete?")) deleteMt.mutate(mt.id); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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

        {/* ══ Value Strings ════════════════════════════════════════════════ */}
        <TabsContent value="value-strings" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle>Value Strings</CardTitle><CardDescription>Map value strings to GL account keys for account determination</CardDescription></div>
                <Button onClick={() => { setVsForm({ ...emptyVsForm }); setVsDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New</Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <Button variant="outline" size="icon" onClick={() => refetchVs()} disabled={loadingVs}><RefreshCw className={`h-4 w-4 ${loadingVs ? "animate-spin" : ""}`} /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value String</TableHead><TableHead>Account Key</TableHead><TableHead>D/C</TableHead>
                    <TableHead>Modifier</TableHead><TableHead>Description</TableHead><TableHead>Sort</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVs ? <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    : filteredVs.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No value strings found.</TableCell></TableRow>
                      : filteredVs.map(vs => (
                        <TableRow key={vs.id}>
                          <TableCell className="font-mono font-bold">{vs.value_string}</TableCell>
                          <TableCell><Badge variant="outline" className="font-mono">{vs.transaction_key}</Badge></TableCell>
                          <TableCell><Badge variant={vs.debit_credit === "D" ? "default" : "secondary"}>{vs.debit_credit === "D" ? "Debit" : "Credit"}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{vs.account_modifier || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{vs.description || "—"}</TableCell>
                          <TableCell>{vs.sort_order ?? 10}</TableCell>
                          <TableCell><Badge variant={vs.is_active ? "default" : "secondary"}>{vs.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm("Delete?")) deleteVs.mutate(vs.id); }}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Posting Rules ════════════════════════════════════════════════ */}
        <TabsContent value="posting-rules" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle>Posting Rules</CardTitle><CardDescription>Map movement types to value strings based on stock type and movement indicator</CardDescription></div>
                <Button onClick={() => { setPrForm({ ...emptyPrForm }); setPrDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New</Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <Button variant="outline" size="icon" onClick={() => refetchPr()} disabled={loadingPr}><RefreshCw className={`h-4 w-4 ${loadingPr ? "animate-spin" : ""}`} /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movement Type</TableHead><TableHead>Special Stock</TableHead><TableHead>Mvt Indicator</TableHead>
                    <TableHead>Value String</TableHead><TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">Val</TableHead><TableHead>Consumption</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPr ? <TableRow><TableCell colSpan={9} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    : filteredPr.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No posting rules found.</TableCell></TableRow>
                      : filteredPr.map(pr => (
                        <TableRow key={pr.id}>
                          <TableCell className="font-mono font-bold">{pr.movement_type_code || pr.movement_type_id}</TableCell>
                          <TableCell>{pr.special_stock_ind || "Standard"}</TableCell>
                          <TableCell>{pr.movement_ind || "Any"}</TableCell>
                          <TableCell><Badge variant="secondary" className="font-mono">{pr.value_string}</Badge></TableCell>
                          <TableCell className="text-center">{pr.quantity_update ? "✓" : "✗"}</TableCell>
                          <TableCell className="text-center">{pr.value_update ? "✓" : "✗"}</TableCell>
                          <TableCell>{pr.consumption_posting || "—"}</TableCell>
                          <TableCell><Badge variant={pr.is_active ? "default" : "secondary"}>{pr.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm("Delete?")) deletePr.mutate({ mtId: pr.movement_type_id, id: pr.id }); }}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Reference Data Tabs (all use generic RefTab) ═══════════════ */}
        <TabsContent value="movement-classes" className="mt-4">
          <RefTab title="Movement Classes" description="Categories that classify the purpose of each movement type" endpoint="movement-classes" queryKey={["ref-mvtcls-full"]}
            columns={[{ key: "description", label: "Description" }, { key: "affects_gl", label: "Affects GL", type: "boolean" }, { key: "allows_negative", label: "Allows Negative", type: "boolean" }]}
            extraFields={[
              { key: "affects_gl", label: "Affects GL", type: "boolean" },
              { key: "allows_negative", label: "Allows Negative", type: "boolean" }
            ]}
            newRowDefaults={{ code: "", name: "", description: "", affects_gl: true, allows_negative: false, is_active: true }}
            hideSortOrder={true}
          />
        </TabsContent>

        <TabsContent value="transaction-keys" className="mt-4">
          <RefTab title="Transaction Keys" description="GL account determination keys used in value string mapping (BSX, WRX, GBB, etc.)" endpoint="transaction-keys" queryKey={["ref-txnkeys-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="account-modifiers" className="mt-4">
          <RefTab title="Account Modifiers" description="Sub-keys for GBB that differentiate consumption postings (VBR, VAX, VNG, etc.)" endpoint="account-modifiers" queryKey={["ref-accmods-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="mvt-indicators" className="mt-4">
          <RefTab title="Movement Indicators" description="Indicator for the reference document that triggered the movement (B=PO, F=Prod Order, L=Delivery)" endpoint="movement-indicators" queryKey={["ref-mvtinds-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="special-stock" className="mt-4">
          <RefTab title="Special Stock Types" description="Types of special stock that affect how value strings are determined (K=Consignment, E=Sales Order, Q=Project)" endpoint="special-stock-types" queryKey={["ref-spstock-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          <RefTab title="Consumption Postings" description="Consumption posting types for internal movements (V=Consumption, E=Expense, A=Asset)" endpoint="consumption-postings" queryKey={["ref-conpost-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="ref-docs" className="mt-4">
          <RefTab title="Reference Documents" description="Required predecessor documents needed to post the movement (e.g. Purchase Order, Delivery)" endpoint="reference-documents" queryKey={["ref-docs-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>

        <TabsContent value="acc-assign" className="mt-4">
          <RefTab title="Account Assignments" description="Determines if a Cost Center, Project, or Order is mandatory for the movement posting" endpoint="account-assignments" queryKey={["acc-assign-full"]}
            columns={[{ key: "description", label: "Description" }]}
            newRowDefaults={{ code: "", name: "", description: "", sort_order: 10, is_active: true }}
          />
        </TabsContent>
      </Tabs>

      {/* ══ DIALOG: Movement Type ═══════════════════════════════════════════ */}
      <Dialog open={mtDialogOpen} onOpenChange={v => { if (!v) { setMtDialogOpen(false); setEditingMt(null); setMtForm({ ...emptyMtForm }); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMt ? `Edit: ${editingMt.movementTypeCode}` : "Create Movement Type"}</DialogTitle>
            <DialogDescription>{editingMt ? editingMt.description : "Configure the new inventory movement type"}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="control">Control Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Code *" hint="Max 3 characters, e.g. 101">
                  <Input value={mtForm.movementTypeCode} onChange={e => setMtForm(p => ({ ...p, movementTypeCode: e.target.value.toUpperCase() }))} maxLength={3} placeholder="101" disabled={!!editingMt} className="font-mono" />
                </F>
                <F label="Description *">
                  <Input value={mtForm.description} onChange={e => setMtForm(p => ({ ...p, description: e.target.value }))} />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Movement Class *">
                  <DbSelect value={mtForm.movementClass} onChange={v => setMtForm(p => ({ ...p, movementClass: v }))} options={movementClasses} placeholder="Select class…" />
                </F>
                <F label="Transaction Type *">
                  <DbSelect value={mtForm.transactionType} onChange={v => setMtForm(p => ({ ...p, transactionType: v }))} options={transactionTypes} placeholder="Select type…" />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Inventory Direction *">
                  <DbSelect value={mtForm.inventoryDirection} onChange={v => setMtForm(p => ({ ...p, inventoryDirection: v }))} options={inventoryDirections} placeholder="Select direction…" />
                </F>
                <F label="Reversal Code">
                  <DbSelect
                    value={mtForm.reversalMovementType}
                    onChange={v => setMtForm(p => ({ ...p, reversalMovementType: v || "" }))}
                    options={movementTypes.map(mt => ({ id: mt.movementTypeCode, code: mt.movementTypeCode, name: mt.description }))}
                    placeholder="Select reversal…"
                    noneLabel="None"
                  />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Assigned Document Type" hint="Default document type generated (e.g. WE, KR)">
                  <DbSelect
                    value={mtForm.documentTypeId}
                    onChange={v => setMtForm(p => ({ ...p, documentTypeId: v || "" }))}
                    options={documentTypesOptions}
                    placeholder="Select document type…"
                    noneLabel="None"
                  />
                </F>
              </div>
              <div className="flex gap-8 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={mtForm.isActive} onChange={e => setMtForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" /> Active
                </label>
              </div>
            </TabsContent>
            <TabsContent value="control" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Print Slip">
                  <Select value={mtForm.printControl} onValueChange={v => setMtForm(p => ({ ...p, printControl: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">No Print</SelectItem>
                      <SelectItem value="P">Print Slip</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Reference Document">
                  <DbSelect
                    value={mtForm.referenceDocumentRequired}
                    onChange={v => setMtForm(p => ({ ...p, referenceDocumentRequired: v }))}
                    options={referenceDocuments}
                  />
                </F>
                <F label="Account Assignment">
                  <DbSelect
                    value={mtForm.accountAssignmentMandatory}
                    onChange={v => setMtForm(p => ({ ...p, accountAssignmentMandatory: v }))}
                    options={accountAssignments}
                  />
                </F>
              </div>
              <div className="flex gap-8 flex-wrap">
                {[["createFiDocument", "Create Financial Doc"], ["createMaterialDocument", "Create Material Doc"], ["reasonCodeRequired", "Reason Code Required"]].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={(mtForm as any)[k]} onChange={e => setMtForm(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4" /> {l}
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => { setMtDialogOpen(false); setEditingMt(null); setMtForm({ ...emptyMtForm }); }}>Cancel</Button>
            <Button onClick={() => { const d = { ...mtForm, movementTypeCode: mtForm.movementTypeCode.toUpperCase() }; if (editingMt) updateMt.mutate({ id: editingMt.id, d }); else createMt.mutate(d); }} disabled={createMt.isPending || updateMt.isPending}>
              {(createMt.isPending || updateMt.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMt ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG: Value String ════════════════════════════════════════════ */}
      <Dialog open={vsDialogOpen} onOpenChange={v => { if (!v) { setVsDialogOpen(false); setVsForm({ ...emptyVsForm }); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Value String</DialogTitle><DialogDescription>Map a value string to a GL account key</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <F label="Value String *" hint="e.g. WE01, WA08"><Input value={vsForm.value_string} onChange={e => setVsForm(p => ({ ...p, value_string: e.target.value.toUpperCase() }))} placeholder="WE01" className="font-mono" /></F>
              <F label="Transaction Key *"><DbSelect value={vsForm.transaction_key} onChange={v => setVsForm(p => ({ ...p, transaction_key: v }))} options={transactionKeys} placeholder="Select key…" /></F>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Debit / Credit">
                <Select value={vsForm.debit_credit} onValueChange={v => setVsForm(p => ({ ...p, debit_credit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="D">Debit</SelectItem><SelectItem value="C">Credit</SelectItem></SelectContent>
                </Select>
              </F>
              <F label="Account Modifier"><DbSelect value={vsForm.account_modifier || ""} onChange={v => setVsForm(p => ({ ...p, account_modifier: v }))} options={accountModifiers} placeholder="None…" noneLabel="None" /></F>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Description"><Input value={vsForm.description} onChange={e => setVsForm(p => ({ ...p, description: e.target.value }))} /></F>
              <F label="Sort Order"><Input type="number" value={vsForm.sort_order} onChange={e => setVsForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 10 }))} /></F>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVsDialogOpen(false); setVsForm({ ...emptyVsForm }); }}>Cancel</Button>
            <Button onClick={() => createVs.mutate(vsForm)} disabled={createVs.isPending || !vsForm.value_string || !vsForm.transaction_key}>
              {createVs.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG: Posting Rule ════════════════════════════════════════════ */}
      <Dialog open={prDialogOpen} onOpenChange={v => { if (!v) { setPrDialogOpen(false); setPrForm({ ...emptyPrForm }); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Posting Rule</DialogTitle><DialogDescription>Define which value string to use for a movement type in a given context</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <F label="Movement Type *">
              <Select value={String(prForm.movement_type_id || "")} onValueChange={v => setPrForm(p => ({ ...p, movement_type_id: parseInt(v) }))}>
                <SelectTrigger><SelectValue placeholder="Select movement type…" /></SelectTrigger>
                <SelectContent>
                  {(movementTypes as MovementType[]).map(mt => <SelectItem key={mt.id} value={String(mt.id)}>{mt.movementTypeCode} — {mt.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <div className="grid grid-cols-2 gap-4">
              <F label="Value String *">
                <Select value={prForm.value_string || "__VS__"} onValueChange={v => setPrForm(p => ({ ...p, value_string: v === "__VS__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select value string…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__VS__">— Select —</SelectItem>
                    {distinctValueStrings.map(vs => <SelectItem key={vs} value={vs}>{vs}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Movement Indicator"><DbSelect value={prForm.movement_ind || ""} onChange={v => setPrForm(p => ({ ...p, movement_ind: v }))} options={movementIndicators} placeholder="Any…" noneLabel="Any (blank)" /></F>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Special Stock"><DbSelect value={prForm.special_stock_ind || ""} onChange={v => setPrForm(p => ({ ...p, special_stock_ind: v }))} options={specialStockTypes} placeholder="Standard…" noneLabel="Standard (blank)" /></F>
              <F label="Consumption Posting"><DbSelect value={prForm.consumption_posting || ""} onChange={v => setPrForm(p => ({ ...p, consumption_posting: v }))} options={consumptionPostings} placeholder="None…" noneLabel="None" /></F>
            </div>
            <div className="flex gap-6">
              {[["quantity_update", "Update Quantity"], ["value_update", "Update Value"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(prForm as any)[k]} onChange={e => setPrForm(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4" /> {l}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPrDialogOpen(false); setPrForm({ ...emptyPrForm }); }}>Cancel</Button>
            <Button onClick={() => createPr.mutate(prForm)} disabled={createPr.isPending || !prForm.movement_type_id || !prForm.value_string}>
              {createPr.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}