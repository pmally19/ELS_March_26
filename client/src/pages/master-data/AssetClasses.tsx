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

interface AssetClass {
  id: number;
  code: string;
  name: string;
  description?: string;
  depreciation_method_id?: number;
  depreciation_method_code?: string;
  depreciation_method_name?: string;
  account_determination_key?: string;
  default_useful_life_years?: number;
  number_range_code?: string;
  screen_layout_code?: string;
  company_codes?: Array<{ id: number; code: string; name: string }>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DepreciationMethod {
  id: number;
  code: string;
  name: string;
  calculation_type: string;
  is_active: boolean;
}

interface AccountDeterminationRuleOption {
  id: number;
  code: string;
  label: string;
}

// Asset Class Form Schema
const assetClassSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  depreciation_method_id: z.number().min(1, "Depreciation method is required"),
  account_determination_key: z.string().min(1, "Account determination key is required").max(50, "Key must be at most 50 characters"),
  default_useful_life_years: z.union([z.number().min(1), z.string().transform((val) => val === "" ? undefined : parseInt(val))]).optional(),
  number_range_code: z.string().optional(),
  screen_layout_code: z.string().optional(),
  company_code_ids: z.array(z.number()).min(1, "At least one company code must be assigned"),
  is_active: z.boolean(),
});

export default function AssetClasses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAssetClass, setEditingAssetClass] = useState<AssetClass | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assetClasses = [], isLoading, refetch } = useQuery<AssetClass[]>({
    queryKey: ["/api/master-data/asset-classes"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/asset-classes");
      return await response.json();
    },
  });

  // Filter asset classes based on search query
  const [filteredAssetClasses, setFilteredAssetClasses] = useState<AssetClass[]>([]);
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAssetClasses(assetClasses);
    } else {
      setFilteredAssetClasses(
        assetClasses.filter(
          (assetClass) =>
            assetClass.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assetClass.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (assetClass.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        )
      );
    }
  }, [searchQuery, assetClasses]);

  // Fetch depreciation methods
  const { data: depreciationMethods = [], isLoading: depreciationMethodsLoading } = useQuery<DepreciationMethod[]>({
    queryKey: ["/api/master-data/depreciation-methods"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/depreciation-methods?is_active=true");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Fetch company codes
  interface CompanyCode {
    id: number;
    code: string;
    name: string;
  }

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

  // Fetch account determination keys
  interface AccountDeterminationKey {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
  }

  const { data: accountDeterminationKeys = [], isLoading: accountDeterminationKeysLoading } = useQuery<AccountDeterminationKey[]>({
    queryKey: ["/api/master-data/asset-account-profiles"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/asset-account-profiles?is_active=true");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Asset class form setup
  const form = useForm<z.infer<typeof assetClassSchema>>({
    resolver: zodResolver(assetClassSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      depreciation_method_id: undefined,
      account_determination_key: "",
      default_useful_life_years: undefined,
      number_range_code: "",
      screen_layout_code: "",
      company_code_ids: [],
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingAssetClass) {
      form.reset({
        code: editingAssetClass.code,
        name: editingAssetClass.name,
        description: editingAssetClass.description || "",
        depreciation_method_id: editingAssetClass.depreciation_method_id,
        account_determination_key: editingAssetClass.account_determination_key || "",
        default_useful_life_years: editingAssetClass.default_useful_life_years || undefined,
        number_range_code: editingAssetClass.number_range_code || "",
        screen_layout_code: editingAssetClass.screen_layout_code || "",
        company_code_ids: editingAssetClass.company_codes?.map(cc => cc.id) || [],
        is_active: editingAssetClass.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        depreciation_method_id: undefined,
        account_determination_key: "",
        default_useful_life_years: undefined,
        number_range_code: "",
        screen_layout_code: "",
        company_code_ids: [],
        is_active: true,
      });
    }
  }, [editingAssetClass, form]);

  // Create asset class mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assetClassSchema>) => {
      const response = await apiRequest("/api/master-data/asset-classes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create asset class");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/asset-management/asset-classes"] });
      toast({
        title: "Success",
        description: "Asset class created successfully",
      });
      setShowDialog(false);
      setEditingAssetClass(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create asset class",
        variant: "destructive",
      });
    },
  });

  // Update asset class mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; assetClass: z.infer<typeof assetClassSchema> }) => {
      const response = await apiRequest(`/api/master-data/asset-classes/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.assetClass),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update asset class");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/asset-management/asset-classes"] });
      toast({
        title: "Success",
        description: "Asset class updated successfully",
      });
      setShowDialog(false);
      setEditingAssetClass(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset class",
        variant: "destructive",
      });
    },
  });

  // Delete asset class mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/asset-classes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete asset class");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/asset-management/asset-classes"] });
      toast({
        title: "Success",
        description: "Asset class deleted successfully",
      });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset class",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof assetClassSchema>) => {
    if (editingAssetClass) {
      updateMutation.mutate({ id: editingAssetClass.id, assetClass: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingAssetClass(null);
    form.reset();
  };

  // Function to handle editing an asset class
  const handleEdit = (assetClass: AssetClass) => {
    setEditingAssetClass(assetClass);
    setShowDialog(true);
  };

  // Function to handle deleting an asset class
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest asset classes...",
    });
    await refetch();
    toast({
      title: "Data Refreshed",
      description: "Asset classes have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Asset Classes</h1>
            <p className="text-sm text-muted-foreground">
              Manage asset classification categories used for organizing and categorizing assets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Asset Class
          </Button>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search asset classes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh asset classes data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Asset Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Classes</CardTitle>
          <CardDescription>
            All asset classification categories in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Depreciation Method</TableHead>
                    <TableHead className="hidden md:table-cell">Asset Account Profile</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssetClasses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No asset classes found. {searchQuery ? "Try a different search." : "Create your first asset class."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssetClasses.map((assetClass) => (
                      <TableRow key={assetClass.id}>
                        <TableCell className="font-medium">{assetClass.code}</TableCell>
                        <TableCell>{assetClass.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{assetClass.description || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {assetClass.depreciation_method_name
                            ? `${assetClass.depreciation_method_name} (${assetClass.depreciation_method_code})`
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{assetClass.account_determination_key || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${assetClass.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {assetClass.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(assetClass)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(assetClass.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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

      {/* Asset Class Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingAssetClass ? "Edit Asset Class" : "Create Asset Class"}
            </DialogTitle>
            <DialogDescription>
              {editingAssetClass
                ? "Update the asset class details below"
                : "Add a new asset classification category"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., MACHINERY"
                            {...field}
                            disabled={!!editingAssetClass}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique code for this asset class (max 20 characters)
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
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Machinery and Equipment"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Display name for the asset class
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
                          placeholder="Detailed description of the asset class"
                          {...field}
                          value={field.value || ""}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depreciation_method_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depreciation Method *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              depreciationMethodsLoading
                                ? "Loading methods..."
                                : "Select depreciation method"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {depreciationMethodsLoading ? (
                            <SelectItem value="loading" disabled>Loading depreciation methods...</SelectItem>
                          ) : depreciationMethods.length === 0 ? (
                            <SelectItem value="no-methods" disabled>No methods available</SelectItem>
                          ) : (
                            depreciationMethods
                              .filter(method => method.is_active)
                              .map((method) => (
                                <SelectItem key={method.id} value={method.id.toString()}>
                                  {method.name} ({method.code})
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the depreciation method for this asset class
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_determination_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Account Profile *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset account profile" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountDeterminationKeysLoading ? (
                            <SelectItem value="loading" disabled>Loading keys...</SelectItem>
                          ) : accountDeterminationKeys.length === 0 ? (
                            <SelectItem value="no-keys" disabled>No profiles available. Create profiles first.</SelectItem>
                          ) : (
                            accountDeterminationKeys
                              .filter(key => key.is_active)
                              .map((key) => (
                                <SelectItem key={key.id} value={key.code}>
                                  {key.name} ({key.code})
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the asset account profile for this asset class
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_useful_life_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Useful Life (Years)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                            min={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number_range_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number Range Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., AN-001"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Code for number range assignment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="screen_layout_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screen Layout Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g., SL-001"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Code for screen layout configuration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_code_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Codes *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const currentIds = field.value || [];
                          const id = parseInt(value);
                          if (currentIds.includes(id)) {
                            field.onChange(currentIds.filter((cid) => cid !== id));
                          } else {
                            field.onChange([...currentIds, id]);
                          }
                        }}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              companyCodesLoading
                                ? "Loading..."
                                : "Select company codes"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companyCodesLoading ? (
                            <SelectItem value="loading" disabled>Loading company codes...</SelectItem>
                          ) : companyCodes.length === 0 ? (
                            <SelectItem value="no-codes" disabled>No company codes available</SelectItem>
                          ) : (
                            companyCodes.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id.toString()}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select at least one company code. Selected: {field.value?.length || 0}
                      </FormDescription>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((ccId) => {
                            const cc = companyCodes.find((c) => c.id === ccId);
                            return cc ? (
                              <span
                                key={ccId}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm"
                              >
                                {cc.code} - {cc.name}
                                <button
                                  type="button"
                                  onClick={() => {
                                    field.onChange(field.value?.filter((id) => id !== ccId) || []);
                                  }}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Is this asset class active and available for use?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialog}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        "Saving..."
                      ) : (
                        editingAssetClass ? "Save Changes" : "Save"
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
