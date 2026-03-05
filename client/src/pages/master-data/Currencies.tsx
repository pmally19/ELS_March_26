import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Plus, Search, Trash2, ArrowLeft, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Define the currency schema
const currencySchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(5, "Code must not exceed 5 characters"),
  name: z.string().min(2, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  exchangeRate: z.coerce.number().min(0, "Exchange rate must be a positive number").default(1),
  isBaseCurrency: z.boolean().default(false),
  isActive: z.boolean().default(true),
  decimalPlaces: z.coerce.number().min(0, "Decimal places must be a non-negative number").max(6, "Maximum 6 decimal places").default(2),
});

// Currency display table component
function CurrencyTable({ currencies, isLoading, onEdit, onDelete, onView }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border rounded-md">
          <div className="relative max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[80px]">Symbol</TableHead>
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead>Base Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      Loading currencies...
                    </TableCell>
                  </TableRow>
                ) : currencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      No currencies found. Create your first currency.
                    </TableCell>
                  </TableRow>
                ) : (
                  currencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-medium">{currency.code}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>{currency.symbol}</TableCell>
                      <TableCell>{currency.exchangeRate}</TableCell>
                      <TableCell>{currency.decimalPlaces}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${currency.isBaseCurrency
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {currency.isBaseCurrency ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${currency.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {currency.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Details"
                            onClick={() => onView(currency)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                            onClick={() => onDelete(currency.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
  );
}

// No more static defaults; data is loaded from server

export default function Currencies() {
  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [deletingCurrencyId, setDeletingCurrencyId] = useState(null);
  const [viewingCurrency, setViewingCurrency] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // Server data: use master-data route to ensure inactive records are included
  const { data: serverData, isLoading } = useQuery({
    queryKey: ["/api/master-data/currency"],
    queryFn: async () => {
      const res = await apiRequest("/api/master-data/currency");
      return await res.json();
    },
  });

  // Normalize both response shapes
  const currenciesData = Array.isArray(serverData)
    ? (serverData as any[]).map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      exchangeRate: Number(c.conversionRate ?? c.exchangeRate ?? 1),
      decimalPlaces: Number(c.decimalPlaces ?? 2),
      isBaseCurrency: Boolean(c.baseCurrency ?? c.isBaseCurrency ?? false),
      isActive: Boolean(c.isActive ?? true),
      createdBy: c.createdBy,
      updatedBy: c.updatedBy,
      tenantId: c.tenantId,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }))
    : ((serverData?.currencies as any[]) || []).map((c: any) => ({
      id: c.id,
      code: c.currencyCode ?? c.code,
      name: c.currencyName ?? c.name,
      symbol: c.symbol,
      exchangeRate: Number(c.conversionRate ?? c.exchangeRate ?? 1),
      decimalPlaces: Number(c.decimalPlaces ?? 2),
      isBaseCurrency: Boolean(c.isBaseCurrency ?? c.baseCurrency ?? false),
      isActive: Boolean(c.isActive ?? true),
      createdBy: c.createdBy,
      updatedBy: c.updatedBy,
      tenantId: c.tenantId,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

  // Filter currencies based on search query
  const filteredCurrencies = currenciesData.filter(currency =>
    currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add form
  const addForm = useForm({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      exchangeRate: 1,
      isBaseCurrency: false,
      isActive: true,
      decimalPlaces: 2,
    },
  });

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      exchangeRate: 1,
      isBaseCurrency: false,
      isActive: true,
      decimalPlaces: 2,
    },
  });

  // Form handlers
  const handleAddSubmit = async (data) => {
    try {
      const body = {
        code: String(data.code).toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: Number(data.decimalPlaces ?? 2),
        conversionRate: Number(data.exchangeRate ?? 1),
        baseCurrency: Boolean(data.isBaseCurrency),
        isActive: Boolean(data.isActive),
        notes: null,
      };
      await apiRequest("/api/master-data/currency", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/currency"] });
      toast({
        title: "Currency created",
        description: `${data.name} (${String(data.code).toUpperCase()}) has been created successfully.`,
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    } catch (err: any) {
      toast({
        title: "Failed to create currency",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = async (data) => {
    if (!editingCurrency?.id) return;
    try {
      const body = {
        code: String(data.code).toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: Number(data.decimalPlaces ?? 2),
        conversionRate: Number(data.exchangeRate ?? 1),
        baseCurrency: Boolean(data.isBaseCurrency),
        isActive: Boolean(data.isActive),
        notes: null,
      };
      await apiRequest(`/api/master-data/currency/${editingCurrency.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/currency"] });
      toast({
        title: "Currency updated",
        description: `${data.name} (${String(data.code).toUpperCase()}) has been updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setEditingCurrency(null);
    } catch (err: any) {
      toast({
        title: "Failed to update currency",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    // Check if attempting to delete the base currency (client-side guard)
    const currencyToDelete = currenciesData.find(c => c.id === deletingCurrencyId);
    if (currencyToDelete && currencyToDelete.isBaseCurrency) {
      toast({
        title: "Cannot delete base currency",
        description: "You must set another currency as the base currency before deleting this one.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      setDeletingCurrencyId(null);
      return;
    }
    try {
      await apiRequest(`/api/master-data/currency/${deletingCurrencyId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/currency"] });
      toast({
        title: "Currency deleted",
        description: "The currency has been deleted successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete currency",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingCurrencyId(null);
    }
  };

  const openEditDialog = (currency) => {
    setEditingCurrency(currency);
    editForm.reset({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
      isBaseCurrency: currency.isBaseCurrency,
      isActive: currency.isActive,
      decimalPlaces: currency.decimalPlaces,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (id) => {
    setDeletingCurrencyId(id);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (currency: any) => {
    setViewingCurrency(currency);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-6">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Currencies</h1>
            <p className="text-sm text-muted-foreground">
              Manage global currencies and exchange rates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const csvContent = filteredCurrencies?.map((currency: any) => ({
                Code: currency.code,
                Name: currency.name,
                Symbol: currency.symbol,
                ExchangeRate: currency.exchangeRate,
                DecimalPlaces: currency.decimalPlaces,
                IsBase: currency.isBaseCurrency ? 'Yes' : 'No',
                Status: currency.isActive ? 'Active' : 'Inactive'
              })) || [];

              const csvString = [
                Object.keys(csvContent[0] || {}).join(','),
                ...csvContent.map((row: any) => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'currencies.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Currency
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center border rounded-md px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground mr-2" />
        <Input
          className="border-0 p-0 shadow-none focus-visible:ring-0"
          placeholder="Search by currency code or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Currencies Table */}
      <CurrencyTable
        currencies={filteredCurrencies}
        isLoading={isLoading}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        onView={openViewDialog}
      />

      {/* Add Currency Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Add a new currency and set its exchange rate relative to the base currency.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code*</FormLabel>
                        <FormControl>
                          <Input placeholder="USD" {...field} />
                        </FormControl>
                        <FormDescription>
                          ISO currency code (e.g., USD, EUR)
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
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="US Dollar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol*</FormLabel>
                        <FormControl>
                          <Input placeholder="$" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.0001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Rate relative to base currency
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="decimalPlaces"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimal Places*</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="6" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of decimal places (0-6)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="isBaseCurrency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">Base Currency</FormLabel>
                          <FormDescription>
                            Set as the system's base currency (replaces current base)
                          </FormDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">Active</FormLabel>
                          <FormDescription>
                            Make this currency available for selection
                          </FormDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Currency</DialogTitle>
            <DialogDescription>
              Update currency details and exchange rate.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            {editingCurrency && (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            ISO currency code
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
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symbol*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="exchangeRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exchange Rate*</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.0001" {...field} />
                          </FormControl>
                          <FormDescription>
                            Rate relative to base currency
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="decimalPlaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Decimal Places*</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="6" {...field} />
                          </FormControl>
                          <FormDescription>
                            Number of decimal places (0-6)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="isBaseCurrency"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">Base Currency</FormLabel>
                            <FormDescription>
                              Set as the system's base currency
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">Active</FormLabel>
                            <FormDescription>
                              Make this currency available for selection
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update</Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              currency from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Currency Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Currency Details — {viewingCurrency?.code}</DialogTitle>
            <DialogDescription>Full details for {viewingCurrency?.name}</DialogDescription>
          </DialogHeader>
          {viewingCurrency && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm font-medium text-gray-500">Code</p><p className="text-sm font-semibold">{viewingCurrency.code}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Name</p><p className="text-sm">{viewingCurrency.name}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Symbol</p><p className="text-sm">{viewingCurrency.symbol}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Decimal Places</p><p className="text-sm">{viewingCurrency.decimalPlaces}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Exchange Rate</p><p className="text-sm">{viewingCurrency.exchangeRate}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Base Currency</p><p className="text-sm">{viewingCurrency.isBaseCurrency ? 'Yes' : 'No'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Status</p><p className="text-sm">{viewingCurrency.isActive ? 'Active' : 'Inactive'}</p></div>
              </div>

              <Separator />

              {/* Administrative Data — collapsible */}
              <div
                className="cursor-pointer flex justify-between items-center select-none"
                onClick={(e) => {
                  const next = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                  if (next) next.style.display = next.style.display === 'none' ? 'grid' : 'none';
                }}
              >
                <p className="font-semibold text-sm text-gray-700">Administrative Data</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <dl className="grid grid-cols-2 gap-3" style={{ display: 'none' }}>
                <div><dt className="text-sm font-medium text-gray-500">Created By</dt><dd className="text-sm text-gray-900">{viewingCurrency.createdBy ?? '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Updated By</dt><dd className="text-sm text-gray-900">{viewingCurrency.updatedBy ?? viewingCurrency.createdBy ?? '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Created At</dt><dd className="text-sm text-gray-900">{viewingCurrency.created_at ? new Date(viewingCurrency.created_at).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Updated At</dt><dd className="text-sm text-gray-900">{viewingCurrency.updated_at ? new Date(viewingCurrency.updated_at).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Tenant ID</dt><dd className="text-sm text-gray-900">{viewingCurrency.tenantId ?? '—'}</dd></div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}