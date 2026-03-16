import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Edit, Trash2, ArrowLeft, RefreshCw, Settings, Save, ChevronRight, Layers, GitBranch, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
type Variant = { id: number; code: string; description: string; active: boolean; group_count?: number };
type Group = { id: number; variant_id: number; code: string; description: string; active: boolean; variant_code?: string; variant_description?: string };
type Rule = { id: number; group_id: number; field_section: string; field_name: string; field_label: string; status: string };

const STATUS_OPTIONS = [
  { value: "suppress", label: "Suppress", color: "text-gray-400", bg: "bg-gray-100" },
  { value: "required", label: "Required", color: "text-red-600", bg: "bg-red-50" },
  { value: "optional", label: "Optional", color: "text-blue-600", bg: "bg-blue-50" },
  { value: "display", label: "Display", color: "text-green-600", bg: "bg-green-50" },
];

const getStatusBadge = (status: string) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt
    ? <Badge className={`${opt.bg} ${opt.color} border-0 text-xs font-medium`}>{opt.label}</Badge>
    : <Badge variant="outline">{status}</Badge>;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
const variantSchema = z.object({
  code: z.string().min(1, "Required").max(4),
  description: z.string().min(1, "Required"),
  active: z.boolean().default(true),
});
const groupSchema = z.object({
  variant_id: z.number().min(1, "Select a variant"),
  code: z.string().min(1, "Required").max(4),
  description: z.string().min(1, "Required"),
  active: z.boolean().default(true),
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FieldStatusVariants() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("variants");

  // ── Variants ──────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  // ── Groups ────────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [filterVariantId, setFilterVariantId] = useState<number | "all">("all");

  // ── Field Rules ───────────────────────────────────────────────────────────
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [pendingRules, setPendingRules] = useState<Record<string, string>>({});
  const [rulesSaving, setRulesSaving] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState<number | "">("");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchVariants = async () => {
    setVariantsLoading(true);
    try {
      const r = await fetch("/api/master-data/field-status-variants");
      const d = await r.json();
      setVariants(d.data || []);
    } finally { setVariantsLoading(false); }
  };

  const fetchGroups = async (variantId?: number) => {
    setGroupsLoading(true);
    try {
      const url = variantId ? `/api/master-data/field-status-groups?variant_id=${variantId}` : "/api/master-data/field-status-groups";
      const r = await fetch(url);
      const d = await r.json();
      setGroups(d.data || []);
    } finally { setGroupsLoading(false); }
  };

  const fetchRules = async (groupId: number) => {
    setRulesLoading(true);
    try {
      const r = await fetch(`/api/master-data/field-status-groups/${groupId}/rules`);
      const d = await r.json();
      const list: Rule[] = d.data || [];
      setRules(list);
      const init: Record<string, string> = {};
      list.forEach(r => { init[r.field_name] = r.status; });
      setPendingRules(init);
    } finally { setRulesLoading(false); }
  };

  useEffect(() => { fetchVariants(); }, []);
  useEffect(() => {
    if (activeTab === "groups") {
      fetchGroups(filterVariantId !== "all" ? filterVariantId : undefined);
    }
  }, [activeTab, filterVariantId]);

  // ── Variant form ──────────────────────────────────────────────────────────
  const variantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { code: "", description: "", active: true },
  });
  useEffect(() => {
    variantForm.reset(editingVariant
      ? { code: editingVariant.code, description: editingVariant.description, active: editingVariant.active }
      : { code: "", description: "", active: true });
  }, [editingVariant]);

  const saveVariant = async (values: z.infer<typeof variantSchema>) => {
    try {
      const url = editingVariant ? `/api/master-data/field-status-variants/${editingVariant.id}` : "/api/master-data/field-status-variants";
      const r = await apiRequest(url, { method: editingVariant ? "PUT" : "POST", body: JSON.stringify(values) });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      toast({ title: editingVariant ? "Variant Updated" : "Variant Created" });
      setShowVariantDialog(false); setEditingVariant(null);
      fetchVariants();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const deleteVariant = async (v: Variant) => {
    if (!confirm(`Delete variant "${v.code}"?`)) return;
    try {
      await apiRequest(`/api/master-data/field-status-variants/${v.id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      fetchVariants();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  // ── Group form ────────────────────────────────────────────────────────────
  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { variant_id: 0, code: "", description: "", active: true },
  });
  useEffect(() => {
    groupForm.reset(editingGroup
      ? { variant_id: editingGroup.variant_id, code: editingGroup.code, description: editingGroup.description, active: editingGroup.active }
      : { variant_id: variants[0]?.id || 0, code: "", description: "", active: true });
  }, [editingGroup, variants]);

  const saveGroup = async (values: z.infer<typeof groupSchema>) => {
    try {
      const url = editingGroup ? `/api/master-data/field-status-groups/${editingGroup.id}` : "/api/master-data/field-status-groups";
      const body = editingGroup ? { code: values.code, description: values.description, active: values.active } : values;
      const r = await apiRequest(url, { method: editingGroup ? "PUT" : "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      toast({ title: editingGroup ? "Group Updated" : "Group Created" });
      setShowGroupDialog(false); setEditingGroup(null);
      fetchGroups(filterVariantId !== "all" ? filterVariantId : undefined);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(`Delete group "${g.code}"?`)) return;
    try {
      await apiRequest(`/api/master-data/field-status-groups/${g.id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      if (selectedGroup?.id === g.id) { setSelectedGroup(null); setRules([]); }
      fetchGroups(filterVariantId !== "all" ? filterVariantId : undefined);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  // ── Open rules for a group ────────────────────────────────────────────────
  const openGroupRules = (g: Group) => {
    setSelectedGroup(g);
    fetchRules(g.id);
    setActiveTab("rules");
  };

  // ── Save rules ────────────────────────────────────────────────────────────
  const saveRules = async () => {
    if (!selectedGroup) return;
    setRulesSaving(true);
    try {
      const rulesPayload = Object.entries(pendingRules).map(([field_name, status]) => ({ field_name, status }));
      const r = await apiRequest(`/api/master-data/field-status-groups/${selectedGroup.id}`, {
        method: "PUT",
        body: JSON.stringify({ rules: rulesPayload }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      toast({ title: "Rules Saved", description: `${selectedGroup.code} field rules saved` });
      fetchRules(selectedGroup.id);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setRulesSaving(false); }
  };

  const rulesBySection = rules.reduce((acc, r) => {
    if (!acc[r.field_section]) acc[r.field_section] = [];
    acc[r.field_section].push(r);
    return acc;
  }, {} as Record<string, Rule[]>);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link href="/master-data" className="p-2 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Settings className="h-6 w-6 text-indigo-600" />
            Field Status Configuration
            <Badge variant="outline" className="text-xs font-mono text-indigo-600 border-indigo-300"></Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure which fields are Suppressed / Required / Optional / Display-only during GL document posting
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="variants" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Field Status Variants
            <Badge className="ml-1 bg-indigo-100 text-indigo-700 text-xs">{variants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2" onClick={() => fetchGroups(filterVariantId !== "all" ? filterVariantId : undefined)}>
            <GitBranch className="h-4 w-4" />
            Field Status Groups
            <Badge className="ml-1 bg-indigo-100 text-indigo-700 text-xs">{groups.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2" disabled={!selectedGroup}>
            <Sliders className="h-4 w-4" />
            Field Rules
            {selectedGroup && <Badge className="ml-1 bg-indigo-100 text-indigo-700 text-xs">{selectedGroup.code}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ══ Tab 1: Variants ══════════════════════════════════════════════════ */}
        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Field Status Variants</CardTitle>
                  <CardDescription>
                    A variant groups field status groups together. Each company code is assigned one variant.
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingVariant(null); setShowVariantDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> New Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variantsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Groups</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                          No variants found. Create your first variant.
                        </TableCell>
                      </TableRow>
                    ) : variants.map(v => (
                      <TableRow key={v.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{v.code}</span>
                        </TableCell>
                        <TableCell className="font-medium">{v.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-600">
                            {v.group_count || 0} groups
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={v.active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                            {v.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline" size="sm"
                              onClick={() => { setFilterVariantId(v.id); setActiveTab("groups"); fetchGroups(v.id); }}
                            >
                              <ChevronRight className="h-4 w-4 mr-1" /> View Groups
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingVariant(v); setShowVariantDialog(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteVariant(v)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Tab 2: Groups ════════════════════════════════════════════════════ */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Field Status Groups</CardTitle>
                  <CardDescription>
                    Each group controls which fields are required/optional/suppressed on a GL account.
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Filter by variant */}
                  <Select
                    value={String(filterVariantId)}
                    onValueChange={v => setFilterVariantId(v === "all" ? "all" : parseInt(v))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Variants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Variants</SelectItem>
                      {variants.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.code} — {v.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { setEditingGroup(null); setShowGroupDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> New Group
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Group Code</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Variant</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                          No groups found.
                        </TableCell>
                      </TableRow>
                    ) : groups.map(g => (
                      <TableRow key={g.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{g.code}</span>
                        </TableCell>
                        <TableCell className="font-medium">{g.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{g.variant_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={g.active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                            {g.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openGroupRules(g)}>
                              <Sliders className="h-4 w-4 mr-1" /> Field Rules
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingGroup(g); setShowGroupDialog(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteGroup(g)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Tab 3: Field Rules (Radio Buttons) ══════════════════════════════ */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-600" />
                    Field Rules
                    {selectedGroup && (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">
                        {selectedGroup.code}
                      </Badge>
                    )}
                  </CardTitle>
                  {selectedGroup && (
                    <CardDescription>
                      {selectedGroup.description} — Set each field to Suppress / Required / Optional / Display
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("groups")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Groups
                  </Button>
                  {selectedGroup && (
                    <Button onClick={saveRules} disabled={rulesSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {rulesSaving ? "Saving..." : "Save Rules"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedGroup ? (
                <div className="p-12 text-center text-gray-400">
                  <Sliders className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Select a group from the <strong>Field Status Groups</strong> tab and click <strong>Field Rules</strong></p>
                </div>
              ) : rulesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Column header */}
                  <div className="sticky top-0 bg-white z-10 grid grid-cols-[220px_1fr] border-b border-t shadow-sm">
                    <div className="p-3 text-xs font-bold text-gray-600 uppercase tracking-wide border-r">Field Name</div>
                    <div className="grid grid-cols-4 divide-x">
                      {STATUS_OPTIONS.map(s => (
                        <div key={s.value} className={`p-3 text-xs font-bold text-center uppercase tracking-wide ${s.color}`}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rows grouped by section */}
                  {Object.entries(rulesBySection).map(([section, sectionRules]) => (
                    <div key={section}>
                      <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-t">
                        {section}
                      </div>
                      {sectionRules.map(rule => (
                        <div key={rule.field_name} className="grid grid-cols-[220px_1fr] border-b hover:bg-indigo-50/30 transition-colors">
                          <div className="p-3 text-sm text-gray-700 border-r flex items-center font-medium">
                            {rule.field_label}
                          </div>
                          <div className="grid grid-cols-4 divide-x">
                            {STATUS_OPTIONS.map(s => (
                              <label
                                key={s.value}
                                className={`flex items-center justify-center p-3 cursor-pointer transition-colors ${(pendingRules[rule.field_name] || rule.status) === s.value ? s.bg : 'hover:bg-gray-50'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name={`rule-${rule.field_name}`}
                                  value={s.value}
                                  checked={(pendingRules[rule.field_name] || rule.status) === s.value}
                                  onChange={() => setPendingRules(prev => ({ ...prev, [rule.field_name]: s.value }))}
                                  className="h-4 w-4 cursor-pointer accent-indigo-600"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Variant Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showVariantDialog} onOpenChange={v => { setShowVariantDialog(v); if (!v) setEditingVariant(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Variant" : "New Field Status Variant"}</DialogTitle>
            <DialogDescription>
              A variant groups field status groups and is assigned to a company code.
            </DialogDescription>
          </DialogHeader>
          <Form {...variantForm}>
            <form onSubmit={variantForm.handleSubmit(saveVariant)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={variantForm.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={4} placeholder="0001" className="font-mono uppercase" disabled={!!editingVariant}
                        onChange={e => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={variantForm.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 pt-7">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Active</FormLabel>
                  </FormItem>
                )} />
              </div>
              <FormField control={variantForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Standard Field Status Variant" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowVariantDialog(false); setEditingVariant(null); }}>Cancel</Button>
                <Button type="submit">{editingVariant ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Group Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showGroupDialog} onOpenChange={v => { setShowGroupDialog(v); if (!v) setEditingGroup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "New Field Status Group"}</DialogTitle>
            <DialogDescription>
              Groups control field visibility rules and are assigned to GL accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(saveGroup)} className="space-y-4">
              <FormField control={groupForm.control} name="variant_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant *</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={v => field.onChange(parseInt(v))}
                    disabled={!!editingGroup}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a variant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {variants.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          <span className="font-mono font-bold mr-2">{v.code}</span>
                          {v.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={groupForm.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Code *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={4} placeholder="G001" className="font-mono uppercase" disabled={!!editingGroup}
                        onChange={e => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={groupForm.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 pt-7">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Active</FormLabel>
                  </FormItem>
                )} />
              </div>
              <FormField control={groupForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. General Posting" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowGroupDialog(false); setEditingGroup(null); }}>Cancel</Button>
                <Button type="submit">{editingGroup ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}