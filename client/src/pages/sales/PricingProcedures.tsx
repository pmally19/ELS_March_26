import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Plus, Trash2, Calculator, Eye, Info, ChevronDown, ChevronRight, ListFilter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const procedureSchema = z.object({
  procedure_code: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, "Only uppercase letters and numbers"),
  procedure_name: z.string().min(3).max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const conditionStepSchema = z.object({
  counter: z.coerce.number().optional(),
  condition_type_code: z.string().optional(), // Optional for subtotal steps
  description: z.string().optional(),
  step_number: z.coerce.number().min(1, "Step number must be positive"),
  is_mandatory: z.boolean().default(false),
  account_key: z.string().optional(),
  // New ERP-compatible fields
  from_step: z.union([z.string(), z.number()]).optional().transform(v => v === "" || v === 0 || Number.isNaN(Number(v)) ? null : Number(v)),
  to_step: z.union([z.string(), z.number()]).optional().transform(v => v === "" || v === 0 || Number.isNaN(Number(v)) ? null : Number(v)),
  requirement: z.string().optional(),
  is_statistical: z.boolean().default(false),
  is_printable: z.boolean().default(true),
  is_subtotal: z.boolean().default(false),
  manual_entry: z.boolean().default(false),
  comments: z.string().optional(),
  accrual_key: z.string().optional()
});

type Procedure = z.infer<typeof procedureSchema> & {
  id?: number;
  steps?: any[];
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
  _tenantId?: string;
  _deletedAt?: string;
};

type ConditionStep = z.infer<typeof conditionStepSchema> & {
  id?: number;
  procedure_id?: number;
  condition_name?: string;
};

export default function PricingProcedures() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [viewingProcedure, setViewingProcedure] = useState<Procedure | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<Procedure>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      procedure_code: "",
      procedure_name: "",
      description: "",
      is_active: true
    }
  });

  // Fetch pricing procedures
  const { data: procedures, isLoading } = useQuery<Procedure[]>({
    queryKey: ['/api/pricing-procedures'],
  });

  // Fetch condition types for steps
  const { data: conditionTypes } = useQuery<any[]>({
    queryKey: ['/api/condition-types'],
  });

  // Fetch account keys for dropdown
  const { data: accountKeys } = useQuery<any[]>({
    queryKey: ['/api/master-data/account-keys'],
    queryFn: () => apiRequest('/api/master-data/account-keys').then(res => res.json()),
  });



  // Create/Update procedure mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: Procedure) => {
      if (editingProcedure?.id) {
        return apiRequest(`/api/pricing-procedures/${editingProcedure.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest('/api/pricing-procedures', {
          method: 'POST',
          body: JSON.stringify({ ...data }), // Removed company_code hardcoding
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures'] });
      setIsDialogOpen(false);
      setEditingProcedure(null);
      form.reset();
      toast({
        title: "Success",
        description: `Pricing procedure ${editingProcedure ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save pricing procedure",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Procedure) => {
    createUpdateMutation.mutate(data);
  };

  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    form.reset(procedure);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProcedure(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleViewDetails = (procedure: Procedure) => {
    setViewingProcedure(procedure);
    setShowViewDialog(true);
    setAdminDataOpen(false);
  };

  // Standard MallyERP procedures
  const standardProcedures = [
    {
      code: "MALLSTD01",
      name: "Standard Sales Pricing",
      description: "Standard pricing for normal sales orders",
      steps: [
        { step: 10, code: "STD1", name: "Standard Base Price", base: "gross", mandatory: true },
        { step: 20, code: "CDIS01", name: "Customer Group Discount", base: "net", mandatory: false },
        { step: 30, code: "CDIS02", name: "Volume Discount", base: "net", mandatory: false },
        { step: 40, code: "FEE01", name: "Freight Charges", base: "net", mandatory: false },
        { step: 90, code: "TAX01", name: "Sales Tax", base: "net", mandatory: true }
      ]
    },
    {
      code: "MALLRET01",
      name: "Retail Pricing",
      description: "Pricing for retail customers with loyalty discounts",
      steps: [
        { step: 10, code: "STD1", name: "Standard Base Price", base: "gross", mandatory: true },
        { step: 20, code: "CDIS04", name: "Loyalty Discount", base: "net", mandatory: false },
        { step: 30, code: "MDIS02", name: "Seasonal Discount", base: "net", mandatory: false },
        { step: 50, code: "FEE02", name: "Packaging Fee", base: "net", mandatory: false },
        { step: 90, code: "TAX01", name: "Sales Tax", base: "net", mandatory: true }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Pricing Procedures</h1>
            <p className="text-muted-foreground">Configure sequence and calculation logic for condition types</p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Procedure
        </Button>
      </div>

      {/* Standard Procedures Overview */}
      <Card>
        <CardHeader>
          <CardTitle>MallyERP Standard Procedures</CardTitle>
          <CardDescription>
            Pre-configured pricing procedures following MallyERP best practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {standardProcedures.map((procedure) => (
              <Card key={procedure.code}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{procedure.code}</CardTitle>
                      <p className="text-sm font-medium">{procedure.name}</p>
                      <p className="text-xs text-muted-foreground">{procedure.description}</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {procedure.steps.map((step) => (
                      <div key={step.step} className="flex items-center justify-between text-sm p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{step.step}</span>
                          <span className="font-medium">{step.code}</span>
                          <span className="text-muted-foreground">{step.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={step.mandatory ? "default" : "secondary"} className="text-xs">
                            {step.mandatory ? "Required" : "Optional"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Procedures List */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Procedures</CardTitle>
          <CardDescription>
            Company-specific pricing procedures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading procedures...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No custom procedures configured. Create your first procedure above.
                    </TableCell>
                  </TableRow>
                ) : (
                  procedures?.map((procedure: Procedure) => (
                    <TableRow key={procedure.id}>
                      <TableCell className="font-mono">{procedure.procedure_code}</TableCell>
                      <TableCell className="font-medium">{procedure.procedure_name}</TableCell>
                      <TableCell>{procedure.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{procedure.steps?.length || 0} steps</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={procedure.is_active ? "default" : "secondary"}>
                          {procedure.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(procedure)} title="View Details">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(procedure)} title="Edit">
                            <Edit className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedProcedure(procedure.procedure_code);
                            setShowStepDialog(true);
                          }}>
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Sales Pricing Procedure Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about {viewingProcedure?.procedure_code}
            </DialogDescription>
          </DialogHeader>

          {viewingProcedure && (
            <div className="flex-1 overflow-y-auto space-y-6 p-6 pt-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ListFilter className="h-4 w-4 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Procedure Code</dt>
                      <dd className="text-lg font-mono font-bold text-gray-900">{viewingProcedure.procedure_code}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <Badge variant={viewingProcedure.is_active ? "default" : "secondary"}>
                          {viewingProcedure.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{viewingProcedure.procedure_name}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="text-sm text-gray-900">{viewingProcedure.description || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Number of Steps</dt>
                      <dd className="text-sm text-gray-900">{viewingProcedure.steps?.length || 0} configured rules</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* ── Administrative Data (SAP ECC style) ────────────────── */}
              <div className="border rounded-md overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setAdminDataOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    Administrative Data
                  </span>
                  {adminDataOpen
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {adminDataOpen && (
                  <dl className="px-4 py-3 space-y-2 bg-white">
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingProcedure.created_at
                          ? new Date(viewingProcedure.created_at).toLocaleString()
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingProcedure.created_by ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingProcedure.updated_at
                          ? new Date(viewingProcedure.updated_at).toLocaleString()
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingProcedure.updated_by ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Tenant ID</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingProcedure._tenantId ?? '—'}
                      </dd>
                    </div>
                    {viewingProcedure._deletedAt && (
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-red-500 font-medium">Deleted on</dt>
                        <dd className="text-xs text-red-500 font-medium">
                          {new Date(viewingProcedure._deletedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>
          )}
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProcedure ? 'Edit Pricing Procedure' : 'Create Pricing Procedure'}
            </DialogTitle>
            <DialogDescription>
              Configure a new pricing procedure with condition type sequence
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="procedure_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Procedure Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="procedure_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Procedure Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUpdateMutation.isPending}>
                  {createUpdateMutation.isPending ? 'Saving...' : 'Save Procedure'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Step Manager Dialog */}
      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Steps: {selectedProcedure}</DialogTitle>
            <DialogDescription>
              Configure calculation steps for this pricing procedure
            </DialogDescription>
          </DialogHeader>

          <StepManager
            procedureCode={selectedProcedure}
            procedureId={procedures?.find(p => p.procedure_code === selectedProcedure)?.id}
            conditionTypes={conditionTypes || []}
            accountKeys={accountKeys || []}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for managing steps
function StepManager({ procedureCode, procedureId, conditionTypes, accountKeys }: { procedureCode: string, procedureId?: number, conditionTypes: any[], accountKeys: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingStep, setEditingStep] = useState<ConditionStep | null>(null);

  // ID is now passed as prop


  // Form schema for Steps
  const stepFormSchema = z.object({
    condition_type_code: z.string().optional(), // Made optional for subtotal steps
    step_number: z.coerce.number().min(1, "Step number must be positive"),
    is_mandatory: z.boolean().default(false),
    account_key: z.string().optional(),
    // New ERP-compatible fields
    from_step: z.union([z.string(), z.number()]).optional().transform(v => v === "" || v === 0 || Number.isNaN(Number(v)) ? null : Number(v)),
    to_step: z.union([z.string(), z.number()]).optional().transform(v => v === "" || v === 0 || Number.isNaN(Number(v)) ? null : Number(v)),
    requirement: z.string().optional(),
    is_statistical: z.boolean().default(false),
    is_printable: z.boolean().default(true),
    is_subtotal: z.boolean().default(false),
    manual_entry: z.boolean().default(false),
    accrual_key: z.string().optional()
  }).refine(
    (data) => {
      // If is_subtotal is false, condition_type_code is required (Standard Step)
      if (!data.is_subtotal) {
        return !!data.condition_type_code && data.condition_type_code.length > 0;
      }
      // If is_subtotal is true, we allow empty condition type and empty From/To (implies sum all above)
      return true;
    },
    {
      message: "Regular steps require a Condition Type",
      path: ["condition_type_code"]
    }
  );

  const stepForm = useForm<ConditionStep>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      step_number: 10,
      is_mandatory: false,
      account_key: "",
      is_statistical: false,
      is_printable: true,
      is_subtotal: false,
      manual_entry: false
    }
  });

  // Fetch procedure steps
  // Fetch procedure steps
  const { data: steps = [], isLoading } = useQuery<ConditionStep[]>({
    queryKey: ['/api/pricing-procedures', procedureId, 'steps'],
    queryFn: () => apiRequest(`/api/pricing-procedures/${procedureId}/steps`).then(res => res.json()),
    enabled: !!procedureId,
    refetchOnMount: true
  });

  // Create Step Mutation
  const createStepMutation = useMutation({
    mutationFn: async (data: ConditionStep) => {
      return apiRequest(`/api/pricing-procedures/${procedureId}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      stepForm.reset();
      toast({ title: "Success", description: "Step added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures', procedureId, 'steps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures'] });
    }
  });

  // Update Step Mutation
  const updateStepMutation = useMutation({
    mutationFn: async (data: ConditionStep) => {
      if (!editingStep?.id) throw new Error("No step selected for update");
      return apiRequest(`/api/pricing-procedures/steps/${editingStep.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setEditingStep(null);
      stepForm.reset();
      toast({ title: "Success", description: "Step updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures', procedureId, 'steps'] });
    }
  });

  // Delete Step Mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      return apiRequest(`/api/pricing-procedures/steps/${stepId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Step deleted successfully" });
    },
    onError: (error: any) => {
      // If 404, it's already gone, so just suppress the error toast or show info
      if (error.message.includes("404") || error.message.includes("not found")) {
        toast({ title: "Info", description: "Step was already deleted" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures', procedureId, 'steps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-procedures'] });
    }
  });

  const onSubmit = (data: ConditionStep) => {
    if (editingStep) {
      updateStepMutation.mutate(data);
    } else {
      createStepMutation.mutate(data);
    }
  };

  const startEdit = (step: any) => {
    setEditingStep(step);
    stepForm.reset({
      condition_type_code: step.condition_type_code,
      step_number: step.step_number,
      is_mandatory: step.is_mandatory,
      account_key: step.account_key || "",
      from_step: step.from_step,
      to_step: step.to_step,
      requirement: step.requirement || "",
      is_statistical: step.is_statistical || false,
      is_printable: step.is_printable !== false,
      is_subtotal: step.is_subtotal || false,
      manual_entry: step.manual_entry || false,
      accrual_key: step.accrual_key || ""
    });
  };

  const cancelEdit = () => {
    setEditingStep(null);
    stepForm.reset();
  };

  return (
    <div className="space-y-6">
      <div className="border-2 p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">📝</span>
          {editingStep ? "Edit Step" : "Add New Step"}
        </h3>
        <Form {...stepForm}>
          <form onSubmit={stepForm.handleSubmit(onSubmit)} className="space-y-4">
            {/* Main Single Row / Grid Layout */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Row 1: Core Fields (Counter, Step, Type, Desc) */}
                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="counter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Count</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Auto" className="h-9 px-2 text-center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="step_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Step No.</FormLabel>
                        <FormControl>
                          <Input type="number" className="h-9 px-2 text-center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <FormField
                    control={stepForm.control}
                    name="condition_type_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Condtion Type</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            const value = val === "none" ? "" : val;
                            field.onChange(value);
                            const selectedType = conditionTypes.find((ct: any) => ct.condition_code === value);
                            const currentDesc = stepForm.getValues("description");
                            if (selectedType && !currentDesc) {
                              stepForm.setValue("description", selectedType.condition_name);
                            }
                          }}
                          value={field.value || "none"} // Bind to 'none' if empty
                          disabled={!!editingStep}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">_None_</SelectItem>
                            {conditionTypes.map((ct: any) => (
                              <SelectItem key={ct.condition_code} value={ct.condition_code}>
                                {ct.condition_code} - {ct.condition_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={stepForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" className="h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* From/To */}
                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="from_step"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">From</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" className="h-9 px-2 text-center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="to_step"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">To</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" className="h-9 px-2 text-center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>



                <div className="col-span-2">
                  <FormField
                    control={stepForm.control}
                    name="account_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Account Key</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Key" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">_None_</SelectItem> {/* Special value to clear selection */}
                            {accountKeys?.map((ak: any) => (
                              <SelectItem key={ak.code} value={ak.code}>
                                {ak.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

              </div>

              {/* Row 2: Secondary Fields & Flags */}
              <div className="grid grid-cols-12 gap-3 items-end pt-2">
                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="is_subtotal"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center justify-end h-full md:pb-2">
                        <FormLabel className="text-xs mb-2">SubTotal</FormLabel>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="is_statistical"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center justify-end h-full md:pb-2">
                        <FormLabel className="text-xs mb-2">Statistical</FormLabel>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="is_printable"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center justify-end h-full md:pb-2">
                        <FormLabel className="text-xs mb-2">Print</FormLabel>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1">
                  <FormField
                    control={stepForm.control}
                    name="manual_entry"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center justify-end h-full md:pb-2">
                        <FormLabel className="text-xs mb-2">Manual</FormLabel>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <FormField
                    control={stepForm.control}
                    name="requirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Requirement</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Code" className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={stepForm.control}
                    name="accrual_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Accrual Key</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Key" className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-5">
                  <FormField
                    control={stepForm.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Comments</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Notes..." className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <FormField
                control={stepForm.control}
                name="is_mandatory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <FormLabel>Mandatory Step</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                {editingStep && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                )}
                <Button type="submit" size="sm">
                  {editingStep ? "Update Step" : "Add Step"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Cntr</TableHead>
              <TableHead className="w-[50px]">Step</TableHead>
              <TableHead>Cond Type</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-[60px]">From</TableHead>
              <TableHead className="w-[60px]">To</TableHead>
              <TableHead className="w-[60px]">Manual</TableHead>
              <TableHead className="w-[80px]">Key</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">Loading steps...</TableCell>
              </TableRow>
            ) : steps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">No steps defined yet.</TableCell>
              </TableRow>
            ) : (
              steps.map((step: any) => (
                <TableRow key={step.id}>
                  <TableCell className="font-mono text-center">{step.counter}</TableCell>
                  <TableCell className="font-mono">{step.step_number}</TableCell>
                  <TableCell className="font-semibold">{step.condition_type_code}</TableCell>
                  <TableCell>{step.description || step.condition_name}</TableCell>
                  <TableCell className="font-mono">{step.from_step || ''}</TableCell>
                  <TableCell className="font-mono">{step.to_step || ''}</TableCell>
                  <TableCell className="text-center">{step.manual_entry ? "X" : ""}</TableCell>
                  <TableCell className="font-mono">{step.account_key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{step.comments}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(step)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteStepMutation.mutate(step.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div >
  );
}