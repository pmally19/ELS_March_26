import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";

const profitCenterSchema = z.object({
  // Core fields
  code: z.string().min(1, "Profit center code is required").max(10, "Profit center code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),

  // Database original fields
  profit_center: z.string().min(1, "Profit center is required").max(10, "Profit center must be 10 characters or less"),
  profit_center_group: z.string().optional(),
  company_code: z.string().min(1, "Company code is required").max(4, "Company code must be 4 characters or less"),
  controlling_area: z.string().min(1, "Controlling area is required").max(4, "Controlling area must be 4 characters or less"),
  segment: z.string().optional(),
  hierarchy_area: z.string().optional(),
  responsible_person: z.string().optional(),
  valid_from: z.string().min(1, "Valid from date is required"),
  valid_to: z.string().optional(),

  // Additional fields
  company_code_id: z.number().min(1, "Company code ID is required"),
  plant_id: z.number().optional(),
  responsible_person_id: z.number().optional(),
  person_responsible: z.string().optional(),
  cost_center_id: z.number().optional(),
  active: z.boolean().default(true)
});

type ProfitCenter = z.infer<typeof profitCenterSchema> & { id: number };

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface CostCenter {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export default function ProfitCenters() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingProfitCenter, setEditingProfitCenter] = useState<ProfitCenter | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profitCenters = [], isLoading, refetch } = useQuery<ProfitCenter[]>({
    queryKey: ["/api/master-data/profit-center"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/master-data/profit-center");
      // Transform the response to match our expected format
      return response.map((center: any) => ({
        id: center.id,
        // Core fields
        code: center.code || center.profit_center || "",
        name: center.name || center.description || "",
        description: center.description || center.name || "",

        // Database original fields
        profit_center: center.profit_center || center.code || "",
        profit_center_group: center.profit_center_group || "",
        company_code: center.company_code || "",
        controlling_area: center.controlling_area || "",
        segment: center.segment || "",
        hierarchy_area: center.hierarchy_area || "",
        responsible_person: center.responsible_person || "",
        valid_from: center.valid_from || new Date().toISOString().split('T')[0],
        valid_to: center.valid_to || "",

        // Additional fields
        company_code_id: center.company_code_id || 1,
        plant_id: center.plant_id,
        responsible_person_id: center.responsible_person_id,
        person_responsible: center.person_responsible || center.responsible_person || "",
        cost_center_id: center.cost_center_id,
        active: center.active !== false
      }));
    },
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [], isLoading: isLoadingCompanyCodes } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/master-data/company-code");
      return response.map((code: any) => ({
        id: code.id,
        code: code.code,
        name: code.name || code.code,
        description: code.description
      }));
    },
  });

  // Fetch cost centers for dropdown
  const { data: costCenters = [], isLoading: isLoadingCostCenters } = useQuery<(CostCenter & { company_code_id?: number })[]>({
    queryKey: ["/api/master-data/cost-center"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/master-data/cost-center");
      return response.map((center: any) => ({
        id: center.id,
        code: center.cost_center || center.code || "",
        name: center.description || center.name || "",
        description: center.description,
        company_code_id: center.company_code_id
      }));
    },
  });

  const form = useForm<z.infer<typeof profitCenterSchema>>({
    resolver: zodResolver(profitCenterSchema),
    defaultValues: {
      // Core fields
      code: "",
      name: "",
      description: "",

      // Database original fields
      profit_center: "",
      profit_center_group: "",
      company_code: companyCodes.length > 0 ? companyCodes[0].code : "",
      controlling_area: "",
      segment: "",
      hierarchy_area: "",
      responsible_person: "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: "",

      // Additional fields
      company_code_id: companyCodes.length > 0 ? companyCodes[0].id : undefined,
      plant_id: undefined,
      responsible_person_id: undefined,
      person_responsible: "",
      cost_center_id: undefined,
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof profitCenterSchema>) => {
      return apiPost("/api/master-data/profit-center", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/profit-center"] });
      setOpen(false);
      setEditingProfitCenter(null);
      form.reset({
        // Core fields
        code: "",
        name: "",
        description: "",

        // Database original fields
        profit_center: "",
        profit_center_group: "",
        company_code: companyCodes.length > 0 ? companyCodes[0].code : "",
        controlling_area: "",
        segment: "",
        hierarchy_area: "",
        responsible_person: "",
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: "",

        // Additional fields
        company_code_id: companyCodes.length > 0 ? companyCodes[0].id : undefined,
        plant_id: undefined,
        responsible_person_id: undefined,
        person_responsible: "",
        cost_center_id: undefined,
        active: true
      });
      toast({ title: "Success", description: "Profit center created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create profit center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof profitCenterSchema>) => {
      return apiPut(`/api/master-data/profit-center/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/profit-center"] });
      setOpen(false);
      setEditingProfitCenter(null);
      form.reset({
        // Core fields
        code: "",
        name: "",
        description: "",

        // Database original fields
        profit_center: "",
        profit_center_group: "",
        company_code: companyCodes.length > 0 ? companyCodes[0].code : "",
        controlling_area: "",
        segment: "",
        hierarchy_area: "",
        responsible_person: "",
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: "",

        // Additional fields
        company_code_id: companyCodes.length > 0 ? companyCodes[0].id : undefined,
        plant_id: undefined,
        responsible_person_id: undefined,
        person_responsible: "",
        cost_center_id: undefined,
        active: true
      });
      toast({ title: "Success", description: "Profit center updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update profit center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/master-data/profit-center/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/profit-center"] });
      toast({ title: "Success", description: "Profit center deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete profit center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: z.infer<typeof profitCenterSchema>) => {
    if (editingProfitCenter) {
      updateMutation.mutate({ id: editingProfitCenter.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (profitCenter: ProfitCenter) => {
    setEditingProfitCenter(profitCenter);
    form.reset({
      // Core fields
      code: profitCenter.code,
      name: profitCenter.name,
      description: profitCenter.description,

      // Database original fields
      profit_center: profitCenter.profit_center,
      profit_center_group: profitCenter.profit_center_group || "",
      company_code: profitCenter.company_code,
      controlling_area: profitCenter.controlling_area,
      segment: profitCenter.segment || "",
      hierarchy_area: profitCenter.hierarchy_area || "",
      responsible_person: profitCenter.responsible_person || "",
      valid_from: profitCenter.valid_from,
      valid_to: profitCenter.valid_to || "",

      // Additional fields
      company_code_id: profitCenter.company_code_id,
      plant_id: profitCenter.plant_id,
      responsible_person_id: profitCenter.responsible_person_id,
      person_responsible: profitCenter.person_responsible || "",
      cost_center_id: profitCenter.cost_center_id,
      active: profitCenter.active
    });
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingProfitCenter(null);
    form.reset({
      code: "",
      name: "",
      description: "",
      company_code_id: companyCodes.length > 0 ? companyCodes[0].id : 1,
      person_responsible: "",
      cost_center_id: undefined,
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: "",
      active: true
    });
    setOpen(true);
  };

  // Update form default values when company codes are loaded
  useEffect(() => {
    if (companyCodes.length > 0 && !editingProfitCenter) {
      form.setValue('company_code_id', companyCodes[0].id);
    }
  }, [companyCodes, editingProfitCenter, form]);

  const getStatusBadgeClass = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profit Centers</h1>
            <p className="text-muted-foreground">Manage profit accountability units</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Profit Center
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProfitCenter ? "Edit Profit Center" : "Create Profit Center"}
                </DialogTitle>
                <DialogDescription>
                  Configure profit center settings and organizational assignment
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profit Center Code</FormLabel>
                          <FormControl>
                            <Input placeholder="PC1001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profit_center"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profit Center (DB)</FormLabel>
                          <FormControl>
                            <Input placeholder="PC1001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="North America Sales" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profit_center_group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profit Center Group</FormLabel>
                          <FormControl>
                            <Input placeholder="SALES" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="North America Sales Profit Center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Also update company_code_id when company code changes
                              const selectedCode = companyCodes.find(cc => cc.code === value);
                              if (selectedCode) {
                                form.setValue('company_code_id', selectedCode.id);
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCompanyCodes ? (
                                <SelectItem value="loading" disabled>Loading company codes...</SelectItem>
                              ) : companyCodes.length === 0 ? (
                                <SelectItem value="none" disabled>No company codes available</SelectItem>
                              ) : (
                                companyCodes.map((code) => (
                                  <SelectItem key={code.id} value={code.code}>
                                    {code.code} - {code.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="controlling_area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Controlling Area</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter controlling area" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="segment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segment</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hierarchy_area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hierarchy Area</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plant ID (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Optional"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_code_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code ID (Auto-filled)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Auto-filled from Company Code"
                              {...field}
                              value={field.value || ''}
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsible Person (DB)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="person_responsible"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Person Responsible</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible_person_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsible Person ID (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Optional"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost_center_id"
                      render={({ field }) => {
                        // Filter cost centers by selected company code
                        const selectedCompanyCodeId = form.watch('company_code_id');
                        const filteredCostCenters = costCenters.filter(center =>
                          !selectedCompanyCodeId || center.company_code_id === selectedCompanyCodeId
                        );

                        return (
                          <FormItem>
                            <FormLabel>Cost Center (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : Number(value))} defaultValue={field.value?.toString() || "none"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cost center" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {isLoadingCostCenters ? (
                                  <SelectItem value="loading" disabled>Loading cost centers...</SelectItem>
                                ) : filteredCostCenters.length === 0 ? (
                                  <SelectItem value="empty" disabled>
                                    {selectedCompanyCodeId
                                      ? "No cost centers for this company code"
                                      : "No cost centers available"}
                                  </SelectItem>
                                ) : (
                                  filteredCostCenters.map((center) => (
                                    <SelectItem key={center.id} value={center.id.toString()}>
                                      {center.code} - {center.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valid_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valid_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid To (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {editingProfitCenter ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingProfitCenter ? "Update" : "Create"} Profit Center
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart2 className="h-5 w-5" />
            <span>Profit Centers</span>
          </CardTitle>
          <CardDescription>
            Manage profit accountability units and profit center definitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading profit centers...</p>
            </div>
          ) : (profitCenters as ProfitCenter[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">No profit centers found</p>
              <p className="text-sm">Create your first profit center to get started with profit accountability management.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profitCenters as ProfitCenter[]).map((center: ProfitCenter) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.id}</TableCell>
                    <TableCell className="font-medium">{center.code}</TableCell>
                    <TableCell>{center.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{center.description}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {center.profit_center_group || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{center.company_code}</TableCell>
                    <TableCell>{center.person_responsible || center.responsible_person || 'N/A'}</TableCell>
                    <TableCell>{center.segment || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(center.active)}`}>
                        {center.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(center)}
                          disabled={deleteMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the profit center "{center.code} - {center.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(center.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
