import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Edit, Trash2, Search, Settings, RefreshCw, ArrowLeft, Download } from 'lucide-react';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface NumberRange {
  id: number;
  numberRangeCode: string;
  description: string;
  numberRangeObject: string;
  fiscalYear?: string;
  rangeFrom: string;
  rangeTo: string;
  currentNumber?: string;
  externalNumbering: boolean;
  bufferSize: number;
  warningPercentage: number;
  companyCodeId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type FiscalYearVariant = {
  id: number;
  variant_id: string;
  description: string;
  posting_periods?: number;
  special_periods?: number;
  year_shift?: number;
  active?: boolean;
};

// Number Range Form Schema
const numberRangeSchema = z.object({
  numberRangeCode: z.string().min(1, "Code is required").max(2, "Code must be at most 2 characters"),
  description: z.string().min(1, "Description is required"),
  numberRangeObject: z.string().min(1, "Number range object is required"),
  fiscalYear: z.string().optional(),
  companyCodeId: z.number().min(0, "Company code is required"),
  rangeFrom: z.string().min(1, "Range from is required"),
  rangeTo: z.string().min(1, "Range to is required"),
  currentNumber: z.string().optional(),
  externalNumbering: z.boolean().default(false),
  bufferSize: z.number().min(1).default(100),
  warningPercentage: z.number().min(1).max(100).default(90),
});

export default function NumberRanges() {
  const queryClient = useQueryClient();
  const [numberRanges, setNumberRanges] = useState<NumberRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingNumberRange, setEditingNumberRange] = useState<NumberRange | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  // Fetch company codes from API
  const { data: companyCodesRaw = [], isLoading: companyCodesLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/company-code");
      if (!response.ok) throw new Error("Failed to fetch company codes");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Normalize company codes data (convert snake_case to camelCase)
  const normalizeCompanyCode = (cc: any) => ({
    id: cc.id,
    code: cc.code || '',
    name: cc.name || cc.description || '',
    description: cc.description || null,
    isActive: cc.is_active !== undefined ? cc.is_active : (cc.isActive !== undefined ? cc.isActive : true),
  });

  const companyCodesForDropdown = React.useMemo(() =>
    Array.isArray(companyCodesRaw)
      ? companyCodesRaw.map(normalizeCompanyCode).filter((cc: any) => cc.isActive && cc.code)
      : [],
    [companyCodesRaw]
  );

  // Fetch number range objects from API
  const { data: numberRangeObjectsRaw = [], isLoading: numberRangeObjectsLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/number-range-objects"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/number-range-objects?active=true");
      if (!response.ok) throw new Error("Failed to fetch number range objects");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Normalize number range objects data (convert snake_case to camelCase)
  const normalizeNumberRangeObject = (nro: any) => ({
    id: nro.id,
    code: nro.code || '',
    name: nro.name || '',
    description: nro.description || null,
    isActive: nro.is_active !== undefined ? nro.is_active : (nro.isActive !== undefined ? nro.isActive : true),
  });

  const numberRangeObjectsForDropdown = React.useMemo(() =>
    Array.isArray(numberRangeObjectsRaw)
      ? numberRangeObjectsRaw.map(normalizeNumberRangeObject).filter((nro: any) => nro.isActive && nro.code)
      : [],
    [numberRangeObjectsRaw]
  );

  // Fetch fiscal year variants from API
  const { data: fiscalYearVariantsRaw = [], isLoading: fiscalYearVariantsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/fiscal-year-variants'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/fiscal-year-variants');
      if (!response.ok) throw new Error('Failed to fetch fiscal year variants');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const fiscalYearVariants = React.useMemo(() =>
    Array.isArray(fiscalYearVariantsRaw)
      ? fiscalYearVariantsRaw.filter((v: any) => v.active !== false)
      : [],
    [fiscalYearVariantsRaw]
  );

  // Number range form setup
  const form = useForm<z.infer<typeof numberRangeSchema>>({
    resolver: zodResolver(numberRangeSchema),
    defaultValues: {
      numberRangeCode: '',
      description: '',
      numberRangeObject: '',
      fiscalYear: '',
      companyCodeId: 0,
      rangeFrom: '',
      rangeTo: '',
      currentNumber: '',
      externalNumbering: false,
      bufferSize: 100,
      warningPercentage: 90,
    },
  });

  useEffect(() => {
    fetchNumberRanges();
  }, []);

  // Set form values when editing or when open
  useEffect(() => {
    if (showDialog) {
      if (editingNumberRange) {
        form.reset({
          numberRangeCode: editingNumberRange.numberRangeCode,
          description: editingNumberRange.description,
          numberRangeObject: editingNumberRange.numberRangeObject,
          fiscalYear: editingNumberRange.fiscalYear || '',
          companyCodeId: editingNumberRange.companyCodeId,
          rangeFrom: editingNumberRange.rangeFrom,
          rangeTo: editingNumberRange.rangeTo,
          currentNumber: editingNumberRange.currentNumber || '',
          externalNumbering: editingNumberRange.externalNumbering,
          bufferSize: editingNumberRange.bufferSize,
          warningPercentage: editingNumberRange.warningPercentage,
        });
      } else {
        // Only reset to defaults if we are opening for creation
        // We shouldn't rely on dropdowns change to reset the form as it wipes user input
        // Check if the form is dirty to avoid overwriting user input if data loads late
        // But for "Create", we generally want fresh defaults

        // Only set defaults if we haven't touched the form yet or if we just opened it
        const currentValues = form.getValues();
        const isEmpty = !currentValues.numberRangeCode && !currentValues.description;

        if (isEmpty) {
          form.reset({
            numberRangeCode: '',
            description: '',
            numberRangeObject: numberRangeObjectsForDropdown.length > 0 ? numberRangeObjectsForDropdown[0].code : '',
            fiscalYear: '',
            companyCodeId: companyCodesForDropdown.length > 0 ? companyCodesForDropdown[0].id : 0,
            rangeFrom: '',
            rangeTo: '',
            currentNumber: '',
            externalNumbering: false,
            bufferSize: 100,
            warningPercentage: 90,
          });
        }
      }
    }
  }, [showDialog, editingNumberRange, form, companyCodesForDropdown, numberRangeObjectsForDropdown]);

  const fetchNumberRanges = async () => {
    try {
      const response = await fetch('/api/number-ranges');
      if (response.ok) {
        const data = await response.json();
        const transformedData = data.records?.map((record: any) => ({
          id: record.id,
          numberRangeCode: record.number_range_code,
          description: record.description,
          numberRangeObject: record.number_range_object,
          fiscalYear: record.fiscal_year,
          rangeFrom: record.range_from,
          rangeTo: record.range_to,
          currentNumber: record.current_number,
          externalNumbering: record.external_numbering,
          bufferSize: record.buffer_size,
          warningPercentage: record.warning_percentage,
          companyCodeId: record.company_code_id,
          isActive: record.is_active,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        })) || [];
        setNumberRanges(transformedData);
      }
    } catch (error) {
      console.error('Error fetching number ranges:', error);
      toast({
        title: "Error",
        description: "Failed to fetch number ranges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create number range mutation
  const createNumberRangeMutation = useMutation({
    mutationFn: (numberRange: z.infer<typeof numberRangeSchema>) => {
      return apiRequest('/api/number-ranges', {
        method: 'POST',
        body: JSON.stringify(numberRange),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Number range created successfully",
      });
      fetchNumberRanges();
      setShowDialog(false);
      setActiveTab('basic');
      form.reset();
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create number range",
        variant: "destructive",
      });
    },
  });

  // Update number range mutation
  const updateNumberRangeMutation = useMutation({
    mutationFn: (data: { id: number; numberRange: z.infer<typeof numberRangeSchema> }) => {
      return apiRequest(`/api/number-ranges/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.numberRange),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Number range updated successfully",
      });
      fetchNumberRanges();
      setShowDialog(false);
      setEditingNumberRange(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update number range",
        variant: "destructive",
      });
    },
  });

  // Delete number range mutation
  const deleteNumberRangeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/number-ranges/${id}`, {
        method: 'DELETE',
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Number range deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/number-ranges'] });
      fetchNumberRanges();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete number range",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof numberRangeSchema>) => {
    if (editingNumberRange) {
      updateNumberRangeMutation.mutate({ id: editingNumberRange.id, numberRange: values });
    } else {
      createNumberRangeMutation.mutate(values);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingNumberRange(null);
    setActiveTab('basic');
    form.reset();
  };

  const handleEdit = (numberRange: NumberRange) => {
    setEditingNumberRange(numberRange);
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this number range?')) {
      deleteNumberRangeMutation.mutate(id);
    }
  };

  const filteredNumberRanges = numberRanges.filter(numberRange =>
    numberRange.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    numberRange.numberRangeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    numberRange.numberRangeObject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    setLoading(true);
    toast({
      title: "Refreshing Data",
      description: "Loading latest number ranges...",
    });
    await fetchNumberRanges();
    toast({
      title: "Data Refreshed",
      description: "Number ranges have been updated successfully.",
    });
  };

  const handleExport = () => {
    if (filteredNumberRanges.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no number ranges to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredNumberRanges.map(nr => {
      const companyCode = companyCodesForDropdown.find((cc: any) => cc.id === nr.companyCodeId);
      const fiscalYear = fiscalYearVariants.find((fy: any) => fy.variant_id === nr.fiscalYear);

      return {
        'Code': nr.numberRangeCode,
        'Description': nr.description,
        'Object': nr.numberRangeObject,
        'Fiscal Year': fiscalYear ? `${fiscalYear.variant_id} - ${fiscalYear.description}` : (nr.fiscalYear || '-'),
        'Company Code': companyCode ? `${companyCode.code} — ${companyCode.name}` : (nr.companyCodeId ? `ID: ${nr.companyCodeId}` : '-'),
        'Range From': nr.rangeFrom,
        'Range To': nr.rangeTo,
        'Current Number': nr.currentNumber || '-',
        'External Numbering': nr.externalNumbering ? 'Yes' : 'No',
        'Buffer Size': nr.bufferSize,
        'Warning %': nr.warningPercentage,
        'Status': nr.isActive ? 'Active' : 'Inactive'
      };
    });

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `number-ranges-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredNumberRanges.length} number ranges to CSV file.`,
    });
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
            <h1 className="text-2xl font-bold">Number Ranges</h1>
            <p className="text-sm text-muted-foreground">
              Configure automated document numbering sequences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh number ranges data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Number Range
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search number ranges..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => window.open('/master-data/number-range-objects-config', '_blank')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configure Objects
        </Button>
      </div>

      {/* Number Ranges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Number Ranges</CardTitle>
          <CardDescription>
            All configured document numbering sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredNumberRanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No number ranges found. {searchTerm && `Try adjusting your search for "${searchTerm}".`}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNumberRanges.map((numberRange) => (
                    <TableRow key={numberRange.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono">{numberRange.numberRangeCode}</TableCell>
                      <TableCell>{numberRange.description}</TableCell>
                      <TableCell className="capitalize">{numberRange.numberRangeObject.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {(() => {
                          if (!numberRange.fiscalYear) return '-';
                          const variant = fiscalYearVariants.find((v: any) => v.variant_id === numberRange.fiscalYear);
                          return variant ? `${variant.variant_id} - ${variant.description}` : numberRange.fiscalYear;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (!numberRange.companyCodeId || numberRange.companyCodeId === 0) {
                            return '-';
                          }
                          const companyCode = companyCodesForDropdown.find((cc: any) => cc.id === numberRange.companyCodeId);
                          return companyCode ? `${companyCode.code} — ${companyCode.name}` : `ID: ${numberRange.companyCodeId}`;
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {numberRange.rangeFrom} - {numberRange.rangeTo}
                      </TableCell>
                      <TableCell className="font-mono">{numberRange.currentNumber || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Ext: {numberRange.externalNumbering ? '✓' : '✗'}</div>
                          <div>Warn: {numberRange.warningPercentage}%</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={numberRange.isActive ? "default" : "secondary"}>
                          {numberRange.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(numberRange)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(numberRange.id)}
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
        </CardContent>
      </Card>

      {/* Number Range Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingNumberRange ? "Edit Number Range" : "Create Number Range"}
            </DialogTitle>
            <DialogDescription>
              {editingNumberRange
                ? "Update the number range configuration below"
                : "Add a new document numbering sequence"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Configuration</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                  </TabsList>

                  {/* Basic Configuration Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="numberRangeCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 01"
                                {...field}
                                maxLength={2}
                                disabled={!!editingNumberRange}
                              />
                            </FormControl>
                            <FormDescription>
                              2-character unique code
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Accounting Documents 2026"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Description of this range
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="numberRangeObject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number Range Object*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            disabled={numberRangeObjectsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={numberRangeObjectsLoading ? "Loading..." : "Select number range object"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {numberRangeObjectsLoading ? (
                                <SelectItem value="loading" disabled>Loading number range objects...</SelectItem>
                              ) : numberRangeObjectsForDropdown.length === 0 ? (
                                <SelectItem value="none" disabled>No objects available</SelectItem>
                              ) : (
                                numberRangeObjectsForDropdown.map((nro: any) => (
                                  <SelectItem key={nro.id} value={nro.code}>
                                    {nro.name} ({nro.code})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Document type for this numbering sequence
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fiscalYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fiscal Year</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fiscal year (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fiscalYearVariantsLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : fiscalYearVariants.length === 0 ? (
                                  <SelectItem value="none" disabled>No fiscal years available</SelectItem>
                                ) : (
                                  fiscalYearVariants.map((variant: any) => (
                                    <SelectItem key={variant.variant_id} value={variant.variant_id}>
                                      {variant.variant_id} - {variant.description}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional - Fiscal year for this range
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyCodeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Code</FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(parseInt(val) || 0)}
                              value={field.value?.toString() || '0'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select company code" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companyCodesLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : companyCodesForDropdown.length === 0 ? (
                                  <SelectItem value="none" disabled>No company codes available</SelectItem>
                                ) : (
                                  <>
                                    <SelectItem value="0">-- None --</SelectItem>
                                    {companyCodesForDropdown.map((cc: any) => (
                                      <SelectItem key={cc.id} value={cc.id.toString()}>
                                        {cc.code} — {cc.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional - Company code assignment
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="rangeFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Range From*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 1000000000"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rangeTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Range To*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 1999999999"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currentNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 1000000001"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Advanced Settings Tab */}
                  <TabsContent value="advanced" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bufferSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buffer Size</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of numbers to buffer for performance
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="warningPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warning Percentage (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Alert when range is % full
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="externalNumbering"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>External Numbering</FormLabel>
                            <FormDescription>
                              Allow manual assignment of document numbers
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-between">
                    <div>
                      {activeTab !== "basic" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab('basic')}
                        >
                          Back
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                      >
                        Cancel
                      </Button>

                      <div className="flex gap-2">
                        {activeTab !== "advanced" && (
                          <Button
                            type="button"
                            onClick={() => setActiveTab('advanced')}
                          >
                            Next
                          </Button>
                        )}

                        <Button
                          type="submit"
                          variant={activeTab !== "advanced" ? "outline" : "default"}
                          disabled={createNumberRangeMutation.isPending || updateNumberRangeMutation.isPending}
                        >
                          {createNumberRangeMutation.isPending || updateNumberRangeMutation.isPending ? (
                            "Saving..."
                          ) : (
                            editingNumberRange ? "Save Changes" : "Create"
                          )}
                        </Button>
                      </div>
                    </div>
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