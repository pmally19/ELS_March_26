import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChartOfAccounts {
  id: number;
  chart_id: string;
  description: string;
  language?: string;
  account_length?: number;
  controlling_integration?: boolean;
  group_chart_id?: number;
  group_chart_id_code?: string;
  group_chart_description?: string;
  active: boolean;
  manual_creation_allowed?: boolean;
  maintenance_language?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  tenantId?: string;
}

// Validation Schema
const chartOfAccountsSchema = z.object({
  chart_id: z.string().min(1, "Chart ID is required").max(10, "Chart ID must be at most 10 characters"),
  description: z.string().min(1, "Description is required").max(255, "Description must be at most 255 characters"),
  language: z.string().optional(),
  account_length: z.coerce.number().min(0, "Length must be positive").max(16, "Length cannot exceed 16").optional(),
  controlling_integration: z.boolean().default(false),
  group_chart_id: z.coerce.number().optional(),
  active: z.boolean().default(true),
  manual_creation_allowed: z.boolean().default(true),
  maintenance_language: z.string().optional(),
});

export default function ChartOfAccountsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartOfAccounts | null>(null);
  const [viewingChart, setViewingChart] = useState<ChartOfAccounts | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available languages from company codes
  const { data: availableLanguages = [] } = useQuery<string[]>({
    queryKey: ['/api/master-data/company-code-languages'],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch('/api/master-data/company-code');
      if (!res.ok) return [];
      const codes = await res.json() as any[];
      const languages = Array.from(new Set(codes.map((cc: any) => cc.language).filter(Boolean))) as string[];
      return languages.sort();
    },
  });

  // Fetch charts
  const { data: charts = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/chart-of-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/chart-of-accounts');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch charts of accounts');
      }
      return res.json();
    },
  });

  // Filter charts based on search query
  const filteredCharts = Array.isArray(charts) ? charts.filter((chart: ChartOfAccounts) =>
    chart.chart_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chart.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const form = useForm<z.infer<typeof chartOfAccountsSchema>>({
    resolver: zodResolver(chartOfAccountsSchema),
    defaultValues: {
      chart_id: "",
      description: "",
      language: "",
      account_length: undefined,
      controlling_integration: false,
      group_chart_id: undefined,
      active: true,
      manual_creation_allowed: true,
      maintenance_language: "",
    },
  });

  useEffect(() => {
    if (editingChart) {
      form.reset({
        chart_id: editingChart.chart_id,
        description: editingChart.description,
        language: editingChart.language || "",
        account_length: editingChart.account_length,
        controlling_integration: editingChart.controlling_integration || false,
        group_chart_id: editingChart.group_chart_id,
        active: editingChart.active,
        manual_creation_allowed: editingChart.manual_creation_allowed !== undefined ? editingChart.manual_creation_allowed : true,
        maintenance_language: editingChart.maintenance_language || "",
      });
    } else {
      form.reset({
        chart_id: "",
        description: "",
        language: "",
        account_length: undefined,
        controlling_integration: false,
        group_chart_id: undefined,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: "",
      });
    }
  }, [editingChart, form]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof chartOfAccountsSchema>) =>
      apiRequest('/api/master-data/chart-of-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/chart-of-accounts'] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Chart of Accounts created successfully" });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Chart of Accounts",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof chartOfAccountsSchema> }) =>
      apiRequest(`/api/master-data/chart-of-accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/chart-of-accounts'] });
      setIsDialogOpen(false);
      setEditingChart(null);
      toast({ title: "Success", description: "Chart of Accounts updated successfully" });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Chart of Accounts",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/chart-of-accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/chart-of-accounts'] });
      toast({ title: "Success", description: "Chart of Accounts deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Chart of Accounts",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: z.infer<typeof chartOfAccountsSchema>) => {
    // Ensure chart_id is uppercase
    const processedValues = {
      ...values,
      chart_id: values.chart_id.toUpperCase(),
      language: values.language || undefined,
      maintenance_language: values.maintenance_language || undefined,
      group_chart_id: values.group_chart_id || undefined,
    };

    if (editingChart) {
      updateMutation.mutate({ id: editingChart.id, data: processedValues });
    } else {
      createMutation.mutate(processedValues);
    }
  };

  const handleEdit = (chart: ChartOfAccounts) => {
    setEditingChart(chart);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this Chart of Accounts? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetails = (chart: ChartOfAccounts) => {
    setViewingChart(chart);
    setIsViewDialogOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "Data refreshed successfully" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
            <p className="text-muted-foreground">
              Define independent charts of accounts to structure G/L accounts
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => { setEditingChart(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Chart
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts List</CardTitle>
          <CardDescription>Manage your financial account structures</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chart ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>GL Length</TableHead>
                  <TableHead>Controlling Integration</TableHead>
                  <TableHead>Maintenance Lang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCharts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No charts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCharts.map((chart: ChartOfAccounts) => (
                    <TableRow key={chart.id}>
                      <TableCell className="font-medium">{chart.chart_id}</TableCell>
                      <TableCell>{chart.description}</TableCell>
                      <TableCell>{chart.language || "-"}</TableCell>
                      <TableCell>{chart.account_length || "-"}</TableCell>
                      <TableCell>
                        {chart.controlling_integration ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>{chart.maintenance_language || "-"}</TableCell>
                      <TableCell>
                        {chart.active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Blocked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(chart)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(chart)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(chart.id)}
                              className="text-red-600 focus:text-red-600"
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editingChart ? "Edit Chart of Accounts" : "Create Chart of Accounts"}</DialogTitle>
            <DialogDescription>
              {editingChart ? "Update existing chart details" : "Define a new chart of accounts structure"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="chart_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chart of Accounts ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., INCO"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={!!editingChart} // Disable ID editing for existing records
                        />
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
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., India Operational CoA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" disabled>Select Language</SelectItem>
                          {availableLanguages.map((lang) => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length of G/L Account Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 6"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Min 6, Max 16 digits</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="group_chart_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Chart of Accounts</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group chart (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {charts.filter((c: ChartOfAccounts) => c.chart_id !== form.getValues("chart_id")).map((c: ChartOfAccounts) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.chart_id} - {c.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Optional consolidation chart</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maintenance_language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Language</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" disabled>Select Language</SelectItem>
                          {availableLanguages.map((lang) => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-slate-50">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>Include in dropdowns</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="controlling_integration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                      <div className="space-y-0.5">
                        <FormLabel>Controlling Integration</FormLabel>
                        <FormDescription>Enable CO module integration</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manual_creation_allowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                      <div className="space-y-0.5">
                        <FormLabel>Manual Creation</FormLabel>
                        <FormDescription>Allow manual GL creation</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingChart ? "Update Chart" : "Create Chart"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Chart of Accounts — {viewingChart?.chart_id}</DialogTitle>
            <DialogDescription>{viewingChart?.description}</DialogDescription>
          </DialogHeader>
          {viewingChart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-sm font-medium text-gray-500">Chart ID</p><p className="text-sm font-semibold">{viewingChart.chart_id}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Description</p><p className="text-sm">{viewingChart.description}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Language</p><p className="text-sm">{viewingChart.language || '—'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">GL Account Length</p><p className="text-sm">{viewingChart.account_length ?? '—'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Maintenance Language</p><p className="text-sm">{viewingChart.maintenance_language || '—'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Status</p><p className="text-sm">{viewingChart.active ? 'Active' : 'Blocked'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Controlling Integration</p><p className="text-sm">{viewingChart.controlling_integration ? 'Yes' : 'No'}</p></div>
                <div><p className="text-sm font-medium text-gray-500">Manual Creation</p><p className="text-sm">{viewingChart.manual_creation_allowed ? 'Yes' : 'No'}</p></div>
                {viewingChart.group_chart_id_code && (
                  <div className="col-span-2"><p className="text-sm font-medium text-gray-500">Group Chart</p><p className="text-sm">{viewingChart.group_chart_id_code} — {viewingChart.group_chart_description}</p></div>
                )}
              </div>

              <Separator />

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
                <div><dt className="text-sm font-medium text-gray-500">Created By</dt><dd className="text-sm text-gray-900">{viewingChart.created_by ?? '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Updated By</dt><dd className="text-sm text-gray-900">{viewingChart.updated_by ?? viewingChart.created_by ?? '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Created At</dt><dd className="text-sm text-gray-900">{viewingChart.created_at ? new Date(viewingChart.created_at).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Updated At</dt><dd className="text-sm text-gray-900">{viewingChart.updated_at ? new Date(viewingChart.updated_at).toLocaleString() : '—'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Tenant ID</dt><dd className="text-sm text-gray-900">{viewingChart.tenantId ?? '—'}</dd></div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}