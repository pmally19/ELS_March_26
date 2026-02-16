import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal, Package2, Eye, FileText, Settings, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define the Material Type type
type MaterialType = {
  id: number;
  code: string;
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
  number_range_code?: string;
  valuation_class_id?: number;
  valuation_class_code?: string;
  valuation_class_description?: string;
  account_category_reference_id?: number | null;
  account_category_reference_code?: string;
  account_category_reference_name?: string;
  inventory_management_enabled?: boolean;
  quantity_update_enabled?: boolean;
  value_update_enabled?: boolean;
  price_control?: string;
  material_category?: string;
  allow_batch_management?: boolean;
  allow_serial_number?: boolean;
  allow_negative_stock?: boolean;
};

// Material Type Form Schema
const materialTypeSchema = z.object({
  code: z.string().min(2, "Code is required").max(50, "Code must be at most 50 characters"),
  name: z.string().optional(),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  number_range_code: z.string().optional().nullable(),
  valuation_class_id: z.number().optional().nullable(),
  account_category_reference_id: z.number().optional().nullable(),
  inventory_management_enabled: z.boolean().default(true),
  quantity_update_enabled: z.boolean().default(true),
  value_update_enabled: z.boolean().default(true),
  price_control: z.string().default("STANDARD"),
  material_category: z.string().optional(),
  allow_batch_management: z.boolean().default(false),
  allow_serial_number: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// Material Type Management Page
export default function MaterialTypesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterialType, setEditingMaterialType] = useState<MaterialType | null>(null);
  const [viewingMaterialType, setViewingMaterialType] = useState<MaterialType | null>(null);
  const [isMaterialTypeDetailsOpen, setIsMaterialTypeDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch material types
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [filteredMaterialTypes, setFilteredMaterialTypes] = useState<MaterialType[]>([]);
  const [materialTypesLoading, setMaterialTypesLoading] = useState(true);

  // Fetch valuation classes and number ranges
  const [valuationClasses, setValuationClasses] = useState<any[]>([]);
  const [numberRanges, setNumberRanges] = useState<any[]>([]);
  const [accountCategoryReferences, setAccountCategoryReferences] = useState<any[]>([]);
  const [valuationClassesLoading, setValuationClassesLoading] = useState(true);
  const [numberRangesLoading, setNumberRangesLoading] = useState(true);
  const [accountCategoryRefsLoading, setAccountCategoryRefsLoading] = useState(true);

  // Fetch data function
  const fetchData = async () => {
    try {
      setMaterialTypesLoading(true);
      const response = await fetch("/api/master-data/material-types", {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      setMaterialTypes(data);
      setFilteredMaterialTypes(data);
      setMaterialTypesLoading(false);
    } catch (error) {
      console.error("Error fetching material types:", error);
      setMaterialTypesLoading(false);
    }
  };

  const fetchValuationClasses = async () => {
    try {
      setValuationClassesLoading(true);
      const response = await fetch("/api/master-data/valuation-classes", {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setValuationClasses(data);
      }
      setValuationClassesLoading(false);
    } catch (error) {
      console.error("Error fetching valuation classes:", error);
      setValuationClassesLoading(false);
    }
  };

  const fetchNumberRanges = async () => {
    try {
      setNumberRangesLoading(true);
      const response = await fetch("/api/master-data/number-ranges", {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setNumberRanges(data);
      }
      setNumberRangesLoading(false);
    } catch (error) {
      console.error("Error fetching number ranges:", error);
      setNumberRangesLoading(false);
    }
  };

  const fetchAccountCategoryReferences = async () => {
    try {
      setAccountCategoryRefsLoading(true);
      const response = await fetch("/api/master-data/account-category-references", {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setAccountCategoryReferences(data);
      }
      setAccountCategoryRefsLoading(false);
    } catch (error) {
      console.error("Error fetching account category references:", error);
      setAccountCategoryRefsLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest material types...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Material types have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchValuationClasses();
    fetchNumberRanges();
    fetchAccountCategoryReferences();
  }, []);

  // Filter material types based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMaterialTypes(materialTypes);
    } else {
      setFilteredMaterialTypes(
        materialTypes.filter(
          (materialType) =>
            materialType.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (materialType.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (materialType.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, materialTypes]);

  // Material type form setup
  const form = useForm<z.infer<typeof materialTypeSchema>>({
    resolver: zodResolver(materialTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      sort_order: 0,
      number_range_code: null,
      valuation_class_id: null,
      account_category_reference_id: null,
      inventory_management_enabled: true,
      quantity_update_enabled: true,
      value_update_enabled: true,
      price_control: "STANDARD",
      material_category: "",
      allow_batch_management: false,
      allow_serial_number: false,
      allow_negative_stock: false,
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingMaterialType) {
      form.reset({
        code: editingMaterialType.code,
        name: editingMaterialType.name || "",
        description: editingMaterialType.description || "",
        sort_order: editingMaterialType.sort_order || 0,
        number_range_code: editingMaterialType.number_range_code || null,
        valuation_class_id: editingMaterialType.valuation_class_id || null,
        account_category_reference_id: editingMaterialType.account_category_reference_id || null,
        inventory_management_enabled: editingMaterialType.inventory_management_enabled !== false,
        quantity_update_enabled: editingMaterialType.quantity_update_enabled !== false,
        value_update_enabled: editingMaterialType.value_update_enabled !== false,
        price_control: editingMaterialType.price_control || "STANDARD",
        material_category: editingMaterialType.material_category || "",
        allow_batch_management: editingMaterialType.allow_batch_management === true,
        allow_serial_number: editingMaterialType.allow_serial_number === true,
        allow_negative_stock: editingMaterialType.allow_negative_stock === true,
        is_active: editingMaterialType.is_active !== false,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        sort_order: 0,
        number_range_code: null,
        valuation_class_id: null,
        account_category_reference_id: null,
        inventory_management_enabled: true,
        quantity_update_enabled: true,
        value_update_enabled: true,
        price_control: "STANDARD",
        material_category: "",
        allow_batch_management: false,
        allow_serial_number: false,
        allow_negative_stock: false,
        is_active: true,
      });
    }
  }, [editingMaterialType, form]);

  // Create material type mutation
  const createMaterialTypeMutation = useMutation({
    mutationFn: (materialType: z.infer<typeof materialTypeSchema>) => {
      const cleanedData = {
        ...materialType,
        number_range_code: materialType.number_range_code || null,
        valuation_class_id: materialType.valuation_class_id || null,
        account_category_reference_id: materialType.account_category_reference_id || null,
      };
      return apiRequest(`/api/master-data/material-types`, {
        method: "POST",
        body: JSON.stringify(cleanedData)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || "Failed to create material type");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Type created successfully",
      });
      fetchData();
      setShowDialog(false);
      setActiveTab("basic");
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Material Type",
        variant: "destructive",
      });
    },
  });

  // Update material type mutation
  const updateMaterialTypeMutation = useMutation({
    mutationFn: (data: { id: number; materialType: z.infer<typeof materialTypeSchema> }) => {
      const cleanedData = {
        ...data.materialType,
        number_range_code: data.materialType.number_range_code || null,
        valuation_class_id: data.materialType.valuation_class_id || null,
        account_category_reference_id: data.materialType.account_category_reference_id || null,
      };
      return apiRequest(`/api/master-data/material-types/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(cleanedData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Type updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingMaterialType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Material Type",
        variant: "destructive",
      });
    },
  });

  // Delete material type mutation
  const deleteMaterialTypeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/material-types/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Type deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-types"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Material Type",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof materialTypeSchema>) => {
    if (editingMaterialType) {
      updateMaterialTypeMutation.mutate({ id: editingMaterialType.id, materialType: values });
    } else {
      createMaterialTypeMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingMaterialType(null);
    form.reset();
  };

  // Function to handle editing a material type
  const handleEdit = (materialType: MaterialType) => {
    setEditingMaterialType(materialType);
    setShowDialog(true);
  };

  // Function to handle deleting a material type
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Material Type?")) {
      deleteMaterialTypeMutation.mutate(id);
    }
  };

  // Function to handle viewing a material type
  const handleView = (materialType: MaterialType) => {
    setViewingMaterialType(materialType);
    setIsMaterialTypeDetailsOpen(true);
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
            <h1 className="text-2xl font-bold">Material Types</h1>
            <p className="text-sm text-muted-foreground">
              Classification of materials and products
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={materialTypesLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${materialTypesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Material Type
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search material types..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Material Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Types</CardTitle>
          <CardDescription>
            All registered material type classifications
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
                    <TableHead className="hidden sm:table-cell">Valuation Class</TableHead>
                    <TableHead className="hidden lg:table-cell">Account Category Ref</TableHead>
                    <TableHead className="hidden md:table-cell">Number Range</TableHead>
                    <TableHead className="hidden md:table-cell">Price Control</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialTypesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredMaterialTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        No material types found. {searchQuery ? "Try a different search." : "Create your first material type."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterialTypes.map((materialType) => (
                      <TableRow key={materialType.id}>
                        <TableCell className="font-medium">{materialType.code}</TableCell>
                        <TableCell>{materialType.name || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{materialType.valuation_class_code || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{materialType.account_category_reference_code || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{materialType.number_range_code || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{materialType.price_control || 'STANDARD'}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${materialType.is_active !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {materialType.is_active !== false ? "Active" : "Inactive"}
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
                              <DropdownMenuItem onClick={() => handleView(materialType)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(materialType)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(materialType.id)}
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

      {/* Material Type Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterialType ? "Edit Material Type" : "Create Material Type"}
            </DialogTitle>
            <DialogDescription>
              {editingMaterialType
                ? "Update the material type details below"
                : "Add a new material type classification"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Information</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., FERT"
                                {...field}
                                disabled={!!editingMaterialType}
                              />
                            </FormControl>
                            <FormDescription>
                              Unique code for this material type (max 50 characters)
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
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., Finished Product"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Display name for the material type
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
                              placeholder="Brief description of this material type"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="material_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., FINISHED, RAW, SEMI"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
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
                                placeholder="0"
                                {...field}
                                value={field.value || 0}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                              Is this material type active and available for use?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Configuration Tab */}
                  <TabsContent value="configuration" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="number_range_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number Range</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select number range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {numberRangesLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  numberRanges
                                    .filter((nr) => (nr.code || nr.number_range_code) && (nr.code || nr.number_range_code).trim() !== '')
                                    .map((nr) => {
                                      const code = nr.code || nr.number_range_code;
                                      return (
                                        <SelectItem key={code} value={code}>
                                          {code} - {nr.description || ''}
                                        </SelectItem>
                                      );
                                    })
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valuation_class_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valuation Class</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : (value ? parseInt(value) : null))}
                              value={field.value ? String(field.value) : "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select valuation class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {valuationClassesLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  valuationClasses
                                    .filter((vc) => vc.id != null && vc.id !== undefined)
                                    .map((vc) => (
                                      <SelectItem key={vc.id} value={String(vc.id)}>
                                        {vc.class_code || ''} - {vc.description || vc.class_name || ''}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="account_category_reference_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Category Reference</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : (value ? parseInt(value) : null))}
                              value={field.value ? String(field.value) : "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account category reference" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {accountCategoryRefsLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  accountCategoryReferences
                                    .filter((acr) => acr.id != null && acr.id !== undefined)
                                    .map((acr) => (
                                      <SelectItem key={acr.id} value={String(acr.id)}>
                                        {acr.code || ''} - {acr.name || ''}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_control"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Control</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="STANDARD">Standard Price</SelectItem>
                                <SelectItem value="MOVING_AVERAGE">Moving Average</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="inventory_management_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Inventory Tracking</FormLabel>
                              <FormDescription>
                                Enable inventory tracking for this material type
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quantity_update_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Quantity Updates</FormLabel>
                              <FormDescription>
                                Allow quantity updates for this material type
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="value_update_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Value Updates</FormLabel>
                              <FormDescription>
                                Allow value updates for this material type
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Advanced Options Tab */}
                  <TabsContent value="advanced" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="allow_batch_management"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Batch Management</FormLabel>
                            <FormDescription>
                              Allow batch tracking for this material type
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allow_serial_number"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Serial Numbers</FormLabel>
                            <FormDescription>
                              Allow serial number tracking for this material type
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allow_negative_stock"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Negative Stock</FormLabel>
                            <FormDescription>
                              Allow negative stock for this material type
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-between">
                    <div>
                      {activeTab !== "basic" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (activeTab === "configuration") setActiveTab("basic");
                            if (activeTab === "advanced") setActiveTab("configuration");
                          }}
                        >
                          Back
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                      >
                        Cancel
                      </Button>

                      <div className="flex gap-2">
                        {/* Next button */}
                        {activeTab !== "advanced" && (
                          <Button
                            type="button"
                            onClick={() => {
                              if (activeTab === "basic") setActiveTab("configuration");
                              if (activeTab === "configuration") setActiveTab("advanced");
                            }}
                          >
                            Next
                          </Button>
                        )}

                        {/* Save button */}
                        <Button
                          type="submit"
                          disabled={createMaterialTypeMutation.isPending || updateMaterialTypeMutation.isPending}
                        >
                          {createMaterialTypeMutation.isPending || updateMaterialTypeMutation.isPending ? (
                            "Saving..."
                          ) : (
                            editingMaterialType ? "Save Changes" : "Save"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Type Details Dialog */}
      <Dialog open={isMaterialTypeDetailsOpen} onOpenChange={setIsMaterialTypeDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingMaterialType && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMaterialTypeDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Material Type Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingMaterialType.name || viewingMaterialType.code}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingMaterialType.name || viewingMaterialType.code}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingMaterialType.code}
                      </Badge>
                      <Badge
                        variant={viewingMaterialType.is_active !== false ? "default" : "secondary"}
                        className={viewingMaterialType.is_active !== false ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingMaterialType.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsMaterialTypeDetailsOpen(false);
                        handleEdit(viewingMaterialType);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsMaterialTypeDetailsOpen(false);
                        handleDelete(viewingMaterialType.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Package2 className="h-4 w-4 mr-2" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.name || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Description:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.description || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Category:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.material_category || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sort Order:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.sort_order || 0}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Number Range:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.number_range_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Valuation Class:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.valuation_class_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Account Category Ref:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.account_category_reference_code
                              ? `${viewingMaterialType.account_category_reference_code} - ${viewingMaterialType.account_category_reference_name || ""}`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Price Control:</dt>
                          <dd className="text-sm text-gray-900">{viewingMaterialType.price_control || "STANDARD"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Inventory Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Inventory Tracking:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.inventory_management_enabled !== false ? "Enabled" : "Disabled"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Quantity Update:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.quantity_update_enabled !== false ? "Enabled" : "Disabled"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Value Update:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.value_update_enabled !== false ? "Enabled" : "Disabled"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Advanced Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Batch Management:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.allow_batch_management === true ? "Allowed" : "Not Allowed"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Serial Number:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.allow_serial_number === true ? "Allowed" : "Not Allowed"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Negative Stock:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingMaterialType.allow_negative_stock === true ? "Allowed" : "Not Allowed"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
