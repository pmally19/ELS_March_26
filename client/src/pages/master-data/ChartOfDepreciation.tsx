import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Edit2, Trash2, ArrowLeft, Calculator, Eye, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ChartOfDepreciation {
  id: number;
  code: string;
  name: string;
  description?: string;
  companyCodeId: number;
  fiscalYearVariantId?: number;
  currency: string;
  country?: string;
  depreciationMethod?: string;
  baseMethod?: string;
  depreciationCalculation?: string;
  periodControl?: string;
  allowManualDepreciation: boolean;
  allowAcceleratedDepreciation: boolean;
  allowSpecialDepreciation: boolean;
  requireDepreciationKey: boolean;
  allowNegativeDepreciation: boolean;
  depreciationStartDate?: string;
  depreciationEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
  tenantId?: string;
  companyCode?: string;
  companyName?: string;
  fiscalYearVariantCode?: string;
  fiscalYearVariantName?: string;
}

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol?: string;
};

type DepreciationMethodOption = {
  id: number;
  code: string;
  name?: string;
};

interface ChartOfDepreciationFormData {
  code: string;
  name: string;
  description?: string;
  companyCodeId: number;
  fiscalYearVariantId?: number;
  currency: string;
  country?: string;
  depreciationMethod?: string;
  baseMethod?: string;
  depreciationCalculation?: string;
  periodControl?: string;
  allowManualDepreciation: boolean;
  allowAcceleratedDepreciation: boolean;
  allowSpecialDepreciation: boolean;
  requireDepreciationKey: boolean;
  allowNegativeDepreciation: boolean;
  depreciationStartDate?: string;
  depreciationEndDate?: string;
  isActive: boolean;
}

export default function ChartOfDepreciation() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartOfDepreciation | null>(null);
  const [viewingChart, setViewingChart] = useState<ChartOfDepreciation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showAdminData, setShowAdminData] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ChartOfDepreciationFormData>({
    code: "",
    name: "",
    description: "",
    companyCodeId: 0,
    fiscalYearVariantId: undefined,
    currency: "USD",
    country: "",
    depreciationMethod: "",
    baseMethod: "",
    depreciationCalculation: "",
    periodControl: "",
    allowManualDepreciation: false,
    allowAcceleratedDepreciation: false,
    allowSpecialDepreciation: false,
    requireDepreciationKey: true,
    allowNegativeDepreciation: false,
    depreciationStartDate: "",
    depreciationEndDate: "",
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/company-code");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        console.error("Error fetching company codes:", error);
        return [];
      }
    },
  });

  // Fetch fiscal year variants
  const { data: fiscalYearVariants = [] } = useQuery({
    queryKey: ["/api/master-data/fiscal-year-variants"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/fiscal-year-variants");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((fyv: any) => fyv.active !== false) : [];
      } catch (error) {
        console.error("Error fetching fiscal year variants:", error);
        return [];
      }
    },
  });

  // Fetch countries for dropdown
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ["/api/master-data/countries"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/countries");
        const data = await response.json();
        return Array.isArray(data) ? data
          .filter((c: any) => c.isActive !== false)
          .map((c: any) => ({
            id: c.id,
            code: c.code || "",
            name: c.name || "",
          })) : [];
      } catch (error) {
        console.error("Error fetching countries:", error);
        return [];
      }
    },
  });

  // Fetch currencies (live options, sorted by code)
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Currency[]>({
    queryKey: ["/api/master-data/currency"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/currency");
        const data = await response.json();
        return Array.isArray(data)
          ? data
            .filter((c: any) => c.isActive !== false)
            .map((c: any) => ({
              id: c.id ?? c.code,
              code: c.code,
              name: c.name,
              symbol: c.symbol,
            }))
            .sort((a: Currency, b: Currency) => a.code.localeCompare(b.code))
          : [];
      } catch (error) {
        console.error("Error fetching currencies:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch depreciation methods (live list for selection)
  const { data: depreciationMethods = [], isLoading: depMethodsLoading } = useQuery<DepreciationMethodOption[]>({
    queryKey: ["/api/master-data/depreciation-methods"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/depreciation-methods");
        const data = await response.json();
        return Array.isArray(data)
          ? data
            .filter((m: any) => m.is_active !== false)
            .map((m: any) => ({
              id: m.id,
              code: m.code,
              name: m.name,
            }))
            .sort((a: DepreciationMethodOption, b: DepreciationMethodOption) => a.code.localeCompare(b.code))
          : [];
      } catch (error) {
        console.error("Error fetching depreciation methods:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch chart of depreciation records
  const { data: charts = [], isLoading, refetch } = useQuery<ChartOfDepreciation[]>({
    queryKey: ["/api/master-data/chart-of-depreciation"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/chart-of-depreciation");
        const data = await response.json();
        // Normalize snake_case to camelCase
        return Array.isArray(data) ? data.map((item: any) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          companyCodeId: item.company_code_id,
          fiscalYearVariantId: item.fiscal_year_variant_id,
          currency: item.currency,
          country: item.country,
          depreciationMethod: item.depreciation_method,
          baseMethod: item.base_method,
          depreciationCalculation: item.depreciation_calculation,
          periodControl: item.period_control,
          allowManualDepreciation: item.allow_manual_depreciation,
          allowAcceleratedDepreciation: item.allow_accelerated_depreciation,
          allowSpecialDepreciation: item.allow_special_depreciation,
          requireDepreciationKey: item.require_depreciation_key,
          allowNegativeDepreciation: item.allow_negative_depreciation,
          depreciationStartDate: item.depreciation_start_date,
          depreciationEndDate: item.depreciation_end_date,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          companyCode: item.company_code,
          companyName: item.company_name,
          fiscalYearVariantCode: item.fiscal_year_variant_code,
          fiscalYearVariantName: item.fiscal_year_variant_name,
          createdBy: item.created_by,
          updatedBy: item.updated_by,
          tenantId: item.tenant_id,
        })) : [];
      } catch (error) {
        console.error("Error fetching chart of depreciation:", error);
        return [];
      }
    },
  });

  // Fetch dropdown options so UI is not hardcoded
  const { data: codOptions = { depreciationMethods: [], baseMethods: [], depreciationCalculations: [], periodControls: [] } } = useQuery({
    queryKey: ["/api/master-data/chart-of-depreciation/options"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/chart-of-depreciation/options");
      if (!response.ok) {
        throw new Error("Failed to fetch chart of depreciation options");
      }
      return response.json() as Promise<{
        depreciationMethods: string[];
        baseMethods: string[];
        depreciationCalculations: string[];
        periodControls: string[];
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatEnumLabel = (value?: string) =>
    value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : value;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ChartOfDepreciationFormData) => {
      // Normalize empty strings and undefined to null for optional fields
      const normalizeOptionalString = (value: string | undefined | null): string | null => {
        if (!value || (typeof value === 'string' && value.trim() === "")) return null;
        return value;
      };

      const payload = {
        code: data.code,
        name: data.name,
        description: normalizeOptionalString(data.description),
        companyCodeId: data.companyCodeId,
        fiscalYearVariantId: data.fiscalYearVariantId || null,
        currency: data.currency,
        country: normalizeOptionalString(data.country),
        depreciationMethod: normalizeOptionalString(data.depreciationMethod),
        baseMethod: normalizeOptionalString(data.baseMethod),
        depreciationCalculation: normalizeOptionalString(data.depreciationCalculation),
        periodControl: normalizeOptionalString(data.periodControl),
        allowManualDepreciation: data.allowManualDepreciation,
        allowAcceleratedDepreciation: data.allowAcceleratedDepreciation,
        allowSpecialDepreciation: data.allowSpecialDepreciation,
        requireDepreciationKey: data.requireDepreciationKey,
        allowNegativeDepreciation: data.allowNegativeDepreciation,
        depreciationStartDate: normalizeOptionalString(data.depreciationStartDate),
        depreciationEndDate: normalizeOptionalString(data.depreciationEndDate),
        isActive: data.isActive,
      };
      const response = await apiRequest("/api/master-data/chart-of-depreciation", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create chart of depreciation");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/chart-of-depreciation"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Chart of depreciation created successfully." });
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      const errorMessage = error?.message || "Failed to create chart of depreciation.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ChartOfDepreciationFormData> }) => {
      // Normalize empty strings and undefined to null for optional fields
      const normalizeOptionalString = (value: string | undefined | null): string | null => {
        if (!value || (typeof value === 'string' && value.trim() === "")) return null;
        return value;
      };

      const payload: any = {};
      if (data.code !== undefined) payload.code = data.code;
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = normalizeOptionalString(data.description);
      if (data.companyCodeId !== undefined) payload.companyCodeId = data.companyCodeId;
      if (data.fiscalYearVariantId !== undefined) payload.fiscalYearVariantId = data.fiscalYearVariantId || null;
      if (data.currency !== undefined) payload.currency = data.currency;
      if (data.country !== undefined) payload.country = normalizeOptionalString(data.country);
      if (data.depreciationMethod !== undefined) payload.depreciationMethod = normalizeOptionalString(data.depreciationMethod);
      if (data.baseMethod !== undefined) payload.baseMethod = normalizeOptionalString(data.baseMethod);
      if (data.depreciationCalculation !== undefined) payload.depreciationCalculation = normalizeOptionalString(data.depreciationCalculation);
      if (data.periodControl !== undefined) payload.periodControl = normalizeOptionalString(data.periodControl);
      if (data.allowManualDepreciation !== undefined) payload.allowManualDepreciation = data.allowManualDepreciation;
      if (data.allowAcceleratedDepreciation !== undefined) payload.allowAcceleratedDepreciation = data.allowAcceleratedDepreciation;
      if (data.allowSpecialDepreciation !== undefined) payload.allowSpecialDepreciation = data.allowSpecialDepreciation;
      if (data.requireDepreciationKey !== undefined) payload.requireDepreciationKey = data.requireDepreciationKey;
      if (data.allowNegativeDepreciation !== undefined) payload.allowNegativeDepreciation = data.allowNegativeDepreciation;
      if (data.depreciationStartDate !== undefined) payload.depreciationStartDate = normalizeOptionalString(data.depreciationStartDate);
      if (data.depreciationEndDate !== undefined) payload.depreciationEndDate = normalizeOptionalString(data.depreciationEndDate);
      if (data.isActive !== undefined) payload.isActive = data.isActive;

      const response = await apiRequest(`/api/master-data/chart-of-depreciation/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update chart of depreciation");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/chart-of-depreciation"] });
      setEditingChart(null);
      resetForm();
      toast({ title: "Success", description: "Chart of depreciation updated successfully." });
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      const errorMessage = error?.message || "Failed to update chart of depreciation.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/chart-of-depreciation/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete chart of depreciation");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/chart-of-depreciation"] });
      toast({ title: "Success", description: "Chart of depreciation deleted successfully." });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      const errorMessage = error?.message || "Failed to delete chart of depreciation.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      companyCodeId: 0,
      fiscalYearVariantId: undefined,
      currency: "USD",
      country: "",
      depreciationMethod: "",
      baseMethod: "",
      depreciationCalculation: "",
      periodControl: "",
      allowManualDepreciation: false,
      allowAcceleratedDepreciation: false,
      allowSpecialDepreciation: false,
      requireDepreciationKey: true,
      allowNegativeDepreciation: false,
      depreciationStartDate: "",
      depreciationEndDate: "",
      isActive: true
    });
    setEditingChart(null);
  };

  const openDetails = (chart: ChartOfDepreciation) => {
    setViewingChart(chart);
    setShowAdminData(false);
    setIsDetailsOpen(true);
  };

  const handleEdit = (chart: ChartOfDepreciation) => {
    setEditingChart(chart);
    setIsDetailsOpen(false);

    // Helper to format date for input field
    const formatDateForInput = (dateValue: string | Date | null | undefined): string => {
      if (!dateValue) return "";
      try {
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (isNaN(date.getTime())) return "";
        // Format as YYYY-MM-DD for date input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return "";
      }
    };

    setFormData({
      code: chart.code,
      name: chart.name,
      description: chart.description || "",
      companyCodeId: chart.companyCodeId || 0,
      fiscalYearVariantId: chart.fiscalYearVariantId || undefined,
      currency: chart.currency || "USD",
      country: chart.country || undefined,
      depreciationMethod: chart.depreciationMethod || undefined,
      baseMethod: chart.baseMethod || undefined,
      depreciationCalculation: chart.depreciationCalculation || undefined,
      periodControl: chart.periodControl || undefined,
      allowManualDepreciation: chart.allowManualDepreciation ?? false,
      allowAcceleratedDepreciation: chart.allowAcceleratedDepreciation ?? false,
      allowSpecialDepreciation: chart.allowSpecialDepreciation ?? false,
      requireDepreciationKey: chart.requireDepreciationKey ?? true,
      allowNegativeDepreciation: chart.allowNegativeDepreciation ?? false,
      depreciationStartDate: formatDateForInput(chart.depreciationStartDate),
      depreciationEndDate: formatDateForInput(chart.depreciationEndDate),
      isActive: chart.isActive ?? true
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.companyCodeId || formData.companyCodeId === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a company code.",
        variant: "destructive",
      });
      return;
    }
    if (editingChart) {
      updateMutation.mutate({ id: editingChart.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredCharts = charts.filter(chart =>
    chart.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              Chart of Depreciation
            </h1>
            <p className="text-muted-foreground">Configure depreciation methods and rules for asset accounting</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingChart ? "Edit Chart of Depreciation" : "Create Chart of Depreciation"}</DialogTitle>
              <DialogDescription>
                {editingChart ? "Update the depreciation chart configuration" : "Configure a new depreciation chart for asset accounting"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCodeId">Company Code *</Label>
                  <Select
                    value={formData.companyCodeId && formData.companyCodeId > 0 ? formData.companyCodeId.toString() : ""}
                    onValueChange={(value) => setFormData({ ...formData, companyCodeId: parseInt(value) || 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company code" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyCodes.map((cc: any) => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYearVariantId">Fiscal Year Variant</Label>
                  <Select
                    value={formData.fiscalYearVariantId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, fiscalYearVariantId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fiscal year variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {fiscalYearVariants.map((fyv: any) => (
                        <SelectItem key={fyv.id} value={fyv.id.toString()}>
                          {fyv.variant_id} - {fyv.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value === "none" ? "" : value })
                    }
                    disabled={currenciesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={currenciesLoading ? "Loading currencies..." : "Select currency"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select currency</SelectItem>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                          {c.symbol ? ` (${c.symbol})` : ""} {c.name ? `- ${c.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country && formData.country !== "" ? formData.country : "none"}
                    onValueChange={(value) => setFormData({ ...formData, country: value === "none" ? undefined : value })}
                    disabled={countriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select Country"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {countries.map((country: any) => (
                        <SelectItem key={country.id} value={country.code}>
                          {country.code} - {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationMethod">Depreciation Method</Label>
                  <Select
                    value={formData.depreciationMethod && formData.depreciationMethod !== "" ? formData.depreciationMethod : "none"}
                    onValueChange={(value) => setFormData({ ...formData, depreciationMethod: value === "none" ? undefined : value })}
                    disabled={depMethodsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {depreciationMethods.length > 0
                        ? depreciationMethods.map((m) => (
                          <SelectItem key={m.id} value={m.code}>
                            {m.code} {m.name ? `- ${m.name}` : ""}
                          </SelectItem>
                        ))
                        : codOptions.depreciationMethods.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatEnumLabel(option)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseMethod">Base Method</Label>
                  <Select
                    value={formData.baseMethod && formData.baseMethod !== "" ? formData.baseMethod : "none"}
                    onValueChange={(value) => setFormData({ ...formData, baseMethod: value === "none" ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {codOptions.baseMethods.length === 0 ? (
                        <SelectItem value="__no-options" disabled>No options available</SelectItem>
                      ) : (
                        codOptions.baseMethods.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatEnumLabel(option)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationCalculation">Depreciation Calculation</Label>
                  <Select
                    value={formData.depreciationCalculation && formData.depreciationCalculation !== "" ? formData.depreciationCalculation : "none"}
                    onValueChange={(value) => setFormData({ ...formData, depreciationCalculation: value === "none" ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select calculation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {codOptions.depreciationCalculations.length === 0 ? (
                        <SelectItem value="__no-options" disabled>No options available</SelectItem>
                      ) : (
                        codOptions.depreciationCalculations.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatEnumLabel(option)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodControl">Period Control</Label>
                  <Select
                    value={formData.periodControl && formData.periodControl !== "" ? formData.periodControl : "none"}
                    onValueChange={(value) => setFormData({ ...formData, periodControl: value === "none" ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period control" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {codOptions.periodControls.length === 0 ? (
                        <SelectItem value="__no-options" disabled>No options available</SelectItem>
                      ) : (
                        codOptions.periodControls.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatEnumLabel(option)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationStartDate">Depreciation Start Date</Label>
                  <Input
                    id="depreciationStartDate"
                    type="date"
                    value={formData.depreciationStartDate}
                    onChange={(e) => setFormData({ ...formData, depreciationStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationEndDate">Depreciation End Date</Label>
                  <Input
                    id="depreciationEndDate"
                    type="date"
                    value={formData.depreciationEndDate}
                    onChange={(e) => setFormData({ ...formData, depreciationEndDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowManualDepreciation">Allow Manual Depreciation</Label>
                  <Switch
                    id="allowManualDepreciation"
                    checked={formData.allowManualDepreciation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowManualDepreciation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowAcceleratedDepreciation">Allow Accelerated Depreciation</Label>
                  <Switch
                    id="allowAcceleratedDepreciation"
                    checked={formData.allowAcceleratedDepreciation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowAcceleratedDepreciation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowSpecialDepreciation">Allow Special Depreciation</Label>
                  <Switch
                    id="allowSpecialDepreciation"
                    checked={formData.allowSpecialDepreciation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowSpecialDepreciation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireDepreciationKey">Require Depreciation Key</Label>
                  <Switch
                    id="requireDepreciationKey"
                    checked={formData.requireDepreciationKey}
                    onCheckedChange={(checked) => setFormData({ ...formData, requireDepreciationKey: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowNegativeDepreciation">Allow Negative Depreciation</Label>
                  <Switch
                    id="allowNegativeDepreciation"
                    checked={formData.allowNegativeDepreciation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowNegativeDepreciation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingChart ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chart of Depreciation</CardTitle>
              <CardDescription>Manage depreciation configuration for asset accounting</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, name, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCharts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No charts found matching your search." : "No charts of depreciation configured yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Fiscal Year Variant</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharts.map((chart) => (
                  <TableRow
                    key={chart.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openDetails(chart)}
                  >
                    <TableCell className="font-mono">{chart.code}</TableCell>
                    <TableCell>{chart.name}</TableCell>
                    <TableCell>
                      {chart.companyName ? `${chart.companyCode || ''} - ${chart.companyName}` : (chart.companyCode || "-")}
                    </TableCell>
                    <TableCell>
                      {chart.fiscalYearVariantName
                        ? `${chart.fiscalYearVariantCode || ''} - ${chart.fiscalYearVariantName}`
                        : (chart.fiscalYearVariantCode || "-")
                      }
                    </TableCell>
                    <TableCell>
                      {chart.depreciationMethod ? (
                        <Badge variant="outline">{chart.depreciationMethod.replace(/_/g, ' ')}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{chart.currency || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={chart.isActive ? "default" : "secondary"}>
                        {chart.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(chart)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(chart)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeletingId(chart.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
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

      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setShowAdminData(false); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chart of Depreciation Details</DialogTitle>
            <DialogDescription>
              {viewingChart?.code} — {viewingChart?.name}
            </DialogDescription>
          </DialogHeader>
          {viewingChart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Code</p>
                  <p className="text-sm font-semibold font-mono">{viewingChart.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingChart.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {viewingChart.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm">{viewingChart.name}</p>
                </div>
                {viewingChart.description && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm">{viewingChart.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Company</p>
                  <p className="text-sm">{viewingChart.companyCode} {viewingChart.companyName ? `— ${viewingChart.companyName}` : ''}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Currency</p>
                  <p className="text-sm">{viewingChart.currency || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Country</p>
                  <p className="text-sm">{viewingChart.country || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fiscal Year Variant</p>
                  <p className="text-sm">{viewingChart.fiscalYearVariantCode || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Depreciation Method</p>
                  <p className="text-sm">{viewingChart.depreciationMethod?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Base Method</p>
                  <p className="text-sm">{viewingChart.baseMethod?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Period Control</p>
                  <p className="text-sm">{viewingChart.periodControl?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Depreciation Calculation</p>
                  <p className="text-sm">{viewingChart.depreciationCalculation?.replace(/_/g, ' ') || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Depreciation Flags</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { label: 'Allow Manual', val: viewingChart.allowManualDepreciation },
                    { label: 'Allow Accelerated', val: viewingChart.allowAcceleratedDepreciation },
                    { label: 'Allow Special', val: viewingChart.allowSpecialDepreciation },
                    { label: 'Require Dep. Key', val: viewingChart.requireDepreciationKey },
                    { label: 'Allow Negative', val: viewingChart.allowNegativeDepreciation },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between py-0.5">
                      <span className="text-gray-600">{label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {val ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Administrative Data - collapsible */}
              <div
                className="cursor-pointer flex justify-between items-center select-none py-1"
                onClick={() => setShowAdminData(!showAdminData)}
              >
                <p className="font-semibold text-sm text-gray-700">Administrative Data</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showAdminData ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {showAdminData && (
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="text-sm text-gray-900">{viewingChart.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                    <dd className="text-sm text-gray-900">{viewingChart.updatedBy ?? viewingChart.createdBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="text-sm text-gray-900">{viewingChart.createdAt ? new Date(viewingChart.createdAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="text-sm text-gray-900">{viewingChart.updatedAt ? new Date(viewingChart.updatedAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                    <dd className="text-sm text-gray-900">{viewingChart.tenantId ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDetailsOpen(false); if (viewingChart) handleEdit(viewingChart); }}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chart of depreciation. This action cannot be undone if no assets reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

