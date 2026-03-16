import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Search, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface DepreciationArea {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  useful_life_years?: number;
  depreciation_rate?: number;
  calculation_method?: string;
  company_code_id?: number;
  sort_order?: number;
  posting_indicator?: string;
  ledger_group?: string;
  currency_type?: string;
  fiscal_year_variant_id?: number;
  base_method?: string;
  period_control?: string;
  company_code?: string;
  company_name?: string;
  fiscal_year_variant_code?: string;
  created_at?: string;
  updated_at?: string;
}

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  active?: boolean;
}

// Depreciation Area Form Schema
const depreciationAreaSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  is_active: z.boolean(),
  useful_life_years: z.union([z.number().min(1), z.string().transform((val) => val === "" ? undefined : parseInt(val))]).optional(),
  depreciation_rate: z.union([z.number().min(0).max(100), z.string().transform((val) => val === "" ? undefined : parseFloat(val))]).optional(),
  calculation_method: z.string().optional(),
  company_code_id: z.union([z.number(), z.string().transform((val) => val === "" || val === "all" ? undefined : parseInt(val))]).optional(),
  sort_order: z.union([z.number().min(0), z.string().transform((val) => val === "" ? undefined : parseInt(val))]).optional(),
  posting_indicator: z.string().optional(),
  ledger_group: z.string().optional(),
  currency_type: z.string().optional(),
  fiscal_year_variant_id: z.union([z.number(), z.string().transform((val) => val === "" || val === "none" ? undefined : parseInt(val))]).optional(),
  base_method: z.string().optional(),
  period_control: z.string().optional(),
});

type DepreciationAreaFormValues = z.infer<typeof depreciationAreaSchema>;

export default function DepreciationAreas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<DepreciationArea | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: depreciationAreas = [], isLoading, refetch } = useQuery<DepreciationArea[]>({
    queryKey: ["/api/master-data/depreciation-areas"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/depreciation-areas");
      if (!response.ok) {
        throw new Error("Failed to fetch depreciation areas");
      }
      return await response.json();
    },
  });

  // Filter depreciation areas based on search query
  const [filteredAreas, setFilteredAreas] = useState<DepreciationArea[]>([]);
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAreas(depreciationAreas);
    } else {
      setFilteredAreas(
        depreciationAreas.filter(
          (area) =>
            area.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (area.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        )
      );
    }
  }, [searchQuery, depreciationAreas]);

  // Fetch company codes
  const { data: companyCodes = [], isLoading: companyCodesLoading } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/company-code");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Fetch fiscal year variants for the dropdown
  const { data: fiscalYearVariants = [], isLoading: fiscalYearVariantsLoading } = useQuery<Array<{ id: number, variant_id: string, name: string }>>({
    queryKey: ["/api/master-data/fiscal-year-variants"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/fiscal-year-variants");
      if (!response.ok) {
        throw new Error("Failed to fetch fiscal year variants");
      }
      return await response.json();
    },
  });

  const form = useForm<DepreciationAreaFormValues>({
    resolver: zodResolver(depreciationAreaSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      is_active: true,
      useful_life_years: undefined,
      depreciation_rate: undefined,
      calculation_method: "",
      company_code_id: undefined,
      sort_order: undefined,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingArea) {
      form.reset({
        code: editingArea.code,
        name: editingArea.name,
        description: editingArea.description || "",
        is_active: editingArea.is_active,
        useful_life_years: editingArea.useful_life_years,
        depreciation_rate: editingArea.depreciation_rate,
        calculation_method: editingArea.calculation_method || "",
        company_code_id: editingArea.company_code_id,
        sort_order: editingArea.sort_order,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        is_active: true,
        useful_life_years: undefined,
        depreciation_rate: undefined,
        calculation_method: "",
        company_code_id: undefined,
        sort_order: undefined,
      });
    }
  }, [editingArea, form]);

  const createMutation = useMutation({
    mutationFn: async (data: DepreciationAreaFormValues) => {
      const response = await apiRequest("/api/master-data/depreciation-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create depreciation area");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Depreciation area created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/depreciation-areas"] });
      setShowDialog(false);
      form.reset();
      setEditingArea(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create depreciation area",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DepreciationAreaFormValues }) => {
      const response = await apiRequest(`/api/master-data/depreciation-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update depreciation area");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Depreciation area updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/depreciation-areas"] });
      setShowDialog(false);
      form.reset();
      setEditingArea(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update depreciation area",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/depreciation-areas/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete depreciation area");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Depreciation area deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/depreciation-areas"] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete depreciation area",
        variant: "destructive",
      });
      setDeleteId(null);
    },
  });

  const onSubmit = (data: DepreciationAreaFormValues) => {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (area: DepreciationArea) => {
    setEditingArea(area);
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const calculationMethods = [
    { value: "STRAIGHT_LINE", label: "Straight Line" },
    { value: "DECLINING_BALANCE", label: "Declining Balance" },
    { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
    { value: "SUM_OF_YEARS", label: "Sum of Years Digits" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Depreciation Areas</h1>
            <p className="text-muted-foreground">
              Manage depreciation areas for asset accounting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => {
            setEditingArea(null);
            setShowDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Depreciation Area
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Depreciation Areas</CardTitle>
              <CardDescription>
                Configure depreciation areas for different valuation purposes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredAreas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No depreciation areas found matching your search." : "No depreciation areas found. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Calculation Method</TableHead>
                  <TableHead>Useful Life (Years)</TableHead>
                  <TableHead>Depreciation Rate (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.code}</TableCell>
                    <TableCell>{area.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {area.description || "-"}
                    </TableCell>
                    <TableCell>
                      {area.company_code ? `${area.company_code} - ${area.company_name}` : "All"}
                    </TableCell>
                    <TableCell>
                      {area.calculation_method ? (
                        <Badge variant="outline">{area.calculation_method}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{area.useful_life_years || "-"}</TableCell>
                    <TableCell>{area.depreciation_rate ? `${area.depreciation_rate}%` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={area.is_active ? "default" : "secondary"}>
                        {area.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{area.sort_order || "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(area)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(area.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArea ? "Edit Depreciation Area" : "Create Depreciation Area"}
            </DialogTitle>
            <DialogDescription>
              {editingArea
                ? "Update the depreciation area details below."
                : "Fill in the details to create a new depreciation area."}
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
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., BOOK"
                          {...field}
                          disabled={!!editingArea}
                        />
                      </FormControl>
                      <FormDescription>
                        Unique code for the depreciation area (max 20 characters)
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
                        <Input placeholder="e.g., Book Depreciation" {...field} />
                      </FormControl>
                      <FormDescription>
                        Display name for the depreciation area
                      </FormDescription>
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
                      <Textarea
                        placeholder="Description of the depreciation area..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for the depreciation area
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_code_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code</FormLabel>
                      <Select
                        value={field.value === undefined ? "all" : String(field.value)}
                        onValueChange={(value) => {
                          field.onChange(value === "all" || value === "" ? undefined : parseInt(value));
                        }}
                        disabled={companyCodesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All Company Codes" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Company Codes</SelectItem>
                          {companyCodes.map((cc) => (
                            <SelectItem key={cc.id} value={String(cc.id)}>
                              {cc.code} - {cc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optional: Assign to specific company code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculation_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Method</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(value) => {
                          field.onChange(value === "none" ? "" : value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {calculationMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optional: Default calculation method
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="useful_life_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Useful Life (Years)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 10"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseInt(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Default useful life
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          placeholder="e.g., 20.00"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Annual rate (0-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 1"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseInt(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Display order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Advanced Settings Section */}
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold mb-4">Advanced Settings</h4>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="posting_indicator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posting Indicator</FormLabel>
                        <Select
                          value={field.value || "REALTIME"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select posting type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="REALTIME">Realtime</SelectItem>
                            <SelectItem value="PERIODIC">Periodic</SelectItem>
                            <SelectItem value="NONE">None (No GL Posting)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Controls how depreciation posts to GL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ledger_group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ledger Group</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ledger" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="0L">0L - Leading Ledger</SelectItem>
                            <SelectItem value="2L">2L - IFRS Ledger</SelectItem>
                            <SelectItem value="3L">3L - Tax Ledger</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Target ledger for multi-GAAP reporting
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="currency_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Type</FormLabel>
                        <Select
                          value={field.value || "LOCAL"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOCAL">Local Currency</SelectItem>
                            <SelectItem value="GROUP">Group Currency</SelectItem>
                            <SelectItem value="PARALLEL">Parallel Currency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Currency valuation type
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fiscal_year_variant_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year Variant</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                          disabled={fiscalYearVariantsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None (use default)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {fiscalYearVariants.map((fyv) => (
                              <SelectItem key={fyv.id} value={String(fyv.id)}>
                                {fyv.variant_id} - {fyv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Optional: Specific fiscal calendar for this area
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Method</FormLabel>
                        <Select
                          value={field.value || "ACQUISITION_COST"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACQUISITION_COST">Acquisition Cost</SelectItem>
                            <SelectItem value="NET_BOOK_VALUE">Net Book Value</SelectItem>
                            <SelectItem value="REPLACEMENT_COST">Replacement Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Base for depreciation calculation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="period_control"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period Control</FormLabel>
                        <Select
                          value={field.value || "MONTHLY"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="MID_MONTH">Mid-Month Convention</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                            <SelectItem value="ANNUAL">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Period calculation method
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Whether this depreciation area is active
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingArea(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingArea
                      ? "Update"
                      : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Depreciation Area</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this depreciation area? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

