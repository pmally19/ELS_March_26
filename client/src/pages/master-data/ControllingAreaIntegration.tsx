import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, GitBranch, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Schema for Controlling Area
const controllingAreaSchema = z.object({
  area_code: z.string().min(1, "Area code is required").max(10, "Area code must be 10 characters or less"),
  area_name: z.string().min(1, "Area name is required").max(100, "Area name must be 100 characters or less"),
  description: z.string().optional().or(z.literal("")),
  operating_concern: z.string().max(10).optional().or(z.literal("")),
  person_responsible: z.string().max(100).optional().or(z.literal("")),
  currency: z.string().length(3).optional().or(z.literal("")),
  fiscal_year_variant: z.string().max(10).optional().or(z.literal("")),
  chart_of_accounts: z.string().max(10).optional().or(z.literal("")),
  cost_center_standard_hierarchy: z.string().max(20).optional().or(z.literal("")),
  profit_center_standard_hierarchy: z.string().max(20).optional().or(z.literal("")),
  activity_type_version: z.string().max(10).optional().or(z.literal("")),
  costing_version: z.string().max(10).optional().or(z.literal("")),
  price_calculation_control: z.boolean().optional(),
  actual_costing_enabled: z.boolean().optional(),
  plan_costing_enabled: z.boolean().optional(),
  variance_calculation: z.boolean().optional(),
  settlement_method: z.enum(["full", "delta", "statistical"]).optional(),
  allocation_cycle_posting: z.boolean().optional(),
  profit_center_accounting: z.boolean().optional(),
  active: z.boolean().optional()
});

// Schema for Assignment
const assignmentSchema = z.object({
  controlling_area_id: z.coerce.number().int().positive("Please select a controlling area"),
  company_code_id: z.coerce.number().int().positive("Please select a company code"),
});

type ControllingArea = z.infer<typeof controllingAreaSchema> & {
  id: number;
  fiscal_year_variant_id?: number;
  chart_of_accounts_id?: number;
};

export default function ControllingAreaIntegration() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ControllingArea | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // --- QUERIES ---

  // Fetch management control areas
  const { data: controllingAreas = [], isLoading: areasLoading, refetch: refetchAreas } = useQuery({
    queryKey: ["/api/controlling-areas"],
    queryFn: async () => {
      const res = await fetch("/api/controlling-areas", {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch management control areas');
      return res.json();
    },
  });

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ["/api/master-data/currency"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/master-data/currency", { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : [];
      } catch { return []; }
    },
  });

  // Fetch fiscal year variants
  const { data: fiscalYearVariants = [] } = useQuery({
    queryKey: ["/api/master-data/fiscal-year-variants"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/master-data/fiscal-year-variants", { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.filter((v: any) => v.active !== false) : [];
      } catch { return []; }
    },
  });

  // Fetch chart of accounts
  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["/api/master-data/chart-of-accounts"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/master-data/chart-of-accounts", { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.filter((c: any) => c.isActive !== false) : [];
      } catch { return []; }
    },
  });

  // Fetch Assignments for selected Area
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["/api/master-data/controlling-area-assignments", selectedAreaId],
    queryFn: async () => {
      if (!selectedAreaId) return [];
      const res = await fetch(`/api/master-data/controlling-area-assignments/${selectedAreaId}`);
      if (!res.ok) throw new Error('Failed to fetch assignments');
      return res.json();
    },
    enabled: !!selectedAreaId,
  });

  // Fetch All Company Codes (for assignment dropdown)
  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const res = await fetch("/api/master-data/company-code");
      if (!res.ok) throw new Error('Failed to fetch company codes');
      return res.json();
    },
  });

  // --- FORMS ---

  const form = useForm<z.infer<typeof controllingAreaSchema>>({
    resolver: zodResolver(controllingAreaSchema),
    defaultValues: {
      area_code: "", area_name: "", description: "", operating_concern: "", person_responsible: "",
      currency: undefined, fiscal_year_variant: undefined, chart_of_accounts: undefined,
      cost_center_standard_hierarchy: "", profit_center_standard_hierarchy: "",
      activity_type_version: "", costing_version: "",
      price_calculation_control: undefined, actual_costing_enabled: undefined, plan_costing_enabled: undefined,
      variance_calculation: undefined, settlement_method: undefined, allocation_cycle_posting: undefined,
      profit_center_accounting: undefined, active: undefined
    },
  });

  const assignmentForm = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      controlling_area_id: undefined, company_code_id: undefined
    }
  });

  // --- MUTATIONS ---

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof controllingAreaSchema>) => {
      const res = await apiRequest("/api/controlling-areas", { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controlling-areas"] });
      setOpen(false); setEditingArea(null); form.reset();
      toast({ title: "Success", description: "Management control area created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to create controlling area", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & z.infer<typeof controllingAreaSchema>) => {
      const res = await apiRequest(`/api/controlling-areas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controlling-areas"] });
      setOpen(false); setEditingArea(null); form.reset();
      toast({ title: "Success", description: "Management control area updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to update controlling area", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/controlling-areas/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controlling-areas"] });
      toast({ title: "Success", description: "Management control area deleted successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to delete controlling area", variant: "destructive" }),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      const res = await apiRequest("/api/master-data/controlling-area-assignments", {
        method: "POST", body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      refetchAssignments();
      setAssignmentDialogOpen(false);
      assignmentForm.reset();
      toast({ title: "Success", description: "Company Code assigned successfully" });
    },
    onError: (e: any) => toast({ title: "Assignment Failed", description: e.message || "Failed to assign company code", variant: "destructive" }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/master-data/controlling-area-assignments/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Success", description: "Assignment removed successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to remove assignment", variant: "destructive" }),
  });

  // --- HANDLERS ---

  const onSubmit = (data: z.infer<typeof controllingAreaSchema>) => {
    const cleanData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === "" ? undefined : v]));
    editingArea ? updateMutation.mutate({ id: editingArea.id, ...cleanData }) : createMutation.mutate(cleanData);
  };

  const handleEdit = (area: any) => {
    setEditingArea(area);
    form.reset({
      area_code: area.area_code || "", area_name: area.area_name || "", description: area.description || "",
      operating_concern: area.operating_concern_code || "", person_responsible: area.person_responsible || "",
      currency: area.currency_code || undefined,
      fiscal_year_variant: area.fiscal_year_variant_code || area.fiscal_year_variant || undefined,
      chart_of_accounts: area.chart_of_accounts_code || area.chart_of_accounts || undefined,
      cost_center_standard_hierarchy: area.cost_center_hierarchy_code || "", profit_center_standard_hierarchy: area.profit_center_hierarchy_code || "",
      activity_type_version: area.activity_type_version || "", costing_version: area.costing_version || "",
      price_calculation_control: area.price_calculation_enabled, actual_costing_enabled: area.actual_costing_enabled,
      plan_costing_enabled: area.plan_costing_enabled, variance_calculation: area.variance_calculation_enabled,
      settlement_method: area.settlement_method || undefined, allocation_cycle_posting: area.allocation_cycle_posting_enabled,
      profit_center_accounting: area.profit_center_accounting_enabled, active: area.is_active
    });
    setOpen(true);
  };

  const handleCreate = () => { setEditingArea(null); form.reset(); setOpen(true); };

  const onAssignmentSubmit = (data: z.infer<typeof assignmentSchema>) => {
    createAssignmentMutation.mutate(data);
  };

  // --- FILTERING FOR ASSIGNMENT DIALOG ---
  const selectedArea = controllingAreas.find((a: any) => a.id.toString() === selectedAreaId);

  const compatibleCompanyCodes = companyCodes.filter((cc: any) => {
    if (!selectedArea) return false;
    // Check compatibility (ID match)
    const coaMatch = cc.chart_of_accounts_id === selectedArea.chart_of_accounts_id;
    const fyvMatch = cc.fiscal_year_variant_id === selectedArea.fiscal_year_variant_id;

    // Check if not already assigned (simple client-side check against current list default visibility)
    // Note: A robust check would be against ALL assignments globally, handled by backend unique constraint.
    // Here we mainly filter for UX to show "Compatible" ones.
    const isAlreadyAssignedHere = assignments.some((a: any) => a.company_code_id === cc.id);

    return coaMatch && fyvMatch && !isAlreadyAssignedHere;
  });

  const settlementMethods = [{ v: "full", l: "Full Settlement" }, { v: "delta", l: "Delta Settlement" }, { v: "statistical", l: "Statistical Only" }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/master-data")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Management Control Integration</h1>
            <p className="text-muted-foreground">Configure cost and profitability analysis integration with financial systems</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="areas">Control Areas</TabsTrigger>
          <TabsTrigger value="assignments">Assign Company Code</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-4">
          <div className="flex justify-end space-x-2 mb-4">
            <Button variant="outline" onClick={() => refetchAreas()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Create Control Area
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5" />
                <span>Management Control Areas</span>
              </CardTitle>
              <CardDescription>Manage cost accounting and profitability analysis integration</CardDescription>
            </CardHeader>
            <CardContent>
              {areasLoading ? (<div className="text-center py-4">Loading...</div>) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area Code</TableHead>
                        <TableHead>Area Name</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Fiscal Year</TableHead>
                        <TableHead>Chart of Accounts</TableHead>
                        <TableHead>Operating Concern</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {controllingAreas.length > 0 ? (
                        controllingAreas.map((area: any) => (
                          <TableRow key={area.id}>
                            <TableCell className="font-medium">{area.area_code}</TableCell>
                            <TableCell>{area.area_name}</TableCell>
                            <TableCell>{area.currency_code || "-"}</TableCell>
                            <TableCell>{area.fiscal_year_variant_code || "-"}</TableCell>
                            <TableCell>{area.chart_of_accounts_code || "-"}</TableCell>
                            <TableCell>{area.operating_concern_code || "-"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${area.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {area.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(area)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(area.id)} title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={8} className="text-center py-4">No areas found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5" />
                <span>Company Code Assignments</span>
              </CardTitle>
              <CardDescription>Assign Company Codes to a Controlling Area. Configuration (Fiscal Year & Chart of Accounts) must match.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end justify-between border-b pb-4">
                  <div className="w-[300px]">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
                      Select Controlling Area
                    </label>
                    <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Area..." />
                      </SelectTrigger>
                      <SelectContent>
                        {controllingAreas.map((area: any) => (
                          <SelectItem key={area.id} value={area.id.toString()}>
                            {area.area_code} - {area.area_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAreaId && (
                    <div className="text-sm text-muted-foreground bg-slate-50 p-2 rounded border">
                      <strong>Config:</strong>
                      CoA: {selectedArea?.chart_of_accounts_code || 'N/A'},
                      FYV: {selectedArea?.fiscal_year_variant_code || 'N/A'}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      assignmentForm.setValue('controlling_area_id', parseInt(selectedAreaId!));
                      setAssignmentDialogOpen(true);
                    }}
                    disabled={!selectedAreaId}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Assign Company Code
                  </Button>
                </div>

                {!selectedAreaId ? (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Please select a Controlling Area to view or manage assignments.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Assigned At</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.length > 0 ? (
                          assignments.map((assignment: any) => (
                            <TableRow key={assignment.assignment_id}>
                              <TableCell className="font-medium">{assignment.company_code}</TableCell>
                              <TableCell>{assignment.company_name}</TableCell>
                              <TableCell>{assignment.city || "-"}</TableCell>
                              <TableCell>{assignment.currency}</TableCell>
                              <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteAssignmentMutation.mutate(assignment.assignment_id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              No company codes assigned to this area yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Control Area Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArea ? "Edit Management Control Area" : "Create Management Control Area"}</DialogTitle>
            <DialogDescription>Configure cost accounting integration settings</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="area_code" render={({ field }) => (
                  <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="CTRL001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="area_name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Main Area" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "NONE" ? undefined : v)} value={field.value || "NONE"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {currencies.map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="person_responsible" render={({ field }) => (
                  <FormItem><FormLabel>Person Responsible</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="operating_concern" render={({ field }) => (
                  <FormItem><FormLabel>Operating Concern</FormLabel><FormControl><Input placeholder="OC001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fiscal_year_variant" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Variant</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "NONE" ? undefined : v)} value={field.value || "NONE"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {fiscalYearVariants.map((v: any) => <SelectItem key={v.id} value={v.variant_id}>{v.variant_id} - {v.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="chart_of_accounts" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chart of Accounts</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "NONE" ? undefined : v)} value={field.value || "NONE"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {chartOfAccounts.map((c: any) => <SelectItem key={c.id} value={c.chart_id}>{c.chart_id} - {c.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="settlement_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Method</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "NONE" ? undefined : v)} value={field.value || "NONE"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {settlementMethods.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  {["actual_costing_enabled", "plan_costing_enabled", "variance_calculation", "price_calculation_control", "allocation_cycle_posting", "profit_center_accounting"].map((fieldName) => (
                    <FormField key={fieldName} control={form.control} name={fieldName as any} render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="capitalize">{fieldName.replace(/_/g, ' ')}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{editingArea ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Company Code</DialogTitle>
            <DialogDescription>
              Select a company code to assign to <strong>{selectedArea?.area_name}</strong>.
              <br />
              Only company codes with matching Chart of Accounts (<strong>{selectedArea?.chart_of_accounts_code}</strong>)
              and Fiscal Year Variant (<strong>{selectedArea?.fiscal_year_variant_code}</strong>) are shown.
            </DialogDescription>
          </DialogHeader>

          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="company_code_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Code</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Company Code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compatibleCompanyCodes.length > 0 ? (
                          compatibleCompanyCodes.map((cc: any) => (
                            <SelectItem key={cc.id} value={cc.id.toString()}>
                              {cc.code} - {cc.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No compatible company codes found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    {compatibleCompanyCodes.length === 0 && (
                      <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span>Ensure you have Company Codes configured with {selectedArea?.chart_of_accounts_code} and {selectedArea?.fiscal_year_variant_code}.</span>
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={compatibleCompanyCodes.length === 0}>Assign</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}