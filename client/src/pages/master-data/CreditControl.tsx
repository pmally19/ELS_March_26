import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, CircleDollarSign, RefreshCw, ShieldCheck, ArrowLeft, Search, ChevronDown, ChevronRight, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Types for the data
interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface CreditControl {
  id: number;
  code: string;
  name: string;
  description?: string;
  companyCodeId: number;
  creditCheckingGroup?: string;
  creditPeriod: number;
  gracePercentage: number;
  blockingReason?: string;
  reviewFrequency: string;
  currency: string;
  creditApprover?: string;
  status: string;
  isActive: boolean;
  notes?: string;
  companyCode?: CompanyCode;
  // Audit trail fields
  _tenantId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _deletedAt?: string | null;
}

// Validation schema for the form
const creditControlFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  companyCodeId: z.coerce.number().min(1, "Company code is required"),
  creditCheckingGroup: z.string().optional(),
  creditPeriod: z.coerce.number().min(0, "Credit period must be 0 or more").default(30),
  gracePercentage: z.coerce.number().min(0, "Grace percentage must be 0 or more").max(100, "Grace percentage cannot exceed 100").default(10),
  blockingReason: z.string().optional(),
  reviewFrequency: z.string().default("monthly"),
  currency: z.string().default("USD"),
  creditApprover: z.string().optional(),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export default function CreditControl() {
  const permissions = useAgentPermissions();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCreditControl, setEditingCreditControl] = useState<CreditControl | null>(null);
  const [deletingCreditControl, setDeletingCreditControl] = useState<CreditControl | null>(null);
  const [viewDetailsCreditControl, setViewDetailsCreditControl] = useState<CreditControl | null>(null);
  const [adminDataOpen, setAdminDataOpen] = useState(false);

  // Forms
  const addForm = useForm<z.infer<typeof creditControlFormSchema>>({
    resolver: zodResolver(creditControlFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      creditCheckingGroup: "",
      creditPeriod: 30,
      gracePercentage: 10,
      blockingReason: "",
      reviewFrequency: "monthly",
      currency: "USD",
      creditApprover: "",
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof creditControlFormSchema>>({
    resolver: zodResolver(creditControlFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      creditCheckingGroup: "",
      creditPeriod: 30,
      gracePercentage: 10,
      blockingReason: "",
      reviewFrequency: "monthly",
      currency: "USD",
      creditApprover: "",
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  // Fetch data
  // Fetch currencies for dropdown
  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/currency'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/master-data/currency', {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed to fetch currencies');
        const data = await res.json();
        // Handle both array and object with currencies property
        return Array.isArray(data) ? data : (data.currencies || []);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
  });

  const { data: creditControls = [] as CreditControl[], isLoading, error } = useQuery({
    queryKey: ['/api/master-data/credit-control'],
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/master-data/credit-control', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) {
        const text = await res.text();
        if (text.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML instead of JSON');
        }
        throw new Error(text || `${res.status} ${res.statusText}`);
      }
      return res.json();
    }
  });

  // Debug logging
  console.log('Credit Control Debug:', { creditControls, isLoading, error });

  // Show error if there is one
  if (error) {
    console.error('Credit Control Error:', error);
  }

  const { data: companyCodes = [] as CompanyCode[] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    retry: false,
  });

  // Mutations
  const addCreditControlMutation = useMutation({
    mutationFn: (data: z.infer<typeof creditControlFormSchema>) =>
      apiRequest('/api/master-data/credit-control', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-control'] });
      await queryClient.refetchQueries({ queryKey: ['/api/master-data/credit-control'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Credit Control Area Added",
        description: "Credit control area has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add credit control area. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCreditControlMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof creditControlFormSchema> }) =>
      apiRequest(`/api/master-data/credit-control/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-control'] });
      await queryClient.refetchQueries({ queryKey: ['/api/master-data/credit-control'] });
      setIsEditDialogOpen(false);
      setEditingCreditControl(null);
      toast({
        title: "Credit Control Area Updated",
        description: "Credit control area has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update credit control area. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCreditControlMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/credit-control/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/credit-control'] });
      await queryClient.refetchQueries({ queryKey: ['/api/master-data/credit-control'] });
      setIsDeleteDialogOpen(false);
      setDeletingCreditControl(null);
      toast({
        title: "Credit Control Area Deleted",
        description: "Credit control area has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete credit control area. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddSubmit = (data: z.infer<typeof creditControlFormSchema>) => {
    addCreditControlMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof creditControlFormSchema>) => {
    if (!editingCreditControl) return;
    updateCreditControlMutation.mutate({ id: editingCreditControl.id, data });
  };

  const openEditDialog = (creditControl: CreditControl) => {
    setEditingCreditControl(creditControl);
    editForm.reset({
      code: creditControl.code,
      name: creditControl.name,
      description: creditControl.description || "",
      companyCodeId: creditControl.companyCodeId,
      creditCheckingGroup: creditControl.creditCheckingGroup || "",
      creditPeriod: creditControl.creditPeriod,
      gracePercentage: creditControl.gracePercentage,
      blockingReason: creditControl.blockingReason || "",
      reviewFrequency: creditControl.reviewFrequency || "monthly",
      currency: creditControl.currency || "USD",
      creditApprover: creditControl.creditApprover || "",
      status: creditControl.status,
      isActive: creditControl.isActive,
      notes: creditControl.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (creditControl: CreditControl) => {
    setDeletingCreditControl(creditControl);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center mb-6">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Control Management</h1>
            <p className="text-gray-600 mt-1">
              Manage credit control areas to set credit limits and control customer accounts
            </p>
          </div>
        </div>
        <Button
          variant="default"
          onClick={() => setIsAddDialogOpen(true)}
          className="space-x-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Credit Control Area</span>
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error loading credit control data: {error.message}</p>
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Areas</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="high-risk">High Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CreditControlTable
            creditControls={creditControls as CreditControl[]}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onView={(cc) => { setViewDetailsCreditControl(cc); setAdminDataOpen(false); }}
          />
        </TabsContent>

        <TabsContent value="active">
          <CreditControlTable
            creditControls={(creditControls as CreditControl[]).filter(area => area.isActive)}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onView={(cc) => { setViewDetailsCreditControl(cc); setAdminDataOpen(false); }}
          />
        </TabsContent>

        <TabsContent value="high-risk">
          <CreditControlTable
            creditControls={(creditControls as CreditControl[]).filter(area => area.creditCheckingGroup === 'high_risk')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onView={(cc) => { setViewDetailsCreditControl(cc); setAdminDataOpen(false); }}
          />
        </TabsContent>
      </Tabs>

      {/* Add Credit Control Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Credit Control Area</DialogTitle>
            <DialogDescription>
              Enter credit control details to manage customer credit limits and payment terms.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={addForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Control Code</FormLabel>
                      <FormControl>
                        <Input placeholder="CC001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this credit control area
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
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="North America Credit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="companyCodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Company Code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(companyCodes as CompanyCode[]).map((companyCode) => (
                            <SelectItem key={companyCode.id} value={companyCode.id.toString()}>
                              {companyCode.code} - {companyCode.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={addForm.control}
                  name="creditCheckingGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Checking Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low_risk">Low Risk</SelectItem>
                          <SelectItem value="medium_risk">Medium Risk</SelectItem>
                          <SelectItem value="high_risk">High Risk</SelectItem>
                          <SelectItem value="new_customer">New Customer</SelectItem>
                          <SelectItem value="strategic_customer">Strategic Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="creditPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Period (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormDescription>
                        Standard payment term in days
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="gracePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription>
                        Allowed % over credit limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={addForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.length > 0 ? (
                            currencies
                              .filter((c: any) => c.isActive !== false)
                              .map((currency: any) => (
                                <SelectItem key={currency.id || currency.code} value={currency.code}>
                                  {currency.code} - {currency.name || currency.currencyName}
                                </SelectItem>
                              ))
                          ) : (
                            <>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="reviewFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semiannually">Semi-annually</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="review">Under Review</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="blockingReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blocking Reason</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="exceeded_limit">Exceeded Credit Limit</SelectItem>
                          <SelectItem value="payment_overdue">Payment Overdue</SelectItem>
                          <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
                          <SelectItem value="legal_dispute">Legal Dispute</SelectItem>
                          <SelectItem value="manual_hold">Manual Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="creditApprover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Approver</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormDescription>
                        Person responsible for credit approvals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the credit control area"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                        placeholder="Additional information about this credit control area"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCreditControlMutation.isPending}>
                  {addCreditControlMutation.isPending ? "Saving..." : "Save Credit Control Area"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Credit Control Dialog - Similar to Add with prefilled values */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit Credit Control Area</DialogTitle>
            <DialogDescription>
              Update credit control area details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
              {/* Same form fields as Add dialog */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Control Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="companyCodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Company Code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(companyCodes as CompanyCode[]).map((companyCode) => (
                            <SelectItem key={companyCode.id} value={companyCode.id.toString()}>
                              {companyCode.code} - {companyCode.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Currency field in Edit Dialog */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.length > 0 ? (
                            currencies
                              .filter((c: any) => c.isActive !== false)
                              .map((currency: any) => (
                                <SelectItem key={currency.id || currency.code} value={currency.code}>
                                  {currency.code} - {currency.name || currency.currencyName}
                                </SelectItem>
                              ))
                          ) : (
                            <>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCreditControlMutation.isPending}>
                  {updateCreditControlMutation.isPending ? "Updating..." : "Update Credit Control Area"}
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
              This will permanently delete the credit control area "{deletingCreditControl?.name}" ({deletingCreditControl?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCreditControl && deleteCreditControlMutation.mutate(deletingCreditControl.id)}
              disabled={deleteCreditControlMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCreditControlMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewDetailsCreditControl} onOpenChange={(open) => !open && setViewDetailsCreditControl(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Credit Control Area Details</DialogTitle>
          </DialogHeader>
          {viewDetailsCreditControl && (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Code</h4>
                  <p>{viewDetailsCreditControl.code}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Name</h4>
                  <p>{viewDetailsCreditControl.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Company Code</h4>
                  <p>{viewDetailsCreditControl.companyCode?.code} - {viewDetailsCreditControl.companyCode?.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Status</h4>
                  <p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewDetailsCreditControl.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {viewDetailsCreditControl.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Credit Group</h4>
                  <p className="capitalize">{viewDetailsCreditControl.creditCheckingGroup?.replace(/_/g, ' ') || 'None'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Period (Days)</h4>
                  <p>{viewDetailsCreditControl.creditPeriod}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Grace Percentage</h4>
                  <p>{viewDetailsCreditControl.gracePercentage}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Currency</h4>
                  <p>{viewDetailsCreditControl.currency}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Review Frequency</h4>
                  <p className="capitalize">{viewDetailsCreditControl.reviewFrequency}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Approver</h4>
                  <p>{viewDetailsCreditControl.creditApprover || "—"}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">Description</h4>
                <p>{viewDetailsCreditControl.description || "—"}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-500">Blocking Reason</h4>
                <p>{viewDetailsCreditControl.blockingReason ? viewDetailsCreditControl.blockingReason.replace(/_/g, ' ') : "—"}</p>
              </div>

              {viewDetailsCreditControl.notes && (
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Notes</h4>
                  <p className="whitespace-pre-wrap">{viewDetailsCreditControl.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Created At</h4>
                  <p>{viewDetailsCreditControl.createdAt ? new Date(viewDetailsCreditControl.createdAt).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Updated At</h4>
                  <p>{viewDetailsCreditControl.updatedAt ? new Date(viewDetailsCreditControl.updatedAt).toLocaleString() : "—"}</p>
                </div>
              </div>

              {/* Collapsible Administrative Data */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setAdminDataOpen(o => !o)}
                >
                  {adminDataOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Info className="h-3 w-3" />
                  Administrative Data
                </button>
                {adminDataOpen && (
                  <dl className="mt-2 grid grid-cols-1 gap-y-1 text-xs text-gray-400">
                    <div><dt className="font-medium inline">Created By (ID): </dt><dd className="inline">{viewDetailsCreditControl.createdBy ?? "—"}</dd></div>
                    <div><dt className="font-medium inline">Updated By (ID): </dt><dd className="inline">{viewDetailsCreditControl.updatedBy ?? "—"}</dd></div>
                    <div><dt className="font-medium inline">Tenant ID: </dt><dd className="inline">{viewDetailsCreditControl._tenantId ?? "—"}</dd></div>
                  </dl>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsCreditControl(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Credit Control Table Component
function CreditControlTable({
  creditControls,
  isLoading,
  onEdit,
  onDelete,
  onView
}: {
  creditControls: CreditControl[];
  isLoading: boolean;
  onEdit: (creditControl: CreditControl) => void;
  onDelete: (creditControl: CreditControl) => void;
  onView: (creditControl: CreditControl) => void;
}) {
  // Debug logging
  console.log('CreditControlTable Debug:', { creditControls, isLoading, creditControlsLength: creditControls?.length });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading credit control areas...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!creditControls || creditControls.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <CircleDollarSign className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-gray-500">No credit control areas found</p>
              <p className="text-sm text-gray-400">Add a credit control area to get started</p>
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
              <TableHead>Company Code</TableHead>
              <TableHead>Credit Period</TableHead>
              <TableHead>Risk Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditControls.map((creditControl) => (
              <TableRow key={creditControl.id}>
                <TableCell className="font-medium">{creditControl.code}</TableCell>
                <TableCell>{creditControl.name}</TableCell>
                <TableCell>{creditControl.companyCode?.code} - {creditControl.companyCode?.name}</TableCell>
                <TableCell>{creditControl.creditPeriod} days</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {creditControl.creditCheckingGroup?.replace(/_/g, ' ') || 'Standard'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {creditControl.isActive ? (
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
                      onClick={() => onView(creditControl)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(creditControl)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(creditControl)}
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