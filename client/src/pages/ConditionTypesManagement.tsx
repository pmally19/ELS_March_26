import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Copy, Calculator, DollarSign, Percent, Hash, CheckCircle, ArrowLeft, HelpCircle, RefreshCw, Search, Eye, Download, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const conditionTypeSchema = z.object({
  condition_code: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, "Only uppercase letters and numbers"),
  condition_name: z.string().min(3).max(100),
  condition_category: z.string().min(1, "Category is required"),
  calculation_type: z.string().min(1, "Calculation type is required"),
  description: z.string().optional(),
  default_value: z.number().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  sequence_number: z.number().min(1).max(99),
  is_mandatory: z.boolean().default(false),
  is_active: z.boolean().default(true),
  account_key: z.string().optional(),
  condition_class_id: z.number().nullable().optional()
});

type ConditionType = z.infer<typeof conditionTypeSchema> & {
  id?: number;
  company_code_id?: number;
  created_at?: string;
  updated_at?: string;
};

export default function ConditionTypesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ConditionType | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCondition, setViewingCondition] = useState<ConditionType | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ConditionType>({
    resolver: zodResolver(conditionTypeSchema),
    defaultValues: {
      condition_code: "",
      condition_name: "",
      condition_category: "Revenue",
      calculation_type: "percentage",
      description: "",
      default_value: 0,
      sequence_number: 1,
      is_mandatory: false,
      is_active: true
    }
  });

  // Fetch condition types
  const { data: conditionTypes = [], isLoading, error } = useQuery({
    queryKey: ['/api/condition-types', selectedCompany],
    queryFn: async () => {
      const response = await apiRequest(`/api/condition-types?company_code=${selectedCompany}`);
      return await response.json();
    },
    enabled: !!selectedCompany
  });

  // Fetch companies from API
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await apiRequest('/api/master-data/company-codes');
      if (!res.ok) throw new Error('Failed to fetch company codes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch calculation methods from API
  const { data: calculationMethods = [] } = useQuery({
    queryKey: ['/api/condition-types/calculation-methods'],
    queryFn: async () => {
      const res = await apiRequest('/api/condition-types/calculation-methods');
      if (!res.ok) throw new Error('Failed to fetch calculation methods');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch condition categories from API
  const { data: conditionCategories = [] } = useQuery({
    queryKey: ['/api/condition-types/condition-categories'],
    queryFn: async () => {
      const res = await apiRequest('/api/condition-types/condition-categories');
      if (!res.ok) throw new Error('Failed to fetch condition categories');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch account keys from API
  const { data: accountKeys = [] } = useQuery({
    queryKey: ['/api/master-data/account-keys'],
    queryFn: async () => {
      const res = await apiRequest('/api/master-data/account-keys');
      if (!res.ok) throw new Error('Failed to fetch account keys');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch condition classes from API
  const { data: conditionClasses = [] } = useQuery({
    queryKey: ['/api/condition-types/condition-classes'],
    queryFn: async () => {
      const res = await apiRequest('/api/condition-types/condition-classes');
      if (!res.ok) throw new Error('Failed to fetch condition classes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Calculator State
  const [calcQuantity, setCalcQuantity] = useState(1);
  const [calcItems, setCalcItems] = useState<Record<string, { selected: boolean, value: number }>>({});

  // Initialize calculator items
  useEffect(() => {
    if (conditionTypes) {
      setCalcItems(prev => {
        const newItems: Record<string, { selected: boolean, value: number }> = { ...prev };
        conditionTypes.forEach((ct: ConditionType) => {
          if (!newItems[ct.condition_code]) {
            newItems[ct.condition_code] = {
              selected: ct.is_active,
              value: Number(ct.default_value) || 0
            };
          }
        });
        return newItems;
      });
    }
  }, [conditionTypes]);

  const calculatePricing = () => {
    if (!conditionTypes || Object.keys(calcItems).length === 0) return { breakdown: [], total: 0, subtotal: 0, tax: 0 };

    const sortedConditions = [...conditionTypes].sort((a, b) => a.sequence_number - b.sequence_number);
    let currentTotal = 0;
    const breakdown: any[] = [];
    let totalTax = 0;

    sortedConditions.forEach(condition => {
      const item = calcItems[condition.condition_code];
      if (!item || !item.selected) return;

      let amount = 0;
      let isPercentage = condition.calculation_type === 'percentage';

      // Calculate amount
      if (isPercentage) {
        // All percentage calculations should be on the running total (currentTotal)
        // This matches standard pricing behavior (SAP, etc.)
        amount = (Number(currentTotal) * Number(item.value)) / 100;
      } else {
        // Fixed amount
        amount = Number(item.value);
      }

      // Determine operation based on category
      let operation = 'add';
      if (condition.condition_category === 'Discount') {
        operation = 'subtract';
        amount = -Math.abs(amount);
      } else if (condition.condition_category === 'Cost') {
        // ALL Cost items are informational only - never affect customer price
        // Cost items are used for margin analysis and internal tracking only
        operation = 'info';
      }

      // Update running total (except for info-only items)
      if (operation !== 'info') {
        currentTotal += amount;
      }

      // Track taxes separately
      if (condition.condition_category === 'Tax') {
        totalTax += amount;
      }

      breakdown.push({
        ...condition,
        calculatedAmount: amount,
        isBase: false
      });
    });

    // Calculate total cost from Cost category items
    const totalCost = breakdown
      .filter(item => item.condition_category === 'Cost')
      .reduce((sum, item) => sum + Math.abs(item.calculatedAmount), 0);

    // Calculate profit margin on NET VALUE (before tax)
    // Tax goes to government, not included in business margin
    const netValue = currentTotal - totalTax;
    const profitMargin = netValue - totalCost;
    const marginPercent = netValue > 0 ? (profitMargin / netValue) * 100 : 0;

    return {
      breakdown,
      total: Number(currentTotal || 0),
      subtotal: Number((currentTotal - totalTax) || 0),
      tax: Number(totalTax || 0),
      totalCost: Number(totalCost || 0),
      profitMargin: Number(profitMargin || 0),
      marginPercent: Number(marginPercent || 0)
    };
  };

  const pricingResult = calculatePricing();

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: async (data: ConditionType) => {
      const url = editingCondition
        ? `/api/condition-types/${editingCondition.id}`
        : '/api/condition-types';
      const method = editingCondition ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify({ ...data, company_code: selectedCompany })
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/condition-types'] });
      setIsDialogOpen(false);
      setEditingCondition(null);
      form.reset();
      toast({
        title: "Success",
        description: `Condition type ${editingCondition ? 'updated' : 'created'} successfully`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingCondition ? 'update' : 'create'} condition type`,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/condition-types/${id}`, { method: 'DELETE' });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/condition-types'] });
      toast({
        title: "Success",
        description: "Condition type deleted successfully"
      });
    }
  });

  // Template definitions
  const businessTemplates = {
    restaurant: [
      { condition_code: "STD1", condition_name: "Base Menu Price", condition_category: "Revenue", calculation_type: "fixed", description: "Standard menu item base price", default_value: 0, sequence_number: 1 },
      { condition_code: "CDIS01", condition_name: "Menu Add-ons", condition_category: "Revenue", calculation_type: "fixed", description: "Additional menu items and customizations", default_value: 0, sequence_number: 2 },
      { condition_code: "FEE01", condition_name: "Delivery Fee", condition_category: "Revenue", calculation_type: "fixed", description: "Delivery and service charges", default_value: 5, sequence_number: 3 },
      { condition_code: "TAX01", condition_name: "Sales Tax", condition_category: "Tax", calculation_type: "percentage", description: "State and local sales tax", default_value: 8.5, sequence_number: 4 },
      { condition_code: "COST01", condition_name: "Food Cost", condition_category: "Cost", calculation_type: "percentage", description: "Cost of ingredients and preparation", default_value: 30, sequence_number: 5 }
    ],
    retail: [
      { condition_code: "STD1", condition_name: "Product Price", condition_category: "Revenue", calculation_type: "fixed", description: "Base product selling price", default_value: 0, sequence_number: 1 },
      { condition_code: "FEE01", condition_name: "Shipping Fee", condition_category: "Revenue", calculation_type: "fixed", description: "Shipping and handling charges", default_value: 0, sequence_number: 2 },
      { condition_code: "CDIS01", condition_name: "Customer Discount", condition_category: "Discount", calculation_type: "percentage", description: "Customer loyalty discounts", default_value: 5, sequence_number: 3 },
      { condition_code: "CDIS02", condition_name: "Volume Discount", condition_category: "Discount", calculation_type: "percentage", description: "Bulk purchase discounts", default_value: 10, sequence_number: 4 },
      { condition_code: "CDIS03", condition_name: "Seasonal Discount", condition_category: "Discount", calculation_type: "percentage", description: "Seasonal and promotional discounts", default_value: 15, sequence_number: 5 },
      { condition_code: "TAX01", condition_name: "Sales Tax", condition_category: "Tax", calculation_type: "percentage", description: "State and local sales tax", default_value: 8.25, sequence_number: 6 },
      { condition_code: "COST01", condition_name: "Cost of Goods Sold", condition_category: "Cost", calculation_type: "percentage", description: "Product cost basis", default_value: 60, sequence_number: 7 }
    ],
    manufacturing: [
      { condition_code: "COST01", condition_name: "Material Cost", condition_category: "Cost", calculation_type: "fixed", description: "Raw material and component costs", default_value: 0, sequence_number: 1 },
      { condition_code: "COST02", condition_name: "Labor Cost", condition_category: "Cost", calculation_type: "fixed", description: "Direct labor and manufacturing time", default_value: 0, sequence_number: 2 },
      { condition_code: "COST03", condition_name: "Overhead Allocation", condition_category: "Cost", calculation_type: "percentage", description: "Manufacturing overhead allocation", default_value: 25, sequence_number: 3 },
      { condition_code: "FEE01", condition_name: "Freight Charges", condition_category: "Revenue", calculation_type: "fixed", description: "Transportation and logistics fees", default_value: 0, sequence_number: 4 },
      { condition_code: "CDIS04", condition_name: "Profit Margin", condition_category: "Revenue", calculation_type: "percentage", description: "Target profit margin", default_value: 20, sequence_number: 5 }
    ],
    healthcare: [
      { condition_code: "STD1", condition_name: "Service Fee", condition_category: "Revenue", calculation_type: "fixed", description: "Base healthcare service fee", default_value: 0, sequence_number: 1 },
      { condition_code: "CDIS01", condition_name: "Insurance Co-pay", condition_category: "Discount", calculation_type: "fixed", description: "Patient insurance co-payment", default_value: 0, sequence_number: 2 },
      { condition_code: "COST01", condition_name: "Medical Supplies", condition_category: "Cost", calculation_type: "fixed", description: "Medical supplies and consumables", default_value: 0, sequence_number: 3 },
      { condition_code: "FEE01", condition_name: "Facility Charge", condition_category: "Revenue", calculation_type: "fixed", description: "Healthcare facility usage fee", default_value: 0, sequence_number: 4 },
      { condition_code: "TAX02", condition_name: "Healthcare Tax", condition_category: "Tax", calculation_type: "percentage", description: "Healthcare-specific taxes and fees", default_value: 3, sequence_number: 5 }
    ],
    professional: [
      { condition_code: "STD1", condition_name: "Hourly Rate", condition_category: "Revenue", calculation_type: "fixed", description: "Professional service hourly rate", default_value: 0, sequence_number: 1 },
      { condition_code: "FEE01", condition_name: "Project Fee", condition_category: "Revenue", calculation_type: "fixed", description: "Fixed project and consultation fees", default_value: 0, sequence_number: 2 },
      { condition_code: "COST01", condition_name: "Expense Reimbursement", condition_category: "Cost", calculation_type: "fixed", description: "Client reimbursable expenses", default_value: 0, sequence_number: 3 },
      { condition_code: "TAX01", condition_name: "Professional Tax", condition_category: "Tax", calculation_type: "percentage", description: "Professional services tax", default_value: 6, sequence_number: 4 },
      { condition_code: "CDIS01", condition_name: "Client Discount", condition_category: "Discount", calculation_type: "percentage", description: "Long-term client discounts", default_value: 5, sequence_number: 5 }
    ],
    construction: [
      { condition_code: "COST01", condition_name: "Labor Cost", condition_category: "Cost", calculation_type: "fixed", description: "Construction labor and crew costs", default_value: 0, sequence_number: 1 },
      { condition_code: "COST02", condition_name: "Materials Cost", condition_category: "Cost", calculation_type: "fixed", description: "Building materials and supplies", default_value: 0, sequence_number: 2 },
      { condition_code: "FEE01", condition_name: "Equipment Rental", condition_category: "Cost", calculation_type: "fixed", description: "Heavy equipment and tool rental", default_value: 0, sequence_number: 3 },
      { condition_code: "COST03", condition_name: "Project Overhead", condition_category: "Cost", calculation_type: "percentage", description: "Project management and overhead", default_value: 15, sequence_number: 4 },
      { condition_code: "TAX02", condition_name: "Permits & Fees", condition_category: "Tax", calculation_type: "fixed", description: "Construction permits and regulatory fees", default_value: 0, sequence_number: 5 }
    ]
  };

  // Apply Template function
  const applyTemplate = async (templateType: string) => {
    if (!selectedCompany) {
      toast({
        title: "Error",
        description: "Please select a company first"
      });
      return;
    }

    const template = businessTemplates[templateType as keyof typeof businessTemplates];
    if (!template) {
      toast({
        title: "Error",
        description: "Template not found"
      });
      return;
    }

    try {
      let createdCount = 0;
      let skippedCount = 0;

      // Create each condition type from the template
      for (const conditionType of template) {
        try {
          await apiRequest('/api/condition-types', {
            method: 'POST',
            body: JSON.stringify({
              ...conditionType,
              company_code: selectedCompany,
              access_sequence: 'STDCUST'
            })
          });
          createdCount++;
        } catch (err: any) {
          if (err.message?.includes('already exists')) {
            skippedCount++;
          }
        }
      }

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/condition-types'] });

      if (createdCount > 0) {
        toast({
          title: "Success",
          description: `Created ${createdCount} condition type(s)${skippedCount > 0 ? `, skipped ${skippedCount} existing` : ''}.`
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Already Applied",
          description: `All ${skippedCount} condition types already exist.`
        });
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: `Failed to apply ${templateType} template. Some condition types may already exist.`,
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: ConditionType) => {
    createMutation.mutate(data);
  };

  const handleCreate = () => {
    setEditingCondition(null);
    form.reset({
      condition_code: "",
      condition_name: "",
      condition_category: "Revenue",
      calculation_type: "percentage",
      description: "",
      default_value: 0,
      sequence_number: 1,
      is_mandatory: false,
      is_active: true,
      condition_class_id: null
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (condition: ConditionType) => {
    setEditingCondition(condition);
    form.reset(condition);
    setIsDialogOpen(true);
  };

  const handleCopy = (condition: ConditionType) => {
    const newCondition = {
      ...condition,
      condition_code: `${condition.condition_code}_COPY`,
      condition_name: `${condition.condition_name} (Copy)`
    };
    form.reset(newCondition);
    setEditingCondition(null);
    setIsDialogOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Revenue': return <DollarSign className="h-4 w-4" />;
      case 'Cost': return <Calculator className="h-4 w-4" />;
      case 'Discount': return <Percent className="h-4 w-4" />;
      case 'Tax': return <Hash className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Revenue': return 'bg-green-100 text-green-800';
      case 'Cost': return 'bg-red-100 text-red-800';
      case 'Discount': return 'bg-blue-100 text-blue-800';
      case 'Tax': return 'bg-purple-100 text-purple-800';
      case 'Surcharge': return 'bg-orange-100 text-orange-800';
      case 'Fee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!conditionTypes || conditionTypes.length === 0) {
      toast({
        title: "No Data",
        description: "No condition types to export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Code",
      "Name",
      "Category",
      "Calculation Type",
      "Account Key",
      "Default Value",
      "Min Value",
      "Max Value",
      "Sequence",
      "Mandatory",
      "Active",
      "Description"
    ];

    const csvData = conditionTypes.map((ct: ConditionType) => [
      ct.condition_code,
      ct.condition_name,
      ct.condition_category,
      ct.calculation_type,
      ct.account_key || "",
      ct.default_value || "",
      ct.min_value || "",
      ct.max_value || "",
      ct.sequence_number,
      ct.is_mandatory ? "Yes" : "No",
      ct.is_active ? "Yes" : "No",
      ct.description || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `condition-types-${selectedCompany}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${conditionTypes.length} condition types to CSV`
    });
  };

  // View details handler
  const handleViewDetails = (condition: ConditionType) => {
    setViewingCondition(condition);
    setIsViewDialogOpen(true);
  };

  // Filter condition types based on search query
  const filteredConditionTypes = conditionTypes?.filter((ct: ConditionType) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ct.condition_code?.toLowerCase().includes(query) ||
      ct.condition_name?.toLowerCase().includes(query) ||
      ct.condition_category?.toLowerCase().includes(query) ||
      ct.description?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Condition Types Management</h1>
            <p className="text-muted-foreground">Configure pricing components for your business</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies?.map((company: any) => (
                <SelectItem key={company.code} value={company.code}>
                  {company.code} - {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCondition(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Condition Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCondition ? 'Edit' : 'Create'} Condition Type
                </DialogTitle>
                <DialogDescription>
                  Define how pricing components are calculated in your business processes
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="condition_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., PIZZA_BASE" {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique code (uppercase letters/numbers only)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sequence_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sequence</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Order of calculation (1-99)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="condition_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Base Pizza Price" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="condition_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {conditionCategories.length === 0 ? (
                                <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                              ) : (
                                conditionCategories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.category_type}>
                                    {category.category_name}
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
                      control={form.control}
                      name="calculation_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calculation Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {calculationMethods.length === 0 ? (
                                <SelectItem value="loading" disabled>Loading methods...</SelectItem>
                              ) : (
                                calculationMethods.map((method: any) => (
                                  <SelectItem key={method.id} value={method.calculation_type}>
                                    {method.method_name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="account_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Key (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account key (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountKeys.length === 0 ? (
                              <SelectItem value="none" disabled>Loading account keys...</SelectItem>
                            ) : (
                              accountKeys.map((key: any) => (
                                <SelectItem key={key.id} value={key.code}>
                                  {key.code} - {key.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          GL account determination key (leave empty if not needed)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition_class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition Class (Optional)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                          value={field.value ? String(field.value) : "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {conditionClasses.map((cls: any) => (
                              <SelectItem key={cls.id} value={String(cls.id)}>
                                {cls.class_code} - {cls.class_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Condition class grouping (A=Discount, B=Prices, D=Taxes)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="default_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="min_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe how this condition type is used..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-6">
                    <FormField
                      control={form.control}
                      name="is_mandatory"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Mandatory</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Active</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {editingCondition ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search condition types..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/condition-types'] })}
          disabled={isLoading}
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Condition Types</TabsTrigger>
          <TabsTrigger value="calculator">Pricing Calculator</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Condition Types for {selectedCompany}</CardTitle>
              <CardDescription>
                Manage your pricing components and calculation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading condition types...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center text-red-600">
                    <p className="font-semibold mb-2">Error loading condition types</p>
                    <p className="text-sm">{error.message || 'Unknown error occurred'}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-4"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account Key</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConditionTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">
                              {searchQuery ? "No matching condition types found" : "No condition types found"}
                            </p>
                            <p className="text-sm mb-4">
                              {searchQuery ? "Try a different search term" : "Create your first condition type to get started with pricing rules."}
                            </p>
                            {!searchQuery && (
                              <Button onClick={handleCreate} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Condition Type
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConditionTypes.map((condition: ConditionType) => (
                        <TableRow key={condition.id}>
                          <TableCell className="font-mono text-sm">
                            {condition.sequence_number}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {condition.condition_code}
                          </TableCell>
                          <TableCell>{condition.condition_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getCategoryColor(condition.condition_category)}
                            >
                              {getCategoryIcon(condition.condition_category)}
                              <span className="ml-1">{condition.condition_category}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>{condition.calculation_type}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {condition.account_key || '-'}
                          </TableCell>
                          <TableCell>
                            {condition.default_value !== undefined ?
                              (condition.calculation_type === 'percentage' ?
                                `${condition.default_value}%` :
                                `$${condition.default_value}`) :
                              '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={condition.is_active ? "default" : "secondary"}>
                              {condition.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(condition)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(condition)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopy(condition)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(condition.id!)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pricing Simulation</CardTitle>
                    <CardDescription>
                      Configure active pricing components and values
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="qty">Quantity:</Label>
                    <Input
                      id="qty"
                      type="number"
                      value={calcQuantity}
                      onChange={(e) => setCalcQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Calculation</TableHead>
                      <TableHead className="w-[150px]">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conditionTypes && conditionTypes
                      .sort((a: ConditionType, b: ConditionType) => a.sequence_number - b.sequence_number)
                      .map((condition: ConditionType) => (
                        <TableRow key={condition.id} className={!calcItems[condition.condition_code]?.selected ? "opacity-50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={calcItems[condition.condition_code]?.selected || false}
                              onCheckedChange={(checked) => {
                                setCalcItems(prev => ({
                                  ...prev,
                                  [condition.condition_code]: {
                                    ...prev[condition.condition_code],
                                    selected: checked === true
                                  }
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{condition.condition_name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{condition.condition_code}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getCategoryColor(condition.condition_category)}>
                              {condition.condition_category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {condition.calculation_type}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <span className="absolute left-2 top-2.5 text-muted-foreground text-xs">
                                {condition.calculation_type === 'percentage' ? '%' : '$'}
                              </span>
                              <Input
                                type="number"
                                className="pl-6 h-8"
                                value={calcItems[condition.condition_code]?.value || 0}
                                onChange={(e) => {
                                  setCalcItems(prev => ({
                                    ...prev,
                                    [condition.condition_code]: {
                                      ...prev[condition.condition_code],
                                      value: parseFloat(e.target.value) || 0
                                    }
                                  }));
                                }}
                                disabled={!calcItems[condition.condition_code]?.selected}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Price Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pricingResult.breakdown.map((item, index) => (
                      <div key={index} className={`flex justify-between items-center text-sm ${item.condition_category === 'Cost' ? 'text-muted-foreground italic' : ''}`}>
                        <span>
                          {item.condition_name}
                          {item.calculation_type === 'percentage' && <span className="text-xs text-muted-foreground ml-1">({calcItems[item.condition_code]?.value}%)</span>}
                        </span>
                        <span className="font-mono">
                          {item.condition_category === 'Discount' ? '-' : ''}
                          ${Math.abs(item.calculatedAmount * calcQuantity).toFixed(2)}
                        </span>
                      </div>
                    ))}

                    <div className="border-t border-slate-300 my-2 pt-2"></div>

                    <div className="flex justify-between items-center font-medium">
                      <span>Net Value</span>
                      <span>${(pricingResult.subtotal * calcQuantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Total Tax</span>
                      <span>${(pricingResult.tax * calcQuantity).toFixed(2)}</span>
                    </div>

                    <div className="border-t border-slate-300 my-2 pt-2"></div>

                    <div className="flex justify-between items-center text-xl font-bold text-primary">
                      <span>Final Price</span>
                      <span>${(pricingResult.total * calcQuantity).toFixed(2)}</span>
                    </div>

                    {pricingResult.totalCost > 0 && (
                      <>
                        <div className="border-t border-slate-300 my-3 pt-3"></div>

                        <div className="bg-amber-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                          <h4 className="text-sm font-semibold text-amber-900 mb-3">Profit Analysis</h4>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-amber-700">Total Cost</span>
                              <span className="font-mono text-amber-900">${(pricingResult.totalCost * calcQuantity).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-amber-700">Profit Margin</span>
                              <span className="font-mono text-amber-900">${(pricingResult.profitMargin * calcQuantity).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-sm text-amber-700">Margin %</span>
                              <span className="text-lg font-bold text-amber-900">{pricingResult.marginPercent.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unit Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${pricingResult.total.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Business Templates</CardTitle>
              <CardDescription>
                Quick start templates for different business types with pre-configured condition types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4 border-blue-200 hover:border-blue-400 transition-colors">
                  <h3 className="font-semibold text-blue-700">Restaurant/Food Service</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Base price, menu add-ons, delivery charges, service tax, food cost calculations
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Base Menu Price (STD1) • Add-ons (CDIS01) • Delivery Fee (FEE01) • Sales Tax (TAX01) • Food Cost (COST01)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('restaurant')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>

                <Card className="p-4 border-green-200 hover:border-green-400 transition-colors">
                  <h3 className="font-semibold text-green-700">Retail/E-commerce</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Product pricing, shipping costs, customer discounts, sales tax, product cost
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Product Price (STD1) • Shipping (FEE01) • Customer Discounts (CDIS01-03) • Sales Tax (TAX01) • COGS (COST01)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('retail')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>

                <Card className="p-4 border-purple-200 hover:border-purple-400 transition-colors">
                  <h3 className="font-semibold text-purple-700">Manufacturing</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Material costs, labor charges, overhead allocation, freight, profit margins
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Material Cost (COST01) • Labor (COST02) • Overhead (COST03) • Freight (FEE01) • Margin (CDIS04)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('manufacturing')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>

                <Card className="p-4 border-orange-200 hover:border-orange-400 transition-colors">
                  <h3 className="font-semibold text-orange-700">Healthcare Services</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Service fees, insurance co-pays, medical supplies, facility charges
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Service Fee (STD1) • Co-pay (CDIS01) • Supplies (COST01) • Facility (FEE01) • Insurance (TAX02)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('healthcare')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>

                <Card className="p-4 border-cyan-200 hover:border-cyan-400 transition-colors">
                  <h3 className="font-semibold text-cyan-700">Professional Services</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Hourly rates, project fees, expense reimbursements, professional tax
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Hourly Rate (STD1) • Project Fee (FEE01) • Expenses (COST01) • Professional Tax (TAX01) • Discounts (CDIS01)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('professional')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>

                <Card className="p-4 border-pink-200 hover:border-pink-400 transition-colors">
                  <h3 className="font-semibold text-pink-700">Construction/Contracting</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Labor costs, material markup, equipment rental, project overhead
                  </p>
                  <div className="text-xs text-gray-600 mb-3">
                    • Labor (COST01) • Materials (COST02) • Equipment (FEE01) • Overhead (COST03) • Permits (TAX02)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyTemplate('construction')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">How Templates Work</h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Templates automatically create industry-specific condition types with proper MallyERP codes and relationships.
                  Each template includes standard pricing components, cost elements, and tax configurations.
                </p>
                <div className="text-xs text-blue-600">
                  <strong>Note:</strong> Templates can be customized after application. See Help section for detailed implementation guides.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Condition Type Details</DialogTitle>
            <DialogDescription>
              Comprehensive information for {viewingCondition?.condition_code}
            </DialogDescription>
          </DialogHeader>

          {viewingCondition && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition Code</Label>
                    <p className="text-lg font-mono">{viewingCondition.condition_code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Sequence Number</Label>
                    <p className="text-lg">{viewingCondition.sequence_number}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Condition Name</Label>
                  <p className="text-lg">{viewingCondition.condition_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <div className="mt-1">
                      <Badge className={getCategoryColor(viewingCondition.condition_category)}>
                        {getCategoryIcon(viewingCondition.condition_category)}
                        <span className="ml-1">{viewingCondition.condition_category}</span>
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Calculation Type</Label>
                    <p className="text-lg capitalize">{viewingCondition.calculation_type.replace('_', ' ')}</p>
                  </div>
                </div>

                {viewingCondition.description && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{viewingCondition.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Account Key</Label>
                    <p className="text-lg font-mono">{(viewingCondition as any).account_key || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition Class</Label>
                    <p className="text-lg">
                      {(viewingCondition as any).condition_class_code
                        ? `${(viewingCondition as any).condition_class_code} - ${(viewingCondition as any).condition_class_name}`
                        : 'None'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="configuration" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Default Value</Label>
                    <p className="text-lg font-semibold">
                      {viewingCondition.default_value !== undefined
                        ? (viewingCondition.calculation_type === 'percentage'
                          ? `${viewingCondition.default_value}%`
                          : `$${viewingCondition.default_value}`)
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Min Value</Label>
                    <p className="text-lg font-semibold">
                      {viewingCondition.min_value !== undefined ? viewingCondition.min_value : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Max Value</Label>
                    <p className="text-lg font-semibold">
                      {viewingCondition.max_value !== undefined ? viewingCondition.max_value : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <Switch checked={viewingCondition.is_mandatory} disabled />
                    <div>
                      <Label>Mandatory</Label>
                      <p className="text-xs text-muted-foreground">
                        {viewingCondition.is_mandatory ? 'This condition is required' : 'This condition is optional'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <Switch checked={viewingCondition.is_active} disabled />
                    <div>
                      <Label>Active Status</Label>
                      <p className="text-xs text-muted-foreground">
                        {viewingCondition.is_active ? 'Currently active' : 'Currently inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition ID</Label>
                    <p className="text-sm font-mono">{viewingCondition.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Company Code ID</Label>
                    <p className="text-sm font-mono">{viewingCondition.company_code_id || 'Not set'}</p>
                  </div>
                </div>

                {viewingCondition.created_at && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">
                      {new Date(viewingCondition.created_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {viewingCondition.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">
                      {new Date(viewingCondition.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}