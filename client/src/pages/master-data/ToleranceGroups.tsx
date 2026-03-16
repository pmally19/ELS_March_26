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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, MoreHorizontal, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Tolerance Group type (matches database structure)
type ToleranceGroup = {
  id: number;
  code: string;
  name: string;
  description?: string;
  company_code: string;
  user_type: string;
  upper_amount_limit?: string;
  percentage_limit?: string;
  absolute_amount_limit?: string;
  payment_difference_tolerance?: string;
  cash_discount_tolerance?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Tolerance Group Form Schema
const toleranceGroupSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  company_code: z.string().min(1, "Company code is required").max(4, "Company code must be 4 characters or less"),
  user_type: z.enum(["EMPLOYEE", "CUSTOMER", "VENDOR"], {
    errorMap: () => ({ message: "User type must be EMPLOYEE, CUSTOMER, or VENDOR" }),
  }),
  upper_amount_limit: z.string().optional(),
  percentage_limit: z.string().optional(),
  absolute_amount_limit: z.string().optional(),
  payment_difference_tolerance: z.string().optional(),
  cash_discount_tolerance: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Tolerance Groups Management Page
export default function ToleranceGroups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ToleranceGroup | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch tolerance groups
  const [groups, setGroups] = useState<ToleranceGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ToleranceGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<Error | null>(null);

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/company-code");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching company codes:", error);
        return [];
      }
    },
  });

  // Fetch data function
  const fetchData = async () => {
    try {
      setGroupsLoading(true);
      const response = await fetch("/api/master-data/tolerance-groups", {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML instead of JSON');
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setGroups(data);
      setFilteredGroups(data);
      setGroupsLoading(false);
    } catch (error) {
      console.error("Error fetching tolerance groups:", error);
      setGroupsError(error instanceof Error ? error : new Error('Failed to fetch tolerance groups'));
      setGroupsLoading(false);
    }
  };

  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest tolerance groups...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Tolerance groups have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter groups based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGroups(groups);
    } else {
      setFilteredGroups(
        groups.filter(
          (group) =>
            group.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            group.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.user_type.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, groups]);

  // Tolerance group form setup
  const form = useForm<z.infer<typeof toleranceGroupSchema>>({
    resolver: zodResolver(toleranceGroupSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      company_code: "",
      user_type: "EMPLOYEE",
      upper_amount_limit: "",
      percentage_limit: "",
      absolute_amount_limit: "",
      payment_difference_tolerance: "",
      cash_discount_tolerance: "",
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingGroup) {
      form.reset({
        code: editingGroup.code,
        name: editingGroup.name,
        description: editingGroup.description || "",
        company_code: editingGroup.company_code,
        user_type: editingGroup.user_type as "EMPLOYEE" | "CUSTOMER" | "VENDOR",
        upper_amount_limit: editingGroup.upper_amount_limit || "",
        percentage_limit: editingGroup.percentage_limit || "",
        absolute_amount_limit: editingGroup.absolute_amount_limit || "",
        payment_difference_tolerance: editingGroup.payment_difference_tolerance || "",
        cash_discount_tolerance: editingGroup.cash_discount_tolerance || "",
        is_active: editingGroup.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        company_code: "",
        user_type: "EMPLOYEE",
        upper_amount_limit: "",
        percentage_limit: "",
        absolute_amount_limit: "",
        payment_difference_tolerance: "",
        cash_discount_tolerance: "",
        is_active: true,
      });
    }
  }, [editingGroup, form]);

  // Create tolerance group mutation
  const createGroupMutation = useMutation({
    mutationFn: (group: z.infer<typeof toleranceGroupSchema>) => {
      const payload = {
        code: group.code,
        name: group.name,
        description: group.description || undefined,
        companyCode: group.company_code,
        userType: group.user_type,
        upperAmountLimit: group.upper_amount_limit || undefined,
        percentageLimit: group.percentage_limit || undefined,
        absoluteAmountLimit: group.absolute_amount_limit || undefined,
        paymentDifferenceTolerance: group.payment_difference_tolerance || undefined,
        cashDiscountTolerance: group.cash_discount_tolerance || undefined,
        isActive: group.is_active !== undefined ? group.is_active : true,
      };
      return apiRequest(`/api/master-data/tolerance-groups`, {
        method: "POST",
        body: JSON.stringify(payload)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to create tolerance group");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tolerance Group created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Tolerance Group",
        variant: "destructive",
      });
    },
  });

  // Update tolerance group mutation
  const updateGroupMutation = useMutation({
    mutationFn: (data: { id: number; group: z.infer<typeof toleranceGroupSchema> }) => {
      const payload: any = {};
      if (data.group.code !== undefined) payload.code = data.group.code;
      if (data.group.name !== undefined) payload.name = data.group.name;
      if (data.group.description !== undefined) payload.description = data.group.description || undefined;
      if (data.group.company_code !== undefined) payload.companyCode = data.group.company_code;
      if (data.group.user_type !== undefined) payload.userType = data.group.user_type;
      if (data.group.upper_amount_limit !== undefined) payload.upperAmountLimit = data.group.upper_amount_limit || undefined;
      if (data.group.percentage_limit !== undefined) payload.percentageLimit = data.group.percentage_limit || undefined;
      if (data.group.absolute_amount_limit !== undefined) payload.absoluteAmountLimit = data.group.absolute_amount_limit || undefined;
      if (data.group.payment_difference_tolerance !== undefined) payload.paymentDifferenceTolerance = data.group.payment_difference_tolerance || undefined;
      if (data.group.cash_discount_tolerance !== undefined) payload.cashDiscountTolerance = data.group.cash_discount_tolerance || undefined;
      if (data.group.is_active !== undefined) payload.isActive = data.group.is_active;
      return apiRequest(`/api/master-data/tolerance-groups/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to update tolerance group");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tolerance Group updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Tolerance Group",
        variant: "destructive",
      });
    },
  });

  // Delete tolerance group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/tolerance-groups/${id}`, {
        method: "DELETE",
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to delete tolerance group");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tolerance Group deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tolerance-groups"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Tolerance Group",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof toleranceGroupSchema>) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, group: values });
    } else {
      createGroupMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingGroup(null);
    form.reset();
  };

  // Function to handle editing a tolerance group
  const handleEdit = (group: ToleranceGroup) => {
    setEditingGroup(group);
    setShowDialog(true);
  };

  // Function to handle deleting a tolerance group
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this tolerance group?")) {
      deleteGroupMutation.mutate(id);
    }
  };

  // Function to handle exporting groups to CSV
  const handleExport = () => {
    if (filteredGroups.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no tolerance groups to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = filteredGroups.map(group => ({
      'Code': group.code,
      'Name': group.name,
      'Description': group.description || '',
      'Company Code': group.company_code,
      'User Type': group.user_type,
      'Upper Amount Limit': group.upper_amount_limit || '',
      'Percentage Limit': group.percentage_limit || '',
      'Absolute Amount Limit': group.absolute_amount_limit || '',
      'Payment Difference Tolerance': group.payment_difference_tolerance || '',
      'Cash Discount Tolerance': group.cash_discount_tolerance || '',
      'Status': group.is_active ? 'Active' : 'Inactive'
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tolerance-groups-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "Tolerance groups exported to CSV successfully.",
    });
  };

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tolerance groups...</p>
        </div>
      </div>
    );
  }

  if (groupsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>{groupsError.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchData} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/master-data">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Master Data
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Tolerance Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage posting tolerance limits for financial document processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {permissions.hasDataModificationRights && (
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tolerance Group
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Tolerance Groups</CardTitle>
          <CardDescription>Filter tolerance groups by code, name, description, company code, or user type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by code, name, description, company code, or user type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tolerance Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tolerance Groups</CardTitle>
          <CardDescription>
            {filteredGroups.length} tolerance group{filteredGroups.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tolerance Groups Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search criteria." : "Get started by creating your first tolerance group."}
              </p>
              {!searchQuery && permissions.hasDataModificationRights && (
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tolerance Group
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Upper Amount Limit</TableHead>
                  <TableHead>Percentage Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.code}</TableCell>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.company_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{group.user_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {group.upper_amount_limit ? parseFloat(group.upper_amount_limit).toLocaleString() : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {group.percentage_limit ? `${parseFloat(group.percentage_limit)}%` : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active ? "default" : "secondary"}>
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.hasDataModificationRights && (
                            <DropdownMenuItem onClick={() => handleEdit(group)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {permissions.hasDataModificationRights && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(group.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Tolerance Group" : "Add Tolerance Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the tolerance group details below." 
                : "Fill in the details to create a new tolerance group."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="TG001" {...field} maxLength={10} />
                      </FormControl>
                      <FormDescription>Unique code for the tolerance group</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Employee Tolerance Group" {...field} maxLength={100} />
                      </FormControl>
                      <FormDescription>Display name of the tolerance group</FormDescription>
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
                        placeholder="Detailed description of the tolerance group..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>Optional description of the tolerance group</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companyCodes.map((cc: any) => (
                            <SelectItem key={cc.id || cc.code} value={cc.code}>
                              {cc.code} - {cc.name || cc.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Company code for this tolerance group</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="VENDOR">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Type of user for this tolerance group</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="upper_amount_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upper Amount Limit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>Maximum amount limit for tolerance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage Limit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>Percentage limit for tolerance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="absolute_amount_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Absolute Amount Limit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>Absolute amount limit for tolerance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_difference_tolerance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Difference Tolerance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>Tolerance for payment differences</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cash_discount_tolerance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Discount Tolerance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Tolerance for cash discount differences</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Tolerance group is active and available for use</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                >
                  {editingGroup ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

