import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the DepreciationMethod type
type DepreciationMethod = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  calculation_type: string;
  base_value_type: string;
  depreciation_rate?: number | null;
  useful_life_years?: number | null;
  residual_value_percent?: number | null;
  supports_partial_periods: boolean;
  time_basis: string;
  method_switching_allowed: boolean;
  company_code_id?: number | null;
  applicable_to_asset_class?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  company_code?: string | null;
  company_name?: string | null;
};

// Company Code type
type CompanyCode = {
  id: number;
  code: string;
  name: string;
  active?: boolean;
};

// Form validation schema
const depreciationMethodSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional().nullable(),
  calculation_type: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION", "SUM_OF_YEARS", "CUSTOM"], {
    required_error: "Calculation type is required"
  }),
  base_value_type: z.enum(["ACQUISITION_COST", "CURRENT_VALUE", "REPLACEMENT_COST", "FAIR_VALUE"], {
    required_error: "Base value type is required"
  }),
  depreciation_rate: z.number().min(0).max(100).optional().nullable(),
  useful_life_years: z.number().int().min(1).optional().nullable(),
  residual_value_percent: z.number().min(0).max(100).optional().nullable(),
  supports_partial_periods: z.boolean().default(true),
  time_basis: z.enum(["DAILY", "MONTHLY", "ANNUAL"]).default("MONTHLY"),
  method_switching_allowed: z.boolean().default(false),
  company_code_id: z.number().optional().nullable(),
  applicable_to_asset_class: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type DepreciationMethodFormValues = z.infer<typeof depreciationMethodSchema>;

export default function DepreciationMethods() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<DepreciationMethod | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch depreciation methods
  const { data: methods = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/depreciation-methods'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/depreciation-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch depreciation methods');
      }
      return response.json() as Promise<DepreciationMethod[]>;
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/company-codes');
      if (!response.ok) {
        throw new Error('Failed to fetch company codes');
      }
      return response.json() as Promise<CompanyCode[]>;
    },
  });

  // Fetch dropdown options to avoid hardcoded lists
  const { data: methodOptions = { calculationTypes: [], baseValueTypes: [], timeBases: [] } } = useQuery({
    queryKey: ['/api/master-data/depreciation-methods/options'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/depreciation-methods/options');
      if (!response.ok) {
        throw new Error('Failed to fetch depreciation method options');
      }
      return response.json() as Promise<{
        calculationTypes: string[];
        baseValueTypes: string[];
        timeBases: string[];
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter methods based on search query
  const filteredMethods = methods.filter(method => {
    const query = searchQuery.toLowerCase();
    return (
      method.code.toLowerCase().includes(query) ||
      method.name.toLowerCase().includes(query) ||
      method.calculation_type.toLowerCase().includes(query) ||
      (method.company_code || '').toLowerCase().includes(query)
    );
  });

  // Form setup
  const form = useForm<DepreciationMethodFormValues>({
    resolver: zodResolver(depreciationMethodSchema),
    defaultValues: {
      code: "",
      name: "",
      description: null,
      calculation_type: "STRAIGHT_LINE",
      base_value_type: "ACQUISITION_COST",
      depreciation_rate: null,
      useful_life_years: null,
      residual_value_percent: 0,
      supports_partial_periods: true,
      time_basis: "MONTHLY",
      method_switching_allowed: false,
      company_code_id: null,
      applicable_to_asset_class: null,
      is_active: true,
      is_default: false,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DepreciationMethodFormValues) => {
      const response = await fetch('/api/master-data/depreciation-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create depreciation method');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/depreciation-methods'] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Depreciation method created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DepreciationMethodFormValues> }) => {
      const response = await fetch(`/api/master-data/depreciation-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update depreciation method');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/depreciation-methods'] });
      setShowDialog(false);
      setEditingMethod(null);
      form.reset();
      toast({
        title: "Success",
        description: "Depreciation method updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/depreciation-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete depreciation method');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/depreciation-methods'] });
      toast({
        title: "Success",
        description: "Depreciation method deactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (method: DepreciationMethod) => {
    setEditingMethod(method);
    form.reset({
      code: method.code,
      name: method.name,
      description: method.description || null,
      calculation_type: method.calculation_type as any,
      base_value_type: method.base_value_type as any,
      depreciation_rate: method.depreciation_rate || null,
      useful_life_years: method.useful_life_years || null,
      residual_value_percent: method.residual_value_percent || 0,
      supports_partial_periods: method.supports_partial_periods,
      time_basis: method.time_basis as any,
      method_switching_allowed: method.method_switching_allowed,
      company_code_id: method.company_code_id || null,
      applicable_to_asset_class: method.applicable_to_asset_class || null,
      is_active: method.is_active,
      is_default: method.is_default,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this depreciation method?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: DepreciationMethodFormValues) => {
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNew = () => {
    setEditingMethod(null);
    form.reset();
    setShowDialog(true);
  };

  const getCalculationTypeLabel = (type: string) => {
    return type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : type;
  };

  const getBaseValueTypeLabel = (type: string) => {
    return type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : type;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Depreciation Methods</h1>
            <p className="text-muted-foreground">Manage asset depreciation calculation methods</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {permissions.canCreate && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Method
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, calculation type, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Methods</CardTitle>
          <CardDescription>
            {filteredMethods.length} method{filteredMethods.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No depreciation methods found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Calculation Type</TableHead>
                  <TableHead>Base Value</TableHead>
                  <TableHead>Rate/Years</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.code}</TableCell>
                    <TableCell>{method.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCalculationTypeLabel(method.calculation_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getBaseValueTypeLabel(method.base_value_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {method.depreciation_rate !== null && method.depreciation_rate !== undefined
                        ? `${method.depreciation_rate}%`
                        : method.useful_life_years
                        ? `${method.useful_life_years} years`
                        : '-'}
                    </TableCell>
                    <TableCell>{method.company_code || 'All'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {method.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {method.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(method)}
                          title="Edit depreciation method"
                          disabled={updateMutation.isPending || deleteMutation.isPending}
                          className="hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(method.id)}
                          title="Deactivate depreciation method"
                          disabled={updateMutation.isPending || deleteMutation.isPending}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showDialog} 
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingMethod(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "Edit Depreciation Method" : "New Depreciation Method"}
            </DialogTitle>
            <DialogDescription>
              {editingMethod
                ? "Update the depreciation method details"
                : "Create a new depreciation method for asset calculations"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="DM-001" 
                          disabled={!!editingMethod}
                          className={editingMethod ? "bg-muted" : ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {editingMethod ? "Code cannot be changed after creation" : "Unique identifier for the method"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Straight Line Method" />
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
                      <Input {...field} value={field.value || ''} placeholder="Method description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calculation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select calculation type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {methodOptions.calculationTypes.length === 0 ? (
                            <SelectItem value="__no-options" disabled>No options available</SelectItem>
                          ) : (
                            methodOptions.calculationTypes.map((option) => (
                              <SelectItem key={option} value={option}>
                                {getCalculationTypeLabel(option)}
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
                  name="base_value_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Value Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select base value type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {methodOptions.baseValueTypes.length === 0 ? (
                            <SelectItem value="__no-options" disabled>No options available</SelectItem>
                          ) : (
                            methodOptions.baseValueTypes.map((option) => (
                              <SelectItem key={option} value={option}>
                                {getBaseValueTypeLabel(option)}
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

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="depreciation_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depreciation Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormDescription>For declining balance methods</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="useful_life_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Useful Life (Years)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="residual_value_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residual Value (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0"
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
                  name="time_basis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Basis</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {methodOptions.timeBases.length === 0 ? (
                            <SelectItem value="__no-options" disabled>No options available</SelectItem>
                          ) : (
                            methodOptions.timeBases.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
                  name="company_code_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "all" ? null : parseInt(value))}
                        value={field.value?.toString() || "all"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All companies" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Companies</SelectItem>
                          {companyCodes
                            .filter(cc => cc.active !== false)
                            .map((cc) => (
                              <SelectItem key={cc.id} value={cc.id.toString()}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select a specific company or leave as "All Companies"</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="supports_partial_periods"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow Partial Periods</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="method_switching_allowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow Method Switch</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Default Method</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="applicable_to_asset_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable to Asset Class</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Leave empty for all classes" />
                    </FormControl>
                    <FormDescription>Specific asset class or leave empty for all</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingMethod(null);
                    form.reset();
                  }}
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
                      {editingMethod ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingMethod ? "Update Method" : "Create Method"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

