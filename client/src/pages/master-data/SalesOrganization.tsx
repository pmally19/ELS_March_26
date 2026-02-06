import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Building, RefreshCw, Globe, ArrowLeft, MoreHorizontal, Eye, Download, FileUp, Search, Plus, MapPin, DollarSign, Phone, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Types for the data
interface CompanyCode {
  id: number;
  code: string;
  name: string;
}

interface SalesOrganization {
  id: number;
  code: string;
  name: string;
  description?: string;
  companyCodeId: number;
  region?: string;
  distributionChannel?: string;
  industry?: string;
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
  notes?: string;
  companyCode?: CompanyCode;
}

// Validation schema for the form
const salesOrgFormSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  companyCodeId: z.coerce.number().min(1, "Company code is required"),
  region: z.string().optional(),
  distributionChannel: z.string().optional(),
  industry: z.string().optional(),
  currency: z.string().default("USD"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  manager: z.string().optional(),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// SalesOrg Table Component
interface SalesOrgTableProps {
  salesOrgs: SalesOrganization[];
  isLoading: boolean;
  onEdit: (salesOrg: SalesOrganization) => void;
  onDelete: (salesOrg: SalesOrganization) => void;
  onView: (salesOrg: SalesOrganization) => void;
}

function SalesOrgTable({ salesOrgs, isLoading, onEdit, onDelete, onView }: SalesOrgTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border rounded-md">
          <div className="relative max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Company Code</TableHead>
                  <TableHead className="hidden md:table-cell">Region</TableHead>
                  <TableHead className="hidden lg:table-cell">Channel</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : salesOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No sales organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesOrgs.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onView(org)}
                    >
                      <TableCell className="font-medium">{org.code}</TableCell>
                      <TableCell>{org.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {org.companyCode ? `${org.companyCode.code} - ${org.companyCode.name}` : org.companyCodeId}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{org.region || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{org.distributionChannel || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${org.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {org.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="More actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(org)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(org)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(org)}
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
  );
}

export default function SalesOrganization() {
  const permissions = useAgentPermissions();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSalesOrg, setEditingSalesOrg] = useState<SalesOrganization | null>(null);
  const [deletingSalesOrg, setDeletingSalesOrg] = useState<SalesOrganization | null>(null);
  const [viewingSalesOrg, setViewingSalesOrg] = useState<SalesOrganization | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");


  // Track selected company code for region filtering
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>("");
  const [selectedCompanyCodeObj, setSelectedCompanyCodeObj] = useState<any>(null);

  // Fetch regions from API
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["/api/master-data/regions"],
    queryFn: async () => {
      try {
        const data = await apiRequest<any>("/api/master-data/regions", "GET");
        return Array.isArray(data) ? data.filter((r: any) => r.isActive !== false) : [];
      } catch (error) {
        console.error("Error fetching regions:", error);
        return [];
      }
    },
  });

  // Fetch currencies from API
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ["/api/master-data/currency"],
    queryFn: async () => {
      try {
        const data = await apiRequest<any>("/api/master-data/currency", "GET");
        // Normalize the response - handle both array and object with currencies property
        if (Array.isArray(data)) {
          return data.filter((c: any) => c.isActive !== false).map((c: any) => ({
            code: c.code || c.currencyCode,
            name: c.name || c.currencyName,
            symbol: c.symbol,
          }));
        } else if (data.currencies && Array.isArray(data.currencies)) {
          return data.currencies.filter((c: any) => c.isActive !== false).map((c: any) => ({
            code: c.code || c.currencyCode,
            name: c.name || c.currencyName,
            symbol: c.symbol,
          }));
        }
        return [];
      } catch (error) {
        console.error("Error fetching currencies:", error);
        return [];
      }
    },
  });

  // Forms
  const addForm = useForm<z.infer<typeof salesOrgFormSchema>>({
    resolver: zodResolver(salesOrgFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      region: "",
      distributionChannel: "",
      industry: "",
      currency: "USD",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      email: "",
      manager: "",
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof salesOrgFormSchema>>({
    resolver: zodResolver(salesOrgFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      region: "",
      distributionChannel: "",
      industry: "",
      currency: "USD",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      email: "",
      manager: "",
      status: "active",
      isActive: true,
      notes: "",
    },
  });

  // Fetch data
  const { data: salesOrgs = [], isLoading, error } = useQuery<SalesOrganization[]>({
    queryKey: ['/api/master-data/sales-organization'],
    retry: 1,
  });

  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ['/api/master-data/company-code'],
    retry: 1,
  });

  // Mutations
  const addSalesOrgMutation = useMutation({
    mutationFn: (data: z.infer<typeof salesOrgFormSchema>) =>
      apiRequest('/api/master-data/sales-organization', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/sales-organization'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Sales Organization Added",
        description: "Sales organization has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add sales organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSalesOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof salesOrgFormSchema> }) =>
      apiRequest(`/api/master-data/sales-organization/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/sales-organization'] });
      setIsEditDialogOpen(false);
      setEditingSalesOrg(null);
      toast({
        title: "Sales Organization Updated",
        description: "Sales organization has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Update sales organization error:", error);

      // Extract error message from the response
      let errorMessage = "Failed to update sales organization. Please try again.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteSalesOrgMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/sales-organization/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/sales-organization'] });
      setIsDeleteDialogOpen(false);
      setDeletingSalesOrg(null);
      toast({
        title: "Sales Organization Deleted",
        description: "Sales organization has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete sales organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddSubmit = (data: z.infer<typeof salesOrgFormSchema>) => {
    addSalesOrgMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof salesOrgFormSchema>) => {
    if (!editingSalesOrg) return;
    updateSalesOrgMutation.mutate({ id: editingSalesOrg.id, data });
  };

  const openEditDialog = (salesOrg: SalesOrganization) => {
    setEditingSalesOrg(salesOrg);
    editForm.reset({
      code: salesOrg.code,
      name: salesOrg.name,
      description: salesOrg.description || "",
      companyCodeId: salesOrg.companyCodeId,
      region: salesOrg.region || "",
      distributionChannel: salesOrg.distributionChannel || "",
      industry: salesOrg.industry || "",
      currency: salesOrg.currency || "USD",
      address: salesOrg.address || "",
      city: salesOrg.city || "",
      state: salesOrg.state || "",
      country: salesOrg.country || "",
      postalCode: salesOrg.postalCode || "",
      phone: salesOrg.phone || "",
      email: salesOrg.email || "",
      manager: salesOrg.manager || "",
      status: salesOrg.status,
      isActive: salesOrg.isActive,
      notes: salesOrg.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (salesOrg: SalesOrganization) => {
    setDeletingSalesOrg(salesOrg);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDetails = (salesOrg: SalesOrganization) => {
    setViewingSalesOrg(salesOrg);
    setIsViewDetailsOpen(true);
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
            <h1 className="text-2xl font-bold">Sales Organizations</h1>
            <p className="text-sm text-muted-foreground">
              Manage sales organizations for your company's distribution network
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Sales Organization
        </Button>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sales organizations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/sales-organization'] })}
          disabled={isLoading}
          title="Refresh sales organizations data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Sales Organizations Table */}
      <SalesOrgTable
        salesOrgs={salesOrgs.filter((org) =>
          searchQuery.trim() === "" ||
          org.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (org.region && org.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (org.distributionChannel && org.distributionChannel.toLowerCase().includes(searchQuery.toLowerCase()))
        )}
        isLoading={isLoading}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        onView={handleViewDetails}
      />


      {/* Add Sales Organization Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Sales Organization</DialogTitle>
            <DialogDescription>
              Enter sales organization details to manage your distribution channels.
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
                          <Input placeholder="S001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier
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
                          <Input placeholder="North America Sales" {...field} />
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
                        <FormLabel>Company Code*</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Find the selected company code object
                            const selectedCC = companyCodes.find(cc => cc.id.toString() === value);
                            setSelectedCompanyCode(selectedCC?.code || "");
                            setSelectedCompanyCodeObj(selectedCC);
                            // Reset region when company code changes
                            addForm.setValue("region", "");
                          }}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Company Code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companyCodes.map((companyCode) => (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regionsLoading ? (
                              <SelectItem value="" disabled>Loading regions...</SelectItem>
                            ) : regions.length === 0 ? (
                              <SelectItem value="" disabled>No regions available</SelectItem>
                            ) : (
                              regions.map((region: any) => (
                                <SelectItem key={region.id || region.code} value={region.code}>
                                  {region.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="distributionChannel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Channel</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Channel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="wholesale">Wholesale</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="direct">Direct Sales</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="automotive">Automotive</SelectItem>
                            <SelectItem value="consumer_goods">Consumer Goods</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            {currenciesLoading ? (
                              <SelectItem value="" disabled>Loading currencies...</SelectItem>
                            ) : currencies.length === 0 ? (
                              <SelectItem value="" disabled>No currencies available</SelectItem>
                            ) : (
                              currencies.map((currency: any) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.code} - {currency.name} {currency.symbol ? `(${currency.symbol})` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
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
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="restructuring">Restructuring</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <FormField
                        control={addForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Business Ave." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={addForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Chicago" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input placeholder="IL" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-3">Management Information</h3>
                    <div className="space-y-3">
                      <FormField
                        control={addForm.control}
                        name="manager"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manager</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={addForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="sales@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the sales organization"
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
                          placeholder="Additional information about this sales organization"
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
              </form>
            </Form>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addForm.handleSubmit(handleAddSubmit)}
              disabled={addSalesOrgMutation.isPending}
            >
              {addSalesOrgMutation.isPending ? "Saving..." : "Save Sales Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sales Organization Dialog - Similar to Add with prefilled values */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Sales Organization</DialogTitle>
            <DialogDescription>
              Update sales organization details.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] pr-2 my-2">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                {/* Form fields identical to add dialog, just with editForm instead of addForm */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code*</FormLabel>
                        <FormControl>
                          <Input placeholder="S001" {...field} disabled />
                        </FormControl>
                        <FormDescription>
                          Code cannot be changed
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
                          <Input placeholder="North America Sales" {...field} />
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
                        <FormLabel>Company Code*</FormLabel>
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
                            {companyCodes.map((companyCode) => (
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

                {/* Active toggle to switch Active/Inactive */}
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
              </form>
            </Form>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={editForm.handleSubmit(handleEditSubmit)}
              disabled={updateSalesOrgMutation.isPending}
            >
              {updateSalesOrgMutation.isPending ? "Saving..." : "Update Sales Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingSalesOrg && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Sales Organization Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingSalesOrg.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingSalesOrg.name}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingSalesOrg.code}
                      </Badge>
                      <Badge
                        variant={viewingSalesOrg.isActive ? "default" : "secondary"}
                        className={viewingSalesOrg.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingSalesOrg.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsViewDetailsOpen(false);
                        openEditDialog(viewingSalesOrg);
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
                        setIsViewDetailsOpen(false);
                        openDeleteDialog(viewingSalesOrg);
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
                        <Building className="h-4 w-4 mr-2" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Company Code:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingSalesOrg.companyCode ?
                              `${viewingSalesOrg.companyCode.code} - ${viewingSalesOrg.companyCode.name}` :
                              viewingSalesOrg.companyCodeId}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Region:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.region || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Channel:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.distributionChannel || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Industry:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.industry || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Currency:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.currency || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Location Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Address:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.address || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">City:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.city || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">State:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.state || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Country:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.country || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Postal Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.postalCode || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.phone || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Email:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.email || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Manager:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.manager || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Additional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingSalesOrg.status}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Active:</dt>
                          <dd className="text-sm text-gray-900">{viewingSalesOrg.isActive ? "Yes" : "No"}</dd>
                        </div>
                        {viewingSalesOrg.notes && (
                          <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-500 mb-1">Notes:</dt>
                            <dd className="text-sm text-gray-900">{viewingSalesOrg.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the sales organization "{deletingSalesOrg?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSalesOrg && deleteSalesOrgMutation.mutate(deletingSalesOrg.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSalesOrgMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}