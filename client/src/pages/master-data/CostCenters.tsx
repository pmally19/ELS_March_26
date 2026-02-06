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
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Building2 } from "lucide-react";
import { useLocation } from "wouter";

const costCenterSchema = z.object({
  cost_center: z.string().min(1, "Cost center code is required").max(10, "Cost center code must be 10 characters or less"),
  description: z.string().min(1, "Description is required").max(100, "Description must be 100 characters or less"),
  cost_center_category: z.string().min(1, "Category is required").max(20, "Category must be 20 characters or less"),
  company_code: z.string().min(1, "Company code is required").max(4, "Company code must be 4 characters or less"),
  controlling_area: z.string().min(1, "Controlling area is required").max(10, "Controlling area must be 10 characters or less"),
  hierarchy_area: z.string().optional(),
  responsible_person: z.string().optional(),
  valid_from: z.string().min(1, "Valid from date is required"),
  valid_to: z.string().optional(),
  active: z.boolean().default(true)
});

type CostCenter = z.infer<typeof costCenterSchema> & { id: number };

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface ControllingArea {
  id: number;
  code: string;
  name: string;
  company_code_id: number;
  company_code?: string;
}

export default function CostCenters() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: costCenters = [], isLoading, refetch } = useQuery<CostCenter[]>({
    queryKey: ["/api/master-data/cost-center"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/master-data/cost-center");
      // Transform the response to match our expected format
      return response.map((center: any) => ({
        id: center.id,
        cost_center: center.cost_center,
        description: center.description,
        cost_center_category: center.cost_center_category,
        company_code: center.company_code,
        controlling_area: center.controlling_area,
        hierarchy_area: center.hierarchy_area,
        responsible_person: center.responsible_person,
        valid_from: center.valid_from,
        valid_to: center.valid_to,
        active: center.active
      }));
    },
  });

  // Fetch controlling areas
  const { data: controllingAreas = [], isLoading: isLoadingControllingAreas } = useQuery<ControllingArea[]>({
    queryKey: ["/api/controlling/controlling-areas"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/controlling/controlling-areas");
      return response.map((area: any) => ({
        id: area.id,
        code: area.code,
        name: area.name || area.code,
        company_code_id: area.company_code_id,
        company_code: area.company_code
      }));
    },
  });

  // Fetch company codes for display only
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

  const form = useForm<z.infer<typeof costCenterSchema>>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      cost_center: "",
      description: "",
      cost_center_category: "",
      company_code: "",
      controlling_area: "",
      hierarchy_area: "",
      responsible_person: "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: "",
      active: true
    },
  });

  // Handler for controlling area change - auto-fills company code
  const handleControllingAreaChange = (controllingAreaCode: string) => {
    form.setValue('controlling_area', controllingAreaCode);
    const selectedArea = controllingAreas.find(area => area.code === controllingAreaCode);
    if (selectedArea && selectedArea.company_code) {
      form.setValue('company_code', selectedArea.company_code);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof costCenterSchema>) => {
      return apiPost("/api/master-data/cost-center", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center"] });
      setOpen(false);
      setEditingCostCenter(null);
      form.reset({
        cost_center: "",
        description: "",
        cost_center_category: "",
        company_code: companyCodes.length > 0 ? companyCodes[0].code : "BM01",
        controlling_area: "A01",
        hierarchy_area: "",
        responsible_person: "",
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: "",
        active: true
      });
      toast({ title: "Success", description: "Cost center created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create cost center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof costCenterSchema>) => {
      return apiPut(`/api/master-data/cost-center/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center"] });
      setOpen(false);
      setEditingCostCenter(null);
      form.reset({
        cost_center: "",
        description: "",
        cost_center_category: "",
        company_code: companyCodes.length > 0 ? companyCodes[0].code : "BM01",
        controlling_area: "A01",
        hierarchy_area: "",
        responsible_person: "",
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: "",
        active: true
      });
      toast({ title: "Success", description: "Cost center updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update cost center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/master-data/cost-center/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center"] });
      toast({ title: "Success", description: "Cost center deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete cost center";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: z.infer<typeof costCenterSchema>) => {
    if (editingCostCenter) {
      updateMutation.mutate({ id: editingCostCenter.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    form.reset({
      cost_center: costCenter.cost_center,
      description: costCenter.description,
      cost_center_category: costCenter.cost_center_category,
      company_code: costCenter.company_code,
      controlling_area: costCenter.controlling_area,
      hierarchy_area: costCenter.hierarchy_area || "",
      responsible_person: costCenter.responsible_person || "",
      valid_from: costCenter.valid_from,
      valid_to: costCenter.valid_to || "",
      active: costCenter.active
    });
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingCostCenter(null);
    form.reset({
      cost_center: "",
      description: "",
      cost_center_category: "",
      company_code: companyCodes.length > 0 ? companyCodes[0].code : "BM01",
      controlling_area: "A01",
      hierarchy_area: "",
      responsible_person: "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: "",
      active: true
    });
    setOpen(true);
  };

  // Update form default values when company codes are loaded
  useEffect(() => {
    if (companyCodes.length > 0 && !editingCostCenter) {
      form.setValue('company_code', companyCodes[0].code);
    }
  }, [companyCodes, editingCostCenter, form]);

  // Fetch cost center categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<any[]>({
    queryKey: ["/api/master-data/cost-center-categories"],
    queryFn: async () => {
      const response = await apiGet<any[]>("/api/master-data/cost-center-categories");
      return response;
    },
  });

  const getStatusBadgeClass = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getCategoryBadgeClass = (category: string) => {
    // improved mapping for new single-letter codes + legacy support
    const upper = category.toUpperCase();
    if (upper === 'PRODUCTION' || upper === 'F') return 'bg-blue-100 text-blue-800';
    if (upper === 'ADMINISTRATION' || upper === 'W') return 'bg-purple-100 text-purple-800';
    if (upper === 'SALES' || upper === 'V') return 'bg-green-100 text-green-800';
    if (upper === 'RESEARCH' || upper === 'E') return 'bg-yellow-100 text-yellow-800';
    if (upper === 'LOGISTICS' || upper === 'L') return 'bg-orange-100 text-orange-800';
    if (upper === 'QUALITY') return 'bg-pink-100 text-pink-800';
    if (upper === 'H') return 'bg-indigo-100 text-indigo-800'; // Auxiliary
    return 'bg-gray-100 text-gray-800';
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
            <h1 className="text-3xl font-bold tracking-tight">Cost Centers</h1>
            <p className="text-muted-foreground">Manage organizational cost assignment units</p>
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
                New Cost Center
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCostCenter ? "Edit Cost Center" : "Create Cost Center"}
                </DialogTitle>
                <DialogDescription>
                  Configure cost center settings and organizational assignment
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost_center"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Center Code</FormLabel>
                          <FormControl>
                            <Input placeholder="CC1001" {...field} />
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
                            <Input placeholder="Manufacturing Operations" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost_center_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCategories ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : categories.length === 0 ? (
                                <SelectItem value="none" disabled>No categories defined</SelectItem>
                              ) : (
                                categories.map((category) => (
                                  <SelectItem key={category.id} value={category.code}>
                                    {category.name} ({category.code})
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
                          <FormLabel>Controlling Area *</FormLabel>
                          <Select
                            onValueChange={handleControllingAreaChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select controlling area" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingControllingAreas ? (
                                <SelectItem value="loading" disabled>Loading controlling areas...</SelectItem>
                              ) : controllingAreas.length === 0 ? (
                                <SelectItem value="none" disabled>No controlling areas available</SelectItem>
                              ) : (
                                controllingAreas.map((area) => (
                                  <SelectItem key={area.id} value={area.code}>
                                    {area.code} - {area.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code (Auto-filled)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              disabled
                              placeholder="Auto-filled from controlling area"
                              className="bg-muted"
                            />
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
                      name="responsible_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsible Person</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

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
                          {editingCostCenter ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingCostCenter ? "Update" : "Create"} Cost Center
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
            <Building2 className="h-5 w-5" />
            <span>Cost Centers</span>
          </CardTitle>
          <CardDescription>
            Manage organizational cost assignment units and cost center definitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading cost centers...</p>
            </div>
          ) : (costCenters as CostCenter[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">No cost centers found</p>
              <p className="text-sm">Create your first cost center to get started with organizational cost management.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(costCenters as CostCenter[]).map((center: CostCenter) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.id}</TableCell>
                    <TableCell className="font-medium">{center.cost_center}</TableCell>
                    <TableCell>{center.description}</TableCell>
                    <TableCell>{center.company_code}</TableCell>
                    <TableCell>{center.responsible_person || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeClass(center.cost_center_category)}`}>
                        {center.cost_center_category}
                      </span>
                    </TableCell>
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
                                This action cannot be undone. This will permanently delete the cost center "{center.cost_center} - {center.description}".
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
}