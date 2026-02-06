import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, FileUp, ArrowLeft, RefreshCw, MoreHorizontal, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Movement Type interface
interface MovementType {
  id: number;
  movementTypeCode: string;
  description: string;
  movementClass: string;
  transactionType: string;
  inventoryDirection: string;
  specialStockIndicator?: string;
  valuationImpact: boolean;
  quantityImpact: boolean;
  glAccountDetermination?: string;
  companyCodeId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Form schema
const movementTypeSchema = z.object({
  movementTypeCode: z.string().min(1, "Code is required").max(3, "Code must be at most 3 characters"),
  description: z.string().min(1, "Description is required").max(100),
  movementClass: z.string().min(1, "Movement class is required"),
  transactionType: z.string().min(1, "Transaction type is required"),
  inventoryDirection: z.string().min(1, "Inventory direction is required"),
  specialStockIndicator: z.string().optional(),
  valuationImpact: z.boolean().default(true),
  quantityImpact: z.boolean().default(true),
  glAccountDetermination: z.string().optional(),
  companyCodeId: z.number().default(1),
  isActive: z.boolean().default(true),
});

export default function MovementTypes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMovementType, setEditingMovementType] = useState<MovementType | null>(null);
  const [viewingMovementType, setViewingMovementType] = useState<MovementType | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [filteredMovementTypes, setFilteredMovementTypes] = useState<MovementType[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown options
  const movementClasses = [
    { code: 'receipt', name: 'Receipt' },
    { code: 'issue', name: 'Issue' },
    { code: 'transfer', name: 'Transfer' },
    { code: 'adjustment', name: 'Adjustment' },
    { code: 'return', name: 'Return' },
    { code: 'scrap', name: 'Scrap' }
  ];

  // Fetch transaction types from database instead of hardcoded
  const { data: transactionTypes = [], isLoading: isLoadingTransactionTypes } = useQuery({
    queryKey: ['/api/master-data-crud/movement-transaction-types', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/master-data-crud/movement-transaction-types?is_active=true');
      if (!response.ok) return [];
      const data = await response.json();
      // Transform to match expected format
      return data.map((tt: any) => ({ code: tt.code.toLowerCase(), name: tt.name }));
    },
  });


  const inventoryDirections = [
    { code: 'increase', name: 'Increase' },
    { code: 'decrease', name: 'Decrease' },
    { code: 'neutral', name: 'Neutral' }
  ];

  // Fetch movement types
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/master-data-crud/movement-types");
      if (response.ok) {
        const data = await response.json();
        const rows = data.records?.rows || [];
        const transformed = rows.map((item: any) => ({
          id: item.id,
          movementTypeCode: item.movement_type_code,
          description: item.description,
          movementClass: item.movement_class,
          transactionType: item.transaction_type,
          inventoryDirection: item.inventory_direction,
          specialStockIndicator: item.special_stock_indicator || '',
          valuationImpact: !!item.valuation_impact,
          quantityImpact: !!item.quantity_impact,
          glAccountDetermination: item.gl_account_determination || '',
          companyCodeId: item.company_code_id,
          isActive: item.is_active ?? true,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));

        // Deduplicate by code
        const uniqueByCode = new Map<string, MovementType>();
        transformed.forEach((mt: MovementType) => {
          const key = (mt.movementTypeCode || '').trim().toLowerCase();
          if (!uniqueByCode.has(key)) uniqueByCode.set(key, mt);
        });

        setMovementTypes(Array.from(uniqueByCode.values()));
        setFilteredMovementTypes(Array.from(uniqueByCode.values()));
      }
    } catch (error) {
      console.error('Error fetching movement types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch movement types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMovementTypes(movementTypes);
    } else {
      setFilteredMovementTypes(
        movementTypes.filter(
          (mt) =>
            mt.movementTypeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mt.movementClass.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, movementTypes]);

  // Form
  const form = useForm<z.infer<typeof movementTypeSchema>>({
    resolver: zodResolver(movementTypeSchema),
    defaultValues: {
      movementTypeCode: "",
      description: "",
      movementClass: "receipt",
      transactionType: "purchase",
      inventoryDirection: "increase",
      specialStockIndicator: "",
      valuationImpact: true,
      quantityImpact: true,
      glAccountDetermination: "",
      companyCodeId: 1,
      isActive: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingMovementType) {
      form.reset({
        movementTypeCode: editingMovementType.movementTypeCode,
        description: editingMovementType.description,
        movementClass: editingMovementType.movementClass,
        transactionType: editingMovementType.transactionType,
        inventoryDirection: editingMovementType.inventoryDirection,
        specialStockIndicator: editingMovementType.specialStockIndicator || "",
        valuationImpact: editingMovementType.valuationImpact,
        quantityImpact: editingMovementType.quantityImpact,
        glAccountDetermination: editingMovementType.glAccountDetermination || "",
        companyCodeId: editingMovementType.companyCodeId,
        isActive: editingMovementType.isActive,
      });
    } else {
      form.reset({
        movementTypeCode: "",
        description: "",
        movementClass: "receipt",
        transactionType: "purchase",
        inventoryDirection: "increase",
        specialStockIndicator: "",
        valuationImpact: true,
        quantityImpact: true,
        glAccountDetermination: "",
        companyCodeId: 1,
        isActive: true,
      });
    }
  }, [editingMovementType, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof movementTypeSchema>) => {
      return apiRequest(`/api/master-data-crud/movement-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Movement Type created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Movement Type",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; movementType: z.infer<typeof movementTypeSchema> }) => {
      return apiRequest(`/api/master-data-crud/movement-types/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.movementType),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Movement Type updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingMovementType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Movement Type",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data-crud/movement-types/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Movement Type deleted successfully",
      });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Movement Type",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof movementTypeSchema>) => {
    const updatedValues = {
      ...values,
      movementTypeCode: values.movementTypeCode.toUpperCase(),
    };

    if (editingMovementType) {
      updateMutation.mutate({ id: editingMovementType.id, movementType: updatedValues });
    } else {
      createMutation.mutate(updatedValues);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingMovementType(null);
    form.reset();
  };

  const handleEdit = (movementType: MovementType) => {
    setEditingMovementType(movementType);
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Movement Type?")) {
      deleteMutation.mutate(id);
    }
  };

  const openMovementTypeDetails = (movementType: MovementType) => {
    setViewingMovementType(movementType);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (filteredMovementTypes.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no movement types to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredMovementTypes.map(mt => ({
      'Code': mt.movementTypeCode,
      'Description': mt.description,
      'Movement Class': mt.movementClass,
      'Transaction Type': mt.transactionType,
      'Inventory Direction': mt.inventoryDirection,
      'Valuation Impact': mt.valuationImpact ? 'Yes' : 'No',
      'Quantity Impact': mt.quantityImpact ? 'Yes' : 'No',
      'Status': mt.isActive ? 'Active' : 'Inactive'
    }));

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `movement-types-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredMovementTypes.length} movement types to CSV file.`,
    });
  };

  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest movement types...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Movement types have been updated successfully.",
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
            <h1 className="text-2xl font-bold">Movement Types</h1>
            <p className="text-sm text-muted-foreground">
              Manage inventory movement type configurations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Movement Type
          </Button>
        </div>
      </div>

      {/* Search Bar with Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search movement types..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Movement Types Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Movement Class</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredMovementTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No movement types found. {searchQuery && `Try adjusting your search for "${searchQuery}".`}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovementTypes.map((mt) => (
                    <TableRow key={mt.id}>
                      <TableCell className="font-mono font-medium">
                        {mt.movementTypeCode}
                      </TableCell>
                      <TableCell>{mt.description}</TableCell>
                      <TableCell className="capitalize">{mt.movementClass}</TableCell>
                      <TableCell className="capitalize">{mt.transactionType}</TableCell>
                      <TableCell className="capitalize">{mt.inventoryDirection}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>Val: {mt.valuationImpact ? '✓' : '✗'}</div>
                          <div>Qty: {mt.quantityImpact ? '✓' : '✗'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mt.isActive ? "default" : "secondary"}>
                          {mt.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openMovementTypeDetails(mt)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(mt)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(mt.id)}
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMovementType ? "Edit Movement Type" : "Create New Movement Type"}
            </DialogTitle>
            <DialogDescription>
              {editingMovementType ? "Update the movement type details" : "Add a new movement type to the system"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="movementTypeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movement Type Code *</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={3} placeholder="e.g., 101" />
                      </FormControl>
                      <FormDescription>Max 3 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Goods Receipt" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="movementClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movement Class *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {movementClasses.map(mc => (
                            <SelectItem key={mc.code} value={mc.code}>{mc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionTypes.map(tt => (
                            <SelectItem key={tt.code} value={tt.code}>{tt.name}</SelectItem>
                          ))}
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
                  name="inventoryDirection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Direction *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inventoryDirections.map(id => (
                            <SelectItem key={id.code} value={id.code}>{id.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialStockIndicator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Stock Indicator</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="glAccountDetermination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GL Account Determination</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="valuationImpact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Valuation Impact</FormLabel>
                        <FormDescription>
                          This movement affects the inventory valuation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantityImpact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Quantity Impact</FormLabel>
                        <FormDescription>
                          This movement affects the inventory quantity
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                          Movement type is available for use
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMovementType ? "Update" : "Create"} Movement Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Movement Type Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about this movement type
            </DialogDescription>
          </DialogHeader>
          {viewingMovementType && (
            <div className="space-y-4">
              {/* Basic Information */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Code</p>
                      <p className="text-lg font-mono font-semibold">{viewingMovementType.movementTypeCode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={viewingMovementType.isActive ? "default" : "secondary"}>
                        {viewingMovementType.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="text-base">{viewingMovementType.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Classification */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold mb-3">Classification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Movement Class</p>
                      <p className="text-base capitalize">{viewingMovementType.movementClass}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Transaction Type</p>
                      <p className="text-base capitalize">{viewingMovementType.transactionType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Inventory Direction</p>
                      <p className="text-base capitalize">{viewingMovementType.inventoryDirection}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Special Stock Indicator</p>
                      <p className="text-base">{viewingMovementType.specialStockIndicator || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Impact Settings */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold mb-3">Impact Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-4 w-4 rounded-full ${viewingMovementType.valuationImpact ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      <div>
                        <p className="text-sm font-medium">Valuation Impact</p>
                        <p className="text-xs text-muted-foreground">
                          {viewingMovementType.valuationImpact ? 'Affects inventory value' : 'No value impact'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`h-4 w-4 rounded-full ${viewingMovementType.quantityImpact ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      <div>
                        <p className="text-sm font-medium">Quantity Impact</p>
                        <p className="text-xs text-muted-foreground">
                          {viewingMovementType.quantityImpact ? 'Affects inventory quantity' : 'No quantity impact'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Configuration */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold mb-3">Financial Configuration</h3>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GL Account Determination</p>
                    <p className="text-base">{viewingMovementType.glAccountDetermination || "—"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              {(viewingMovementType.createdAt || viewingMovementType.updatedAt) && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-semibold mb-3">System Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {viewingMovementType.createdAt && (
                        <div>
                          <p className="font-medium text-muted-foreground">Created</p>
                          <p>{new Date(viewingMovementType.createdAt).toLocaleString()}</p>
                        </div>
                      )}
                      {viewingMovementType.updatedAt && (
                        <div>
                          <p className="font-medium text-muted-foreground">Last Updated</p>
                          <p>{new Date(viewingMovementType.updatedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (viewingMovementType) handleEdit(viewingMovementType);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Movement Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}