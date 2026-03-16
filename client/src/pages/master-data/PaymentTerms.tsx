import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Search, Edit, Trash2, CreditCard, ArrowLeft, MoreHorizontal, PowerOff, Building, ExternalLink, ChevronDown, ChevronRight, Info, AlertCircle, FileUp, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

type PaymentTerm = {
  id: number;
  paymentTermCode: string;
  description: string;
  dueDays: number;
  discountDays1: number;
  discountPercent1: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
  tenantId?: string;
  deletedAt?: string | null;
};

const paymentTermSchema = z.object({
  paymentTermCode: z.string().min(1, "Code is required").max(10, "Code must be at most 10 characters"),
  description: z.string().min(1, "Description is required").max(100, "Description must be at most 100 characters"),
  dueDays: z.coerce.number().min(0, "Due days cannot be negative"),
  discountDays1: z.coerce.number().min(0, "Discount days cannot be negative").default(0),
  discountPercent1: z.coerce.number().min(0, "Discount percent cannot be negative").max(100, "Discount percent cannot exceed 100").default(0),
  isActive: z.boolean().default(true),
});

export default function PaymentTerms() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<PaymentTerm | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [viewingPaymentTerm, setViewingPaymentTerm] = useState<PaymentTerm | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [filteredPaymentTerms, setFilteredPaymentTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/master-data-crud/payment-terms', { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const data = await response.json();
      const recordsCandidate = data && 'records' in data ? data.records : data;
      const records = Array.isArray(recordsCandidate) ? recordsCandidate : [];
      setPaymentTerms(records);
      setFilteredPaymentTerms(records);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching payment terms:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payment terms'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPaymentTerms(paymentTerms);
    } else {
      setFilteredPaymentTerms(
        paymentTerms.filter(pt =>
          pt.paymentTermCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pt.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, paymentTerms]);

  const form = useForm<z.infer<typeof paymentTermSchema>>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      paymentTermCode: "",
      description: "",
      dueDays: 30,
      discountDays1: 0,
      discountPercent1: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (editingPaymentTerm) {
      form.reset({
        paymentTermCode: editingPaymentTerm.paymentTermCode,
        description: editingPaymentTerm.description,
        dueDays: editingPaymentTerm.dueDays,
        discountDays1: editingPaymentTerm.discountDays1,
        discountPercent1: editingPaymentTerm.discountPercent1,
        isActive: editingPaymentTerm.isActive,
      });
    } else {
      form.reset({
        paymentTermCode: "",
        description: "",
        dueDays: 30,
        discountDays1: 0,
        discountPercent1: 0,
        isActive: true,
      });
    }
  }, [editingPaymentTerm, form]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof paymentTermSchema>) => {
      const payload = { ...data, paymentTermCode: data.paymentTermCode.toUpperCase() };
      return apiRequest('/api/master-data-crud/payment-terms', { method: 'POST', body: JSON.stringify(payload) })
        .then(res => {
          if (!res.ok) return res.json().then(e => { throw new Error(e.message || "Failed to create"); });
          return res.json();
        });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment Term created successfully" });
      fetchData();
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create Payment Term", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; values: z.infer<typeof paymentTermSchema> }) => {
      const payload = { ...data.values, paymentTermCode: data.values.paymentTermCode.toUpperCase() };
      return apiRequest(`/api/master-data-crud/payment-terms/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        .then(res => res.json());
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment Term updated successfully" });
      fetchData();
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update Payment Term", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data-crud/payment-terms/${id}`, { method: 'DELETE' }).then(res => res.json());
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment Term deleted successfully" });
      fetchData();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete Payment Term", variant: "destructive" });
    }
  });

  const onSubmit = (values: z.infer<typeof paymentTermSchema>) => {
    if (editingPaymentTerm) updateMutation.mutate({ id: editingPaymentTerm.id, values });
    else createMutation.mutate(values);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPaymentTerm(null);
    form.reset();
  };

  const handleEdit = (pt: PaymentTerm) => {
    setEditingPaymentTerm(pt);
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this Payment Term?")) {
      deleteMutation.mutate(id);
    }
  };

  const openDetails = (pt: PaymentTerm) => {
    setViewingPaymentTerm(pt);
    setIsDetailsOpen(true);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
        <h3 className="text-lg font-medium">Error</h3>
        <p>{error.message || "An error occurred fetching payment terms"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payment Terms</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure payment conditions and discount structures
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowDialog(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Add Payment Term
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-t-4 border-t-blue-600 shadow-md">
        <CardHeader className="bg-gray-50/50 pb-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Payment Terms Directory
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search payment terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-gray-300 focus:border-blue-500 rounded-full bg-white shadow-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-gray-600 py-3">Code</TableHead>
                  <TableHead className="font-semibold text-gray-600">Description</TableHead>
                  <TableHead className="font-semibold text-gray-600">Due Days</TableHead>
                  <TableHead className="font-semibold text-gray-600">Discount</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPaymentTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <CreditCard className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-base font-medium text-gray-900">No payment terms found</p>
                        <p className="text-sm">We couldn't find any payment terms matching your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPaymentTerms.map((pt) => ((pt as any)._deletedAt || pt.deletedAt) == null && (
                    <TableRow key={pt.id} className="hover:bg-blue-50/30 transition-colors group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => openDetails(pt)}>
                          <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono text-xs">
                            {pt.paymentTermCode.substring(0, 4)}
                          </div>
                          <span className="font-mono text-sm text-blue-700 hover:underline">{pt.paymentTermCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{pt.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 font-mono">
                          {pt.dueDays} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pt.discountDays1 > 0 ? (
                          <div className="flex items-center text-sm text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                            <span className="font-semibold">{pt.discountPercent1}%</span>
                            <span className="ml-1 opacity-80">in {pt.discountDays1}d</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pt.isActive !== false ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 shadow-sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-sm">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 shadow-lg">
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => openDetails(pt)}>
                              <ExternalLink className="h-4 w-4 text-gray-500" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleEdit(pt)}>
                              <Edit className="h-4 w-4 text-gray-500" /> Edit Term
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(pt.id)}>
                              <Trash2 className="h-4 w-4" /> Delete Term
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingPaymentTerm ? (
                <><Edit className="h-5 w-5 text-blue-600" /> Edit Payment Term: {editingPaymentTerm.paymentTermCode}</>
              ) : (
                <><Plus className="h-5 w-5 text-blue-600" /> Add New Payment Term</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingPaymentTerm ? "Update existing payment term details." : "Create a new payment term for customer and vendor conditions."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="basic">General Details</TabsTrigger>
                  <TabsTrigger value="terms">Conditions</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTermCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Code <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. NET30" {...field} className="bg-gray-50 focus:bg-white transition-colors" />
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
                          <FormLabel className="text-gray-700">Description <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Net 30 Days" {...field} className="bg-gray-50 focus:bg-white transition-colors" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="terms" className="space-y-6">
                  <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 space-y-4">
                    <h3 className="font-medium text-blue-800 border-b border-blue-100 pb-2">Due Date & Discounts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="dueDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Net Due Days <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="bg-white border-blue-200" />
                            </FormControl>
                            <FormDescription>Days until full invoice payment</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountDays1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Discount Days</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="bg-white border-blue-200" />
                            </FormControl>
                            <FormDescription>Days to get discount</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountPercent1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Discount %</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} className="bg-white border-blue-200" />
                            </FormControl>
                            <FormDescription>Discount percentage</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="border-t pt-4 mt-6">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  {editingPaymentTerm ? "Save Changes" : "Create Term"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  Payment Term Details: {viewingPaymentTerm?.paymentTermCode}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Comprehensive view of payment terms configuration
                </DialogDescription>
              </div>
              {viewingPaymentTerm?.isActive !== false ? (
                <Badge className="bg-emerald-100 text-emerald-800 px-3 py-1 font-medium">Active</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 px-3 py-1 font-medium">Inactive</Badge>
              )}
            </div>
          </DialogHeader>

          {viewingPaymentTerm && (
            <div className="space-y-6 pt-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" /> General Information
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Code</span>
                    <span className="font-medium text-gray-900 font-mono bg-white px-2 py-1 rounded border shadow-sm">
                      {viewingPaymentTerm.paymentTermCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Description</span>
                    <span className="font-medium text-gray-900">{viewingPaymentTerm.description || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Condition Structure
                </h3>
                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <span className="text-sm text-gray-500 block mb-1 flex items-center justify-between">
                      Net Due Days
                    </span>
                    <span className="text-2xl font-bold text-gray-900">{viewingPaymentTerm.dueDays}
                      <span className="text-sm font-normal text-gray-500 ml-1">days</span>
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border shadow-sm ${viewingPaymentTerm.discountDays1 > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50/50 opacity-60'}`}>
                    <span className="text-sm text-gray-500 block mb-1">Discount Days</span>
                    <span className="text-2xl font-bold text-green-700">
                      {viewingPaymentTerm.discountDays1 > 0 ? viewingPaymentTerm.discountDays1 : '—'}
                      {viewingPaymentTerm.discountDays1 > 0 && <span className="text-sm font-normal text-green-700 ml-1">days</span>}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border shadow-sm ${viewingPaymentTerm.discountPercent1 > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50/50 opacity-60'}`}>
                    <span className="text-sm text-gray-500 block mb-1">Discount %</span>
                    <span className="text-2xl font-bold text-green-700">
                      {viewingPaymentTerm.discountPercent1 > 0 ? `${viewingPaymentTerm.discountPercent1}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Data Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mt-8 shadow-sm transition-all duration-200">
                <button
                  type="button"
                  onClick={() => setAdminDataOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    <Info className="h-4 w-4 text-blue-500" />
                    Administrative Data
                  </span>
                  {adminDataOpen
                    ? <ChevronDown className="h-5 w-5 text-gray-400" />
                    : <ChevronRight className="h-5 w-5 text-gray-400" />}
                </button>

                {adminDataOpen && (
                  <div className="p-0 border-t border-gray-100 bg-white">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500 font-medium w-1/3">Created on</td>
                          <td className="px-5 py-3 text-gray-900">
                            {viewingPaymentTerm.createdAt ? new Date(viewingPaymentTerm.createdAt).toLocaleString(undefined, {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : "—"}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500 font-medium">Created by</td>
                          <td className="px-5 py-3 text-gray-900 font-mono text-xs">{viewingPaymentTerm.createdBy || "—"}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500 font-medium">Last changed on</td>
                          <td className="px-5 py-3 text-gray-900">
                            {viewingPaymentTerm.updatedAt ? new Date(viewingPaymentTerm.updatedAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500 font-medium">Last changed by</td>
                          <td className="px-5 py-3 text-gray-900 font-mono text-xs">{viewingPaymentTerm.updatedBy || "—"}</td>
                        </tr>
                        <tr className="bg-gray-50/30">
                          <td className="px-5 py-3 text-gray-500 font-medium">Tenant ID</td>
                          <td className="px-5 py-3 text-gray-900">
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                              {viewingPaymentTerm.tenantId || "001"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-8 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="px-6">Close</Button>
            <Button
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setIsDetailsOpen(false);
                if (viewingPaymentTerm) handleEdit(viewingPaymentTerm);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}