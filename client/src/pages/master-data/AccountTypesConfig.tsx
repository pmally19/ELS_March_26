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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, MoreHorizontal, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Account Type type (matches database schema)
type AccountType = {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Account Type Form Schema
const accountTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be at most 50 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Account Types Management Page
export default function AccountTypesConfig() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch account types directly
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [filteredAccountTypes, setFilteredAccountTypes] = useState<AccountType[]>([]);
  const [accountTypesLoading, setAccountTypesLoading] = useState(true);
  const [accountTypesError, setAccountTypesError] = useState<Error | null>(null);

  // Fetch data function
  const fetchData = async () => {
    try {
      setAccountTypesLoading(true);
      const response = await fetch("/api/master-data/account-types", {
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
      setAccountTypes(data);
      setFilteredAccountTypes(data);
      setAccountTypesLoading(false);
    } catch (error) {
      console.error("Error fetching account types:", error);
      setAccountTypesError(error instanceof Error ? error : new Error('Failed to fetch account types'));
      setAccountTypesLoading(false);
    }
  };

  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest account types...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Account types have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter account types based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAccountTypes(accountTypes);
    } else {
      setFilteredAccountTypes(
        accountTypes.filter(
          (accountType) =>
            accountType.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            accountType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (accountType.description && accountType.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (accountType.category && accountType.category.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    }
  }, [searchQuery, accountTypes]);

  // Account type form setup
  const form = useForm<z.infer<typeof accountTypeSchema>>({
    resolver: zodResolver(accountTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "",
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingAccountType) {
      form.reset({
        code: editingAccountType.code,
        name: editingAccountType.name,
        description: editingAccountType.description || "",
        category: editingAccountType.category || "",
        is_active: editingAccountType.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        category: "",
        is_active: true,
      });
    }
  }, [editingAccountType, form]);

  // Create account type mutation
  const createAccountTypeMutation = useMutation({
    mutationFn: (accountType: z.infer<typeof accountTypeSchema>) => {
      console.log("Sending to API:", JSON.stringify(accountType));
      return apiRequest(`/api/master-data/account-types`, {
        method: "POST",
        body: JSON.stringify(accountType)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Failed to create account type");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account Type created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Account Type",
        variant: "destructive",
      });
    },
  });

  // Update account type mutation
  const updateAccountTypeMutation = useMutation({
    mutationFn: (data: { id: number; accountType: z.infer<typeof accountTypeSchema> }) => {
      return apiRequest(`/api/master-data/account-types/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.accountType),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account Type updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingAccountType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Account Type",
        variant: "destructive",
      });
    },
  });

  // Delete account type mutation
  const deleteAccountTypeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/account-types/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account Type deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-types"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Account Type",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof accountTypeSchema>) => {
    console.log("Form submitted with values:", values);
    
    // Convert code to uppercase
    const updatedValues: any = {
      ...values,
      code: values.code.toUpperCase(),
    };
    
    if (editingAccountType) {
      updateAccountTypeMutation.mutate({ id: editingAccountType.id, accountType: updatedValues });
    } else {
      createAccountTypeMutation.mutate(updatedValues);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingAccountType(null);
    form.reset();
  };

  // Function to handle editing an account type
  const handleEdit = (accountType: AccountType) => {
    setEditingAccountType(accountType);
    form.reset({
      code: accountType.code,
      name: accountType.name,
      description: accountType.description || "",
      category: accountType.category || "",
      is_active: accountType.is_active,
    });
    setShowDialog(true);
  };

  // Function to handle exporting account types to CSV
  const handleExport = () => {
    if (filteredAccountTypes.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no account types to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = filteredAccountTypes.map(accountType => ({
      'Code': accountType.code,
      'Name': accountType.name,
      'Description': accountType.description || '',
      'Category': accountType.category || '',
      'Status': accountType.is_active ? 'Active' : 'Inactive'
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
    link.setAttribute('download', `account-types-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredAccountTypes.length} account types to CSV file.`,
    });
  };

  // Function to handle deleting an account type
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Account Type?")) {
      deleteAccountTypeMutation.mutate(id);
    }
  };

  // Function to handle deactivating an account type
  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this Account Type? This will set it to inactive status but preserve all associated records.")) {
      // Find the account type and update it
      const accountType = accountTypes.find(at => at.id === id);
      if (accountType) {
        updateAccountTypeMutation.mutate({
          id: id,
          accountType: {
            ...accountType,
            is_active: false,
          }
        });
      }
    }
  };

  // Check for errors
  if (accountTypesError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(accountTypesError as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Account Types</h1>
            <p className="text-sm text-muted-foreground">
              Manage account type classifications for document types
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.hasDataModificationRights ? (
            <>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Account Type
              </Button>
            </>
          ) : (
            <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
              {permissions.getRestrictedMessage()}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search account types..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={accountTypesLoading}
          title="Refresh account types data"
        >
          <RefreshCw className={`h-4 w-4 ${accountTypesLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Account Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Types</CardTitle>
          <CardDescription>
            All registered account type classifications
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
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountTypesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredAccountTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No account types found. {searchQuery ? "Try a different search." : "Create your first account type."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccountTypes.map((accountType) => (
                      <TableRow key={accountType.id}>
                        <TableCell className="font-medium">{accountType.code}</TableCell>
                        <TableCell>{accountType.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {accountType.category ? (
                            <Badge variant="outline">{accountType.category}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {accountType.description || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              accountType.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {accountType.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {permissions.hasDataModificationRights ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(accountType)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {accountType.is_active && (
                                  <DropdownMenuItem 
                                    onClick={() => handleDeactivate(accountType.id)}
                                    className="text-orange-600"
                                  >
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(accountType.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              {permissions.label}
                            </span>
                          )}
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

      {/* Account Type Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingAccountType ? "Edit Account Type" : "Create Account Type"}
            </DialogTitle>
            <DialogDescription>
              {editingAccountType
                ? "Update the account type details below"
                : "Add a new account type classification"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., CUSTOMER" 
                            {...field} 
                            disabled={!!editingAccountType}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique code for this account type (max 50 characters)
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
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., Customer" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Display name of the account type
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., asset, liability, equity" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional category classification
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
                        <Input 
                          placeholder="Brief description of this account type" 
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
                          Is this account type active and available for use?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={closeDialog}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createAccountTypeMutation.isPending || updateAccountTypeMutation.isPending}
                    >
                      {createAccountTypeMutation.isPending || updateAccountTypeMutation.isPending ? (
                        "Saving..."
                      ) : (
                        editingAccountType ? "Save Changes" : "Save"
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
