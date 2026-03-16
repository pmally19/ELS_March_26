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
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, MoreHorizontal, PowerOff, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Accounting Principle type (matches database schema)
type AccountingPrinciple = {
  id: number;
  code: string;
  name: string;
  description?: string;
  standard_type?: string;
  jurisdiction?: string;
  effective_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Accounting Principle Form Schema
const accountingPrincipleSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  standard_type: z.enum(["INTERNATIONAL", "NATIONAL", "REGIONAL"]).optional().or(z.literal("")),
  jurisdiction: z.string().max(100).optional(),
  effective_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Accounting Principles Management Page
export default function AccountingPrinciples() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPrinciple, setEditingPrinciple] = useState<AccountingPrinciple | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Fetch accounting principles directly
  const [principles, setPrinciples] = useState<AccountingPrinciple[]>([]);
  const [filteredPrinciples, setFilteredPrinciples] = useState<AccountingPrinciple[]>([]);
  const [principlesLoading, setPrinciplesLoading] = useState(true);
  const [principlesError, setPrinciplesError] = useState<Error | null>(null);

  // Fetch data function
  const fetchData = async () => {
    try {
      setPrinciplesLoading(true);
      const response = await fetch("/api/master-data/accounting-principles", {
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
      setPrinciples(data);
      setFilteredPrinciples(data);
      setPrinciplesLoading(false);
    } catch (error) {
      console.error("Error fetching accounting principles:", error);
      setPrinciplesError(error instanceof Error ? error : new Error('Failed to fetch accounting principles'));
      setPrinciplesLoading(false);
    }
  };

  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest accounting principles...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Accounting principles have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter principles based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPrinciples(principles);
    } else {
      setFilteredPrinciples(
        principles.filter(
          (principle) =>
            principle.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            principle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (principle.description && principle.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (principle.standard_type && principle.standard_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (principle.jurisdiction && principle.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    }
  }, [searchQuery, principles]);

  // Accounting principle form setup
  const form = useForm<z.infer<typeof accountingPrincipleSchema>>({
    resolver: zodResolver(accountingPrincipleSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      standard_type: undefined,
      jurisdiction: "",
      effective_date: "",
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingPrinciple) {
      form.reset({
        code: editingPrinciple.code,
        name: editingPrinciple.name,
        description: editingPrinciple.description || "",
        standard_type: editingPrinciple.standard_type ? (editingPrinciple.standard_type as "INTERNATIONAL" | "NATIONAL" | "REGIONAL") : undefined,
        jurisdiction: editingPrinciple.jurisdiction || "",
        effective_date: editingPrinciple.effective_date ? editingPrinciple.effective_date.split('T')[0] : "",
        is_active: editingPrinciple.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        standard_type: undefined,
        jurisdiction: "",
        effective_date: "",
        is_active: true,
      });
    }
  }, [editingPrinciple, form]);

  // Create accounting principle mutation
  const createPrincipleMutation = useMutation({
    mutationFn: (principle: z.infer<typeof accountingPrincipleSchema>) => {
      const payload = {
        ...principle,
        standard_type: (!principle.standard_type || (principle.standard_type as any) === "NONE") ? undefined : principle.standard_type,
        jurisdiction: principle.jurisdiction || undefined,
        effective_date: principle.effective_date || undefined,
        description: principle.description || undefined,
      };
      return apiRequest(`/api/master-data/accounting-principles`, {
        method: "POST",
        body: JSON.stringify(payload)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to create accounting principle");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Accounting Principle created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Accounting Principle",
        variant: "destructive",
      });
    },
  });

  // Update accounting principle mutation
  const updatePrincipleMutation = useMutation({
    mutationFn: (data: { id: number; principle: z.infer<typeof accountingPrincipleSchema> }) => {
      const payload = {
        ...data.principle,
        standard_type: (!data.principle.standard_type || (data.principle.standard_type as any) === "NONE") ? undefined : data.principle.standard_type,
        jurisdiction: data.principle.jurisdiction || undefined,
        effective_date: data.principle.effective_date || undefined,
        description: data.principle.description || undefined,
      };
      return apiRequest(`/api/master-data/accounting-principles/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to update accounting principle");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Accounting Principle updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingPrinciple(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Accounting Principle",
        variant: "destructive",
      });
    },
  });

  // Delete accounting principle mutation
  const deletePrincipleMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/accounting-principles/${id}`, {
        method: "DELETE",
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || err.message || "Failed to delete accounting principle");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Accounting Principle deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/accounting-principles"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Accounting Principle",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof accountingPrincipleSchema>) => {
    if (editingPrinciple) {
      updatePrincipleMutation.mutate({ id: editingPrinciple.id, principle: values });
    } else {
      createPrincipleMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingPrinciple(null);
    form.reset();
  };

  // Function to handle editing an accounting principle
  const handleEdit = (principle: AccountingPrinciple) => {
    setEditingPrinciple(principle);
    setShowDialog(true);
  };

  // Function to handle deleting an accounting principle
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this accounting principle?")) {
      deletePrincipleMutation.mutate(id);
    }
  };

  // Function to handle exporting principles to CSV
  const handleExport = () => {
    if (filteredPrinciples.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no accounting principles to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = filteredPrinciples.map(principle => ({
      'Code': principle.code,
      'Name': principle.name,
      'Description': principle.description || '',
      'Standard Type': principle.standard_type || '',
      'Jurisdiction': principle.jurisdiction || '',
      'Effective Date': principle.effective_date || '',
      'Status': principle.is_active ? 'Active' : 'Inactive'
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
    link.setAttribute('download', `accounting-principles-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "Accounting principles exported to CSV successfully.",
    });
  };

  if (principlesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading accounting principles...</p>
        </div>
      </div>
    );
  }

  if (principlesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>{principlesError.message}</CardDescription>
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
          <h1 className="text-3xl font-bold">Accounting Principles</h1>
          <p className="text-muted-foreground mt-1">
            Manage accounting standards and principles for financial reporting
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
              Add Accounting Principle
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Accounting Principles</CardTitle>
          <CardDescription>Filter accounting principles by code, name, description, or jurisdiction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by code, name, description, standard type, or jurisdiction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounting Principles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounting Principles</CardTitle>
          <CardDescription>
            {filteredPrinciples.length} accounting principle{filteredPrinciples.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPrinciples.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Accounting Principles Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search criteria." : "Get started by creating your first accounting principle."}
              </p>
              {!searchQuery && permissions.canCreate && (
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Accounting Principle
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Standard Type</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrinciples.map((principle) => (
                  <TableRow key={principle.id}>
                    <TableCell className="font-medium">{principle.code}</TableCell>
                    <TableCell>{principle.name}</TableCell>
                    <TableCell>
                      {principle.standard_type ? (
                        <Badge variant="outline">{principle.standard_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{principle.jurisdiction || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {principle.effective_date ? new Date(principle.effective_date).toLocaleDateString() : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={principle.is_active ? "default" : "secondary"}>
                        {principle.is_active ? "Active" : "Inactive"}
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
                            <DropdownMenuItem onClick={() => handleEdit(principle)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {permissions.hasDataModificationRights && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(principle.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrinciple ? "Edit Accounting Principle" : "Add Accounting Principle"}
            </DialogTitle>
            <DialogDescription>
              {editingPrinciple 
                ? "Update the accounting principle details below." 
                : "Fill in the details to create a new accounting principle."}
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
                        <Input placeholder="IFRS" {...field} maxLength={20} />
                      </FormControl>
                      <FormDescription>Unique code for the accounting principle</FormDescription>
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
                        <Input placeholder="International Financial Reporting Standards" {...field} maxLength={100} />
                      </FormControl>
                      <FormDescription>Display name of the accounting principle</FormDescription>
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
                        placeholder="Detailed description of the accounting principle..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>Optional description of the accounting principle</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="standard_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Type</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "NONE" ? undefined : value)} 
                        value={field.value || "NONE"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select standard type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="INTERNATIONAL">International</SelectItem>
                          <SelectItem value="NATIONAL">National</SelectItem>
                          <SelectItem value="REGIONAL">Regional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Type of accounting standard</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <FormControl>
                        <Input placeholder="Country or region" {...field} maxLength={100} />
                      </FormControl>
                      <FormDescription>Country or region where this standard applies</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Date when this standard became effective</FormDescription>
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
                      <FormDescription>Accounting principle is active and available for use</FormDescription>
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
                  disabled={createPrincipleMutation.isPending || updatePrincipleMutation.isPending}
                >
                  {editingPrinciple ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

