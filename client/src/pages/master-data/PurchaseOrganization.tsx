import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";
import { Link } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit, Trash2, Search, ArrowLeft, MoreHorizontal, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SearchRefreshBar } from "@/components/ui/search-refresh-bar";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Types
interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface Plant {
  id: number;
  code: string;
  name: string;
}

interface PurchaseOrganization {
  id: number;
  code: string;
  name: string;
  description?: string;
  companyCodeId: number;
  currency: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
  status: string;
  isActive: boolean;
  companyCode?: CompanyCode;
  plants?: number[]; // IDs of assigned plants
  notes?: string;
}

// Validation Schema
const purchaseOrgFormSchema = z.object({
  code: z.string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, underscores, and hyphens")
    .transform(val => val.toUpperCase()),
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  description: z.string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  companyCodeId: z.coerce.number().min(1, "Company code is required"),
  currency: z.string()
    .min(1, "Currency is required")
    .max(3, "Currency must be 3 characters or less")
    .regex(/^[A-Z]{3}$/, "Currency must be a valid 3-letter code (e.g., USD, EUR)"),

  // Contact Info
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(50).optional().or(z.literal("")),
  state: z.string().max(50).optional().or(z.literal("")),
  country: z.string().max(50).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  manager: z.string().max(100).optional().or(z.literal("")),

  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional().or(z.literal("")),

  // Assignments
  plants: z.array(z.number()).optional().default([])
});

export default function PurchaseOrganization() {
  const permissions = useAgentPermissions();

  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [editingPurchaseOrg, setEditingPurchaseOrg] = useState<PurchaseOrganization | null>(null);
  const [deletingPurchaseOrg, setDeletingPurchaseOrg] = useState<PurchaseOrganization | null>(null);
  const [viewDetailsOrg, setViewDetailsOrg] = useState<PurchaseOrganization | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Forms
  const addForm = useForm<z.infer<typeof purchaseOrgFormSchema>>({
    resolver: zodResolver(purchaseOrgFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      currency: "USD",
      status: "active",
      isActive: true,
      plants: []
    },
  });

  const editForm = useForm<z.infer<typeof purchaseOrgFormSchema>>({
    resolver: zodResolver(purchaseOrgFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      currency: "USD",
      status: "active",
      isActive: true,
      plants: []
    },
  });

  // Queries
  const { data: purchaseOrgs = [], isLoading } = useQuery<PurchaseOrganization[]>({
    queryKey: ['/api/master-data/purchase-organization'],
  });

  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ['/api/master-data/company-code'],
  });

  const { data: plants = [] } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plant'],
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (data: z.infer<typeof purchaseOrgFormSchema>) =>
      apiRequest('/api/master-data/purchase-organization', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-organization'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({ title: "Success", description: "Purchase Organization created." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof purchaseOrgFormSchema> }) =>
      apiRequest(`/api/master-data/purchase-organization/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-organization'] });
      setIsEditDialogOpen(false);
      setEditingPurchaseOrg(null);
      toast({ title: "Success", description: "Purchase Organization updated." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/purchase-organization/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchase-organization'] });
      setIsDeleteDialogOpen(false);
      toast({ title: "Success", description: "Purchase Organization deleted." });
    }
  });

  // Handlers
  const openEditDialog = (org: PurchaseOrganization) => {
    setEditingPurchaseOrg(org);
    editForm.reset({
      code: org.code,
      name: org.name,
      description: org.description || "",
      companyCodeId: org.companyCodeId,
      currency: org.currency,
      address: org.address || "",
      city: org.city || "",
      state: org.state || "",
      country: org.country || "",
      postalCode: org.postalCode || "",
      phone: org.phone || "",
      email: org.email || "",
      manager: org.manager || "",
      status: org.status,
      isActive: org.isActive,
      notes: org.notes || "",
      plants: org.plants || []
    });
    setIsEditDialogOpen(true);
  };

  const filteredOrgs = purchaseOrgs.filter(org =>
    !searchQuery ||
    org.code.includes(searchQuery.toUpperCase()) ||
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Organizations</h1>
            <p className="text-sm text-muted-foreground">Manage procurement organizations and plant assignments</p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Purchase Org
        </Button>
      </div>

      <SearchRefreshBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        resourceName="purchase organization"
        queryKey="/api/master-data/purchase-organization"
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company Code</TableHead>
                <TableHead>Plants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">No Purchase Organizations found</TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.code}</TableCell>
                    <TableCell>{org.name}</TableCell>
                    <TableCell>
                      {org.companyCode ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{org.companyCode.code}</span>
                          <span className="text-xs text-muted-foreground">{org.companyCode.name}</span>
                        </div>
                      ) : org.companyCodeId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {org.plants && org.plants.length > 0 ? (
                          org.plants.map(plantId => {
                            const plant = plants.find(p => p.id === plantId);
                            return (
                              <Badge key={plantId} variant="outline" className="text-xs">
                                {plant ? plant.code : plantId}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewDetailsOrg(org); setShowDetailsDialog(true); }}>
                            <Search className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(org)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingPurchaseOrg(org); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Organization</DialogTitle>
            <DialogDescription>Define a new purchase organization and assign plants.</DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={addForm.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl><Input {...field} maxLength={10} placeholder="e.g. PO01" className="uppercase" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Organization Name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="companyCodeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Code</FormLabel>
                    <Select onValueChange={v => {
                      field.onChange(Number(v));
                      // Auto-fill currency from company code
                      const selectedCompany = companyCodes.find(c => c.id === Number(v));
                      if (selectedCompany && (selectedCompany as any).currency) {
                        addForm.setValue('currency', (selectedCompany as any).currency);
                      }
                    }} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Company" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {companyCodes.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["USD", "EUR", "GBP", "JPY", "CNY", "INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Contact Fields */}
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Contact & Manager</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="manager" render={({ field }) => (
                    <FormItem><FormLabel>Manager</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* Plant Assignment */}
              <div className="space-y-2">
                <h3 className="font-medium">Assign Plants</h3>
                <p className="text-xs text-muted-foreground">Select one or more plants to assign to this purchasing organization</p>
                <FormField control={addForm.control} name="plants" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        value={field.value && field.value.length > 0 ? "selected" : ""}
                        onValueChange={(value) => {
                          // This is handled by the individual checkbox toggles below
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {field.value && field.value.length > 0
                              ? `${field.value.length} plant(s) selected`
                              : "Select plants"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {plants.map((plant) => (
                              <div
                                key={plant.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                                onClick={() => {
                                  const isSelected = field.value?.includes(plant.id);
                                  if (isSelected) {
                                    field.onChange(field.value?.filter((id) => id !== plant.id));
                                  } else {
                                    field.onChange([...(field.value || []), plant.id]);
                                  }
                                }}
                              >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${field.value?.includes(plant.id) ? 'bg-primary border-primary' : 'border-input'
                                  }`}>
                                  {field.value?.includes(plant.id) && (
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm">
                                  <span className="font-semibold">{plant.code}</span> - {plant.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((plantId) => {
                            const plant = plants.find(p => p.id === plantId);
                            return plant ? (
                              <Badge key={plantId} variant="secondary" className="text-xs">
                                {plant.code}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Organization</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => editingPurchaseOrg && updateMutation.mutate({ id: editingPurchaseOrg.id, data: d }))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl><Input {...field} maxLength={10} className="uppercase" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="companyCodeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Code</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {companyCodes.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {/* Plant Assignment */}
              <div className="space-y-2">
                <h3 className="font-medium">Assign Plants</h3>
                <p className="text-xs text-muted-foreground">Select one or more plants to assign to this purchasing organization</p>
                <FormField control={editForm.control} name="plants" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        value={field.value && field.value.length > 0 ? "selected" : ""}
                        onValueChange={(value) => {
                          // This is handled by the individual checkbox toggles below
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {field.value && field.value.length > 0
                              ? `${field.value.length} plant(s) selected`
                              : "Select plants"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {plants.map((plant) => (
                              <div
                                key={plant.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                                onClick={() => {
                                  const isSelected = field.value?.includes(plant.id);
                                  if (isSelected) {
                                    field.onChange(field.value?.filter((id) => id !== plant.id));
                                  } else {
                                    field.onChange([...(field.value || []), plant.id]);
                                  }
                                }}
                              >
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${field.value?.includes(plant.id) ? 'bg-primary border-primary' : 'border-input'
                                  }`}>
                                  {field.value?.includes(plant.id) && (
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm">
                                  <span className="font-semibold">{plant.code}</span> - {plant.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((plantId) => {
                            const plant = plants.find(p => p.id === plantId);
                            return plant ? (
                              <Badge key={plantId} variant="secondary" className="text-xs">
                                {plant.code}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase organization
              <span className="font-bold"> {deletingPurchaseOrg?.code} - {deletingPurchaseOrg?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPurchaseOrg && deleteMutation.mutate(deletingPurchaseOrg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Purchase Organization Details</DialogTitle>
          </DialogHeader>
          {viewDetailsOrg && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Code</h4>
                  <p>{viewDetailsOrg.code}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Name</h4>
                  <p>{viewDetailsOrg.name}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-500">Assigned Plants</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewDetailsOrg.plants && viewDetailsOrg.plants.length > 0 ? (
                    viewDetailsOrg.plants.map(id => {
                      const p = plants.find(p => p.id === id);
                      return <Badge key={id} variant="secondary">{p?.code || id}</Badge>;
                    })
                  ) : <p className="text-sm text-muted-foreground">No plants assigned</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
