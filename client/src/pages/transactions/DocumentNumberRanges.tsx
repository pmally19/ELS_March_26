import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, RefreshCw, Plus, Edit2, Hash, Settings, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

//     Document Number Range Type Definitions
interface NumberRange {
  id: number;
  number_range_code: string;
  description: string;
  number_range_object: string;
  fiscal_year?: string;
  range_from: string;
  range_to: string;
  current_number: string;
  external_numbering: boolean;
  buffer_size: number;
  warning_percentage: number;
  company_code_id: number;
  company_code?: string;
  company_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Form validation schema
const numberRangeFormSchema = z.object({
  number_range_code: z.string()
    .min(1, "Number range code is required")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, underscores, and hyphens"),
  description: z.string()
    .min(1, "Description is required")
    .max(100, "Description must be 100 characters or less"),
  number_range_object: z.string()
    .min(1, "Object type is required")
    .max(50, "Object type must be 50 characters or less"),
  fiscal_year: z.string().optional(),
  range_from: z.string()
    .min(1, "Range from is required")
    .regex(/^\d+$/, "Range from must be numeric"),
  range_to: z.string()
    .min(1, "Range to is required")
    .regex(/^\d+$/, "Range to must be numeric"),
  current_number: z.string().optional(),
  external_numbering: z.boolean().default(false),
  buffer_size: z.number().min(1, "Buffer size must be at least 1").max(10000, "Buffer size must be at most 10000"),
  warning_percentage: z.number().min(1, "Warning percentage must be at least 1").max(100, "Warning percentage must be at most 100"),
  company_code_id: z.number().min(1, "Company code is required"),
});

// API Response interface
interface NumberRangesResponse {
  success: boolean;
  records: NumberRange[];
}

type NumberRangeFormData = z.infer<typeof numberRangeFormSchema>;

export default function DocumentNumberRanges() {
  const permissions = useAgentPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<NumberRange | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");

  // Form setup
  const form = useForm<NumberRangeFormData>({
    resolver: zodResolver(numberRangeFormSchema),
    defaultValues: {
      number_range_code: "",
      description: "",
      number_range_object: "",
      fiscal_year: new Date().getFullYear().toString(),
      range_from: "",
      range_to: "",
      current_number: "",
      external_numbering: false,
      buffer_size: 100,
      warning_percentage: 90,
      company_code_id: 1,
    },
  });

  // Query to fetch number ranges
  const { data: numberRangesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/number-ranges'],
    retry: false,
  });

  const numberRanges: NumberRange[] = (numberRangesResponse as NumberRangesResponse)?.records || [];

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await apiRequest('/api/master-data/company-codes');
      if (!res.ok) throw new Error('Failed to fetch company codes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: NumberRangeFormData) =>
      apiRequest("/api/number-ranges", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/number-ranges'] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Number range created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create number range",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NumberRangeFormData> }) =>
      apiRequest(`/api/number-ranges/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/number-ranges'] });
      setShowDialog(false);
      setSelectedRange(null);
      setIsEditing(false);
      form.reset();
      toast({
        title: "Success",
        description: "Number range updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update number range",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/number-ranges/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/number-ranges'] });
      toast({
        title: "Success",
        description: "Number range deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete number range",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: NumberRangeFormData) => {
    if (isEditing && selectedRange) {
      updateMutation.mutate({ id: selectedRange.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit click
  const handleEdit = (range: NumberRange) => {
    setSelectedRange(range);
    setIsEditing(true);
    form.reset({
      number_range_code: range.number_range_code,
      description: range.description,
      number_range_object: range.number_range_object,
      fiscal_year: range.fiscal_year || new Date().getFullYear().toString(),
      range_from: range.range_from,
      range_to: range.range_to,
      current_number: range.current_number,
      external_numbering: range.external_numbering,
      buffer_size: range.buffer_size,
      warning_percentage: range.warning_percentage,
      company_code_id: range.company_code_id,
    });
    setShowDialog(true);
  };

  // Handle create click
  const handleCreate = () => {
    setSelectedRange(null);
    setIsEditing(false);
    form.reset({
      number_range_code: "",
      description: "",
      number_range_object: "",
      fiscal_year: new Date().getFullYear().toString(),
      range_from: "",
      range_to: "",
      current_number: "",
      external_numbering: false,
      buffer_size: 100,
      warning_percentage: 90,
      company_code_id: parseInt(selectedCompany),
    });
    setShowDialog(true);
  };

  // Handle delete click
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this number range?")) {
      deleteMutation.mutate(id);
    }
  };

  // Helper functions
  const calculateUsagePercentage = (range: NumberRange): number => {
    const fromNum = parseInt(range.range_from);
    const toNum = parseInt(range.range_to);
    const currentNum = parseInt(range.current_number);

    if (fromNum >= toNum) return 0;
    return Math.min(((currentNum - fromNum) / (toNum - fromNum)) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: string): string => {
    if (num.length >= 10) {
      return num.replace(/(\d{4})(\d{3})(\d{3})/, '$1.$2.$3');
    }
    return num;
  };

  const handleBack = (): void => {
    window.history.back();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Document Number Ranges</h1>
          <Badge variant="secondary">    Standard</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companyCodes.map((cc: any) => (
                <SelectItem key={cc.id} value={cc.code}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Range
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{numberRanges.length}</div>
                <p className="text-xs text-gray-600">Total Ranges</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {numberRanges.filter(r => !r.external_numbering).length}
                </div>
                <p className="text-xs text-gray-600">Internal Numbering</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {numberRanges.filter(r => r.fiscal_year).length}
                </div>
                <p className="text-xs text-gray-600">Year Dependent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {numberRanges.filter(r => calculateUsagePercentage(r) > 80).length}
                </div>
                <p className="text-xs text-gray-600">High Usage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Document Number Range Configuration
          </CardTitle>
          <CardDescription>
            Manage document numbering for all business objects - Company Code {selectedCompany}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>From Number</TableHead>
                <TableHead>To Number</TableHead>
                <TableHead>Current Number</TableHead>
                <TableHead>Usage %</TableHead>
                <TableHead>Year Dep.</TableHead>
                <TableHead>External</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Loading number ranges...
                  </TableCell>
                </TableRow>
              ) : numberRanges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No number ranges found
                  </TableCell>
                </TableRow>
              ) : (
                numberRanges.map((range) => {
                  const usagePercentage = calculateUsagePercentage(range);
                  return (
                    <TableRow key={range.id}>
                      <TableCell className="font-mono font-medium">
                        {range.number_range_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{range.number_range_object}</div>
                          <div className="text-sm text-gray-600">{range.description}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatNumber(range.range_from)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatNumber(range.range_to)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold">{formatNumber(range.current_number)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageColor(usagePercentage)}`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{usagePercentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={range.fiscal_year ? "default" : "outline"}>
                          {range.fiscal_year ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={range.external_numbering ? "default" : "outline"}>
                          {range.external_numbering ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(range)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(range.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Range Configuration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Number Range" : "Create New Number Range"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? `Edit ${selectedRange?.number_range_code}` : "Configure a new document number range"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="number_range_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number Range Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., RV01, DR01"
                          className="uppercase"
                          maxLength={20}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Required. Max 20 characters. Use uppercase letters, numbers, underscores, and hyphens only.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number_range_object"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Object Type *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., RV - Sales Documents"
                          maxLength={50}
                        />
                      </FormControl>
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Sales Orders, Quotes, Returns"
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="range_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range From *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 0000000001"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="range_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range To *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 0999999999"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="current_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 0000024567"
                          className="font-mono"
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Optional. Defaults to range_from if not provided.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fiscal_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Year</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 2025"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buffer_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buffer Size</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="10000"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="warning_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning %</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="100"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 90)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="external_numbering"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">External Numbering</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Use external system for numbering
                        </div>
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
                <FormField
                  control={form.control}
                  name="company_code_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setSelectedRange(null);
                    setIsEditing(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {isEditing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}