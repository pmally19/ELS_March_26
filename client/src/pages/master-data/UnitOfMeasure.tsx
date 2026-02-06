import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import UoMExcelImport from "@/components/master-data/UoMExcelImport";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, X, FileUp, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Define the UoM type
type UoM = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  isBase: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Define the UoM categories for the dropdown
const UOM_CATEGORIES = [
  "Quantity",
  "Weight",
  "Volume",
  "Length",
  "Area",
  "Time",
  "Temperature",
  "Electrical",
  "Energy",
  "Pressure",
  "Speed",
  "Other",
];

// Define the conversion type
type UoMConversion = {
  id: number;
  fromUomId: number;
  fromUomCode: string;
  fromUomName: string;
  toUomId: number;
  toUomCode: string;
  toUomName: string;
  conversionFactor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// UoM Form Schema
const uomSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  isBase: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Conversion Form Schema
const conversionSchema = z.object({
  fromUomId: z.number().min(1, "From UoM is required"),
  toUomId: z.number().min(1, "To UoM is required"),
  conversionFactor: z.number().positive("Conversion factor must be positive"),
  isActive: z.boolean().default(true),
}).refine(data => data.fromUomId !== data.toUomId, {
  message: "From and To UoM cannot be the same",
  path: ["toUomId"],
});

// UoM Management Page
export default function UnitOfMeasure() {
  // This comment helps find the end of file easier
  const [searchQuery, setSearchQuery] = useState("");
  const [showUomDialog, setShowUomDialog] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingUom, setEditingUom] = useState<UoM | null>(null);
  const [editingConversion, setEditingConversion] = useState<UoMConversion | null>(null);
  const [activeTab, setActiveTab] = useState<"uoms" | "conversions">("uoms");
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // Fetch UoMs
  const {
    data: uoms = [],
    isLoading: uomsLoading,
    error: uomsError,
  } = useQuery({
    queryKey: ["/api/master-data/units-of-measure"],
    select: (data: UoM[]) => {
      if (searchQuery.trim() === "") return data;
      return data.filter(
        (uom) =>
          uom.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          uom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          uom.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
  });

  // Fetch Conversions
  const {
    data: conversions = [],
    isLoading: conversionsLoading,
    error: conversionsError,
  } = useQuery({
    queryKey: ["/api/master-data/uom-conversions"],
    select: (data: UoMConversion[]) => {
      if (searchQuery.trim() === "") return data;
      return data.filter(
        (conversion) =>
          conversion.fromUomCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversion.fromUomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversion.toUomCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversion.toUomName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
  });

  // UoM form setup
  const uomForm = useForm<z.infer<typeof uomSchema>>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "",
      isBase: false,
      isActive: true,
    },
  });

  // Conversion form setup
  const conversionForm = useForm<z.infer<typeof conversionSchema>>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      fromUomId: 0,
      toUomId: 0,
      conversionFactor: 1,
      isActive: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingUom) {
      uomForm.reset({
        code: editingUom.code,
        name: editingUom.name,
        description: editingUom.description || "",
        category: editingUom.category,
        isBase: editingUom.isBase,
        isActive: editingUom.isActive,
      });
    } else {
      uomForm.reset({
        code: "",
        name: "",
        description: "",
        category: "",
        isBase: false,
        isActive: true,
      });
    }
  }, [editingUom, uomForm]);

  useEffect(() => {
    if (editingConversion) {
      conversionForm.reset({
        fromUomId: editingConversion.fromUomId,
        toUomId: editingConversion.toUomId,
        conversionFactor: editingConversion.conversionFactor,
        isActive: editingConversion.isActive,
      });
    } else {
      conversionForm.reset({
        fromUomId: 0,
        toUomId: 0,
        conversionFactor: 1,
        isActive: true,
      });
    }
  }, [editingConversion, conversionForm]);

  // Create UoM mutation
  const createUomMutation = useMutation({
    mutationFn: (uom: z.infer<typeof uomSchema>) => {
      return apiRequest(`/api/master-data/units-of-measure`, {
        method: "POST",
        body: JSON.stringify(uom)
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit of Measure created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/units-of-measure"] });
      setShowUomDialog(false);
      uomForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Unit of Measure",
        variant: "destructive",
      });
    },
  });

  // Update UoM mutation
  const updateUomMutation = useMutation({
    mutationFn: (data: { id: number; uom: z.infer<typeof uomSchema> }) => {
      return apiRequest(`/api/master-data/units-of-measure/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.uom),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit of Measure updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/units-of-measure"] });
      setShowUomDialog(false);
      setEditingUom(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Unit of Measure",
        variant: "destructive",
      });
    },
  });

  // Create Conversion mutation
  const createConversionMutation = useMutation({
    mutationFn: (conversion: z.infer<typeof conversionSchema>) => {
      return apiRequest(`/api/master-data/uom-conversions`, {
        method: "POST",
        body: JSON.stringify(conversion),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Conversion created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/uom-conversions"] });
      setShowConversionDialog(false);
      conversionForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Conversion",
        variant: "destructive",
      });
    },
  });

  // Update Conversion mutation
  const updateConversionMutation = useMutation({
    mutationFn: (data: { id: number; conversion: z.infer<typeof conversionSchema> }) => {
      return apiRequest(`/api/master-data/uom-conversions/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.conversion),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Conversion updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/uom-conversions"] });
      setShowConversionDialog(false);
      setEditingConversion(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Conversion",
        variant: "destructive",
      });
    },
  });

  // UoM form submission
  const onUomSubmit = (values: z.infer<typeof uomSchema>) => {
    if (editingUom) {
      updateUomMutation.mutate({ id: editingUom.id, uom: values });
    } else {
      createUomMutation.mutate(values);
    }
  };

  // Conversion form submission
  const onConversionSubmit = (values: z.infer<typeof conversionSchema>) => {
    if (editingConversion) {
      updateConversionMutation.mutate({ id: editingConversion.id, conversion: values });
    } else {
      createConversionMutation.mutate(values);
    }
  };

  // Function to close the UoM dialog and reset state
  const closeUomDialog = () => {
    setShowUomDialog(false);
    setEditingUom(null);
    uomForm.reset();
  };

  // Function to close the Conversion dialog and reset state
  const closeConversionDialog = () => {
    setShowConversionDialog(false);
    setEditingConversion(null);
    conversionForm.reset();
  };

  // Function to handle editing a UoM
  const handleEditUom = (uom: UoM) => {
    setEditingUom(uom);
    setShowUomDialog(true);
  };

  // Function to handle editing a Conversion
  const handleEditConversion = (conversion: UoMConversion) => {
    setEditingConversion(conversion);
    setShowConversionDialog(true);
  };

  // Check for errors
  if (uomsError || conversionsError) {
    const error = uomsError || conversionsError;
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(error as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Units of Measure</h1>
          <p className="text-sm text-muted-foreground">
            Manage units of measure and their conversions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "uoms" ? (
            <>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <Button onClick={() => setShowUomDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Unit
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowConversionDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Conversion
            </Button>
          )}
        </div>
      </div>

      {/* Search & Tab Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex">
          <Button
            variant={activeTab === "uoms" ? "default" : "outline"}
            className="rounded-r-none"
            onClick={() => setActiveTab("uoms")}
          >
            Units
          </Button>
          <Button
            variant={activeTab === "conversions" ? "default" : "outline"}
            className="rounded-l-none"
            onClick={() => setActiveTab("conversions")}
          >
            Conversions
          </Button>
        </div>
      </div>

      {/* Units of Measure Tab */}
      {activeTab === "uoms" && (
        <Card>
          <CardHeader>
            <CardTitle>Units of Measure</CardTitle>
            <CardDescription>
              All available units of measure in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[100px] text-center">Base Unit</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uomsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : uoms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No units of measure found. {searchQuery ? "Try a different search." : "Create your first unit."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    uoms.map((uom) => (
                      <TableRow key={uom.id}>
                        <TableCell className="font-medium">{uom.code}</TableCell>
                        <TableCell>{uom.name}</TableCell>
                        <TableCell>{uom.category}</TableCell>
                        <TableCell className="text-center">
                          {uom.isBase ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Base
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              uom.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {uom.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUom(uom)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversions Tab */}
      {activeTab === "conversions" && (
        <Card>
          <CardHeader>
            <CardTitle>UoM Conversions</CardTitle>
            <CardDescription>
              Conversion factors between units of measure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Unit</TableHead>
                    <TableHead>To Unit</TableHead>
                    <TableHead className="w-[150px] text-center">Factor</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : conversions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No conversions found. {searchQuery ? "Try a different search." : "Create your first conversion."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversions.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          <div className="font-medium">{conversion.fromUomCode}</div>
                          <div className="text-sm text-muted-foreground">{conversion.fromUomName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{conversion.toUomCode}</div>
                          <div className="text-sm text-muted-foreground">{conversion.toUomName}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          1 {conversion.fromUomCode} = {conversion.conversionFactor} {conversion.toUomCode}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              conversion.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {conversion.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditConversion(conversion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* UoM Dialog */}
      <Dialog open={showUomDialog} onOpenChange={setShowUomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUom ? "Edit Unit of Measure" : "Create Unit of Measure"}
            </DialogTitle>
            <DialogDescription>
              {editingUom
                ? "Update the unit details below"
                : "Enter the details for the new unit of measure"}
            </DialogDescription>
          </DialogHeader>
          <Form {...uomForm}>
            <form onSubmit={uomForm.handleSubmit(onUomSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={uomForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="KG" {...field} />
                      </FormControl>
                      <FormDescription>
                        Short code for the unit (e.g., KG for kilogram)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uomForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Kilogram" {...field} />
                      </FormControl>
                      <FormDescription>
                        Full name of the unit of measure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={uomForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Basic unit of mass" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional description for this unit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={uomForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UOM_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of measurement this unit belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={uomForm.control}
                  name="isBase"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Base Unit</FormLabel>
                        <FormDescription>
                          Is this the base unit for its category?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={uomForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Is this unit active and available for use?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeUomDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUomMutation.isPending || updateUomMutation.isPending}
                >
                  {createUomMutation.isPending || updateUomMutation.isPending 
                    ? "Saving..." 
                    : (editingUom ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Conversion Dialog */}
      <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConversion ? "Edit Conversion" : "Create Conversion"}
            </DialogTitle>
            <DialogDescription>
              {editingConversion
                ? "Update the conversion details below"
                : "Define a new conversion between units"}
            </DialogDescription>
          </DialogHeader>
          <Form {...conversionForm}>
            <form onSubmit={conversionForm.handleSubmit(onConversionSubmit)} className="space-y-4">
              <FormField
                control={conversionForm.control}
                name="fromUomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Unit</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : ""}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uoms.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id.toString()}>
                            {uom.code} - {uom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The source unit for conversion
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={conversionForm.control}
                name="toUomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Unit</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : ""}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uoms.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id.toString()}>
                            {uom.code} - {uom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The target unit for conversion
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={conversionForm.control}
                name="conversionFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversion Factor</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="1.0" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many target units equal one source unit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={conversionForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Is this conversion active and available for use?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeConversionDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createConversionMutation.isPending || updateConversionMutation.isPending}
                >
                  {createConversionMutation.isPending || updateConversionMutation.isPending 
                    ? "Saving..." 
                    : (editingConversion ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Units of Measure from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file to bulk import units of measure.
            </DialogDescription>
          </DialogHeader>
          <UoMExcelImport />
        </DialogContent>
      </Dialog>
    </div>
  );
}