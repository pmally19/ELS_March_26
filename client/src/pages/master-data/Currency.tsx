import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, apiGet } from "@/lib/apiClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, ArrowUpDown, Download, Upload, RefreshCw, DollarSign, FileUp, MoreHorizontal, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Link } from "wouter";
import CurrencyExcelImport from "../../components/master-data/CurrencyExcelImport";
// Types for the currency data
interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: string;
  conversionRate: string;
  baseCurrency: boolean;
  isActive: boolean;
  notes?: string;
}

// Validation schema for the currency form
const currencyFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  symbol: z.string().min(1, "Symbol is required"),
  decimalPlaces: z.string().regex(/^\d+$/, "Must be a number"),
  conversionRate: z.string().regex(/^\d*\.?\d*$/, "Must be a decimal number"),
  baseCurrency: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export default function Currency() {
  const permissions = useAgentPermissions();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Forms
  const addForm = useForm<z.infer<typeof currencyFormSchema>>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      decimalPlaces: "2",
      conversionRate: "1.0",
      baseCurrency: false,
      isActive: true,
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof currencyFormSchema>>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      decimalPlaces: "2",
      conversionRate: "1.0",
      baseCurrency: false,
      isActive: true,
      notes: "",
    },
  });

  // Fetch currencies
  const { data: currencies = [] as Currency[], isLoading, error } = useQuery({
    queryKey: ['/api/master-data/currency'],
    queryFn: () => apiGet<Currency[]>('/api/master-data/currency'),
    retry: 1,
  });

  // Refresh data function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency'] });
      toast({
        title: "Data refreshed",
        description: "Currency data has been successfully refreshed",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh currency data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!currencies || currencies.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no currencies to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Code',
      'Name', 
      'Symbol',
      'Decimal Places',
      'Conversion Rate',
      'Base Currency',
      'Active',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...currencies.map(currency => [
        `"${currency.code || ''}"`,
        `"${currency.name || ''}"`,
        `"${currency.symbol || ''}"`,
        `"${currency.decimalPlaces || '2'}"`,
        `"${currency.conversionRate || '1.0'}"`,
        currency.baseCurrency ? 'Yes' : 'No',
        currency.isActive ? 'Yes' : 'No',
        `"${currency.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `currencies-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${currencies.length} currencies to CSV file`,
    });
  };

  // Filter currencies based on search term
  const filteredCurrencies = currencies.filter(currency =>
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const addCurrencyMutation = useMutation({
    mutationFn: (data: z.infer<typeof currencyFormSchema>) => apiRequest('/api/master-data/currency', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Currency Added",
        description: "Currency has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof currencyFormSchema> }) => 
      apiRequest(`/api/master-data/currency/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency'] });
      setIsEditDialogOpen(false);
      setEditingCurrency(null);
      toast({
        title: "Currency Updated",
        description: "Currency has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/currency/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency'] });
      setIsDeleteDialogOpen(false);
      setDeletingCurrency(null);
      toast({
        title: "Currency Deleted",
        description: "Currency has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddSubmit = (data: z.infer<typeof currencyFormSchema>) => {
    addCurrencyMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof currencyFormSchema>) => {
    if (!editingCurrency) return;
    updateCurrencyMutation.mutate({ id: editingCurrency.id, data });
  };

  const openEditDialog = (currency: Currency) => {
    setEditingCurrency(currency);
    editForm.reset({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      conversionRate: currency.conversionRate,
      baseCurrency: currency.baseCurrency,
      isActive: currency.isActive,
      notes: currency.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (currency: Currency) => {
    setDeletingCurrency(currency);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Currency Management</h1>
            <p className="text-gray-600 mt-1">
              Manage currencies and exchange rates for international operations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <FileUp className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          {permissions.hasDataModificationRights && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Currency
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Input
            placeholder="Search currencies by code, name, or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh currency data"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Currencies</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="base">Base Currency</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <CurrencyTable 
            currencies={filteredCurrencies as Currency[]}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <CurrencyTable 
            currencies={filteredCurrencies.filter(currency => currency.isActive)}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </TabsContent>
        
        <TabsContent value="base">
          <CurrencyTable 
            currencies={filteredCurrencies.filter(currency => currency.baseCurrency)}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Add Currency Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Enter the currency details below to add a new currency.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Code</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormDescription>
                        ISO 4217 currency code (e.g., USD, EUR, GBP)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Name</FormLabel>
                      <FormControl>
                        <Input placeholder="US Dollar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="$" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="decimalPlaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimal Places</FormLabel>
                      <FormControl>
                        <Input placeholder="2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="conversionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Rate</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Rate relative to base currency
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="baseCurrency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Base Currency</FormLabel>
                          <FormDescription>
                            Set as the system's base currency
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={addForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional information about this currency" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCurrencyMutation.isPending}>
                  {addCurrencyMutation.isPending ? "Saving..." : "Save Currency"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Currency</DialogTitle>
            <DialogDescription>
              Update the currency details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Code</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormDescription>
                        ISO 4217 currency code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Name</FormLabel>
                      <FormControl>
                        <Input placeholder="US Dollar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="$" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="decimalPlaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimal Places</FormLabel>
                      <FormControl>
                        <Input placeholder="2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="conversionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Rate</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Rate relative to base currency
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="baseCurrency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Base Currency</FormLabel>
                          <FormDescription>
                            Set as the system's base currency
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable for use in transactions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional information about this currency" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCurrencyMutation.isPending}>
                  {updateCurrencyMutation.isPending ? "Updating..." : "Update Currency"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the currency "{deletingCurrency?.name}" ({deletingCurrency?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCurrency && deleteCurrencyMutation.mutate(deletingCurrency.id)}
              disabled={deleteCurrencyMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCurrencyMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Currencies from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file to bulk import currencies
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <CurrencyExcelImport />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Currency Table Component
function CurrencyTable({
  currencies,
  isLoading,
  onEdit,
  onDelete
}: {
  currencies: Currency[];
  isLoading: boolean;
  onEdit: (currency: Currency) => void;
  onDelete: (currency: Currency) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading currencies...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currencies || currencies.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <DollarSign className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-gray-500">No currencies found</p>
              <p className="text-sm text-gray-400">Add a currency to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Decimal Places</TableHead>
              <TableHead>Conversion Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currencies.map((currency) => (
              <TableRow key={currency.id}>
                <TableCell className="font-medium">{currency.code}</TableCell>
                <TableCell>
                  {currency.name}
                  {currency.baseCurrency && (
                    <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                      Base
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{currency.symbol}</TableCell>
                <TableCell>{currency.decimalPlaces}</TableCell>
                <TableCell>{currency.conversionRate}</TableCell>
                <TableCell>
                  {currency.isActive ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(currency)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(currency)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}