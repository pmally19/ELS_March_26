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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, X, FileUp, Download, Globe, ArrowLeft, RefreshCw, MoreHorizontal, PowerOff, Building, MapPin, DollarSign, Calendar, Phone, Mail, ExternalLink, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Badge } from "@/components/ui/badge";
// Import the company code excel import component
import CompanyCodeExcelImport from "../../components/master-data/CompanyCodeExcelImport";

// Define the Company Code type (matches database schema)
type CompanyCode = {
  id: number;
  code: string;
  name: string;
  description?: string;
  city: string | null;
  country: string;
  currency: string;
  language: string | null;
  active: boolean; // Database field name
  taxId?: string; // Add this
  fiscalYear?: string; // Add this
  fiscal_year?: string; // Add this for API compatibility
  fiscal_year_variant_id?: number | null; // Add this for database field
  fiscalYearVariantCode?: string | null; // Fiscal year variant code from API
  fiscalYearDescription?: string | null; // Fiscal year description from API
  chart_of_accounts_id?: number | null; // Add this for database field
  chartOfAccountsCode?: string | null; // Chart of accounts code from API
  chartOfAccountsName?: string | null; // Chart of accounts description from API (stored as 'name' in response)
  address?: string; // Add this
  state?: string; // Add this
  postalCode?: string; // Add this
  phone?: string; // Add this
  email?: string; // Add this
  website?: string; // Add this
  logoUrl?: string; // Add this
  region?: string; // Add this
  region_id?: number | null; // Add this
  regionName?: string; // Join result
  regionCode?: string; // Join result
  created_at: string;
  updated_at: string;
};

// Fiscal Year Variant type
type FiscalYearVariant = {
  id: number;
  variant_id: string;
  description: string;
  posting_periods?: number;
  special_periods?: number;
  year_shift?: number;
  active?: boolean;
};

// Company Code Form Schema
const companyCodeSchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
  taxId: z.string().optional(),
  fiscalYear: z.string().min(1, "Fiscal Year is required"),
  chartOfAccounts: z.string().optional(), // Chart of Accounts
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email format"), z.literal("")]).optional(),
  website: z.union([z.string().url("Invalid website URL"), z.literal("")]).optional(),
  logoUrl: z.string().optional(),
  region: z.string().optional(),
  regionId: z.string().optional(), // Use string for Select value consistency
  active: z.boolean().default(true),
});

// Company Code Management Page
export default function CompanyCodePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingCompanyCode, setEditingCompanyCode] = useState<CompanyCode | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [viewingCompanyCodeDetails, setViewingCompanyCodeDetails] = useState<CompanyCode | null>(null);
  const [isCompanyCodeDetailsOpen, setIsCompanyCodeDetailsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();
  const [adminDataOpen, setAdminDataOpen] = useState(false);

  // Fetch company codes directly to avoid JSON parsing issues
  const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
  const [filteredCompanyCodes, setFilteredCompanyCodes] = useState<CompanyCode[]>([]);
  const [companyCodesLoading, setCompanyCodesLoading] = useState(true);
  const [companyCodesError, setCompanyCodesError] = useState<Error | null>(null);

  // Fetch currencies from API
  const [currencies, setCurrencies] = useState<Array<{ id: number; code: string; name: string; symbol: string }>>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  // Fetch fiscal year variants from API
  const [fiscalYearVariants, setFiscalYearVariants] = useState<FiscalYearVariant[]>([]);
  const [fiscalYearVariantsLoading, setFiscalYearVariantsLoading] = useState(true);

  // Fetch chart of accounts from API
  const [chartOfAccounts, setChartOfAccounts] = useState<Array<{ id: number; chart_id: string; description: string }>>([]);
  const [chartOfAccountsLoading, setChartOfAccountsLoading] = useState(true);

  // Fetch countries from API for dropdown
  const { data: countries = [], isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data
          .filter((c: any) => c.isActive !== false)
          .map((c: any) => ({
            id: c.id,
            code: c.code || "",
            name: c.name || "",
            currencyCode: c.currencyCode || "",
            regionId: c.regionId,
          })) : [];
      } catch (error) {
        console.error("Error fetching countries:", error);
        return [];
      }
    },
  });

  // Fetch regions from API
  const { data: regionsArr = [], isLoading: regionsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/regions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/regions');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((r: any) => r.isActive !== false) : [];
      } catch (error) {
        console.error("Error fetching regions:", error);
        return [];
      }
    },
  });


  // Fetch data function - extracted for reuse
  const fetchData = async () => {
    try {
      // Fetch company codes
      setCompanyCodesLoading(true);
      const response = await fetch("/api/master-data/company-code", {
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
      // Map snake_case to camelCase and preserve fiscal year data from API
      const mappedData = Array.isArray(data) ? data.map((item: any) => ({
        ...item,
        fiscalYear: item.fiscal_year || item.fiscalYear || null,
        fiscalYearVariantCode: item.fiscal_year_variant_code || null,
        fiscalYearDescription: item.fiscal_year_description || null,
        chartOfAccountsCode: item.chart_of_accounts_code || null,
        chartOfAccountsName: item.chart_of_accounts_name || null,
        taxId: item.tax_id || item.taxId || null,
        postalCode: item.postal_code || item.postalCode || null,
        logoUrl: item.logo_url || item.logoUrl || null,
        regionId: item.region_id || item.regionId || null
      })) : [];
      setCompanyCodes(mappedData);
      setFilteredCompanyCodes(mappedData);
      setCompanyCodesLoading(false);
    } catch (error) {
      console.error("Error fetching company codes:", error);
      setCompanyCodesError(error instanceof Error ? error : new Error('Failed to fetch company codes'));
      setCompanyCodesLoading(false);
    }
  };

  // Fetch currencies from API
  const fetchCurrencies = async () => {
    try {
      setCurrenciesLoading(true);
      const response = await fetch("/api/master-data/currencies", {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch currencies: ${response.status}`);
      }

      const data = await response.json();
      setCurrencies(data);
      setCurrenciesLoading(false);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      setCurrenciesLoading(false);
      // Set default currencies if API fails
      setCurrencies([
        { id: 1, code: "USD", name: "US Dollar", symbol: "$" },
        { id: 2, code: "EUR", name: "Euro", symbol: "€" },
        { id: 3, code: "GBP", name: "British Pound", symbol: "£" },
      ]);
    }
  };

  // Fetch fiscal year variants from API
  const fetchFiscalYearVariants = async () => {
    try {
      setFiscalYearVariantsLoading(true);
      const response = await fetch("/api/master-data/fiscal-year-variants", {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch fiscal year variants: ${response.status}`);
      }

      const data = await response.json();
      // Filter only active fiscal year variants
      const activeVariants = data.filter((variant: FiscalYearVariant) => variant.active !== false);
      console.log('Fiscal year variants loaded:', activeVariants.length, activeVariants.map(v => ({ id: v.variant_id, desc: v.description })));
      setFiscalYearVariants(activeVariants);
      setFiscalYearVariantsLoading(false);
    } catch (error) {
      console.error("Error fetching fiscal year variants:", error);
      setFiscalYearVariantsLoading(false);
      // Set empty array if API fails - user should configure fiscal year variants in master data
      setFiscalYearVariants([]);
      toast({
        title: "Error",
        description: "Failed to load fiscal year variants. Please configure them in Master Data > Fiscal Year Variant.",
        variant: "destructive",
      });
    }
  };

  // Fetch chart of accounts from API
  const fetchChartOfAccounts = async () => {
    try {
      setChartOfAccountsLoading(true);
      const response = await fetch("/api/master-data/chart-of-accounts", {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chart of accounts: ${response.status}`);
      }

      const data = await response.json();
      // Filter only active charts of accounts
      const activeCharts = data.filter((chart: any) => chart.is_active !== false);
      console.log('Chart of accounts loaded:', activeCharts.length);
      setChartOfAccounts(activeCharts);
      setChartOfAccountsLoading(false);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      setChartOfAccountsLoading(false);
      // Set empty array if API fails
      setChartOfAccounts([]);
    }
  };


  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest company codes...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Company codes have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchCurrencies();
    fetchFiscalYearVariants();
    fetchChartOfAccounts();
  }, []);

  // Filter company codes based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCompanyCodes(companyCodes);
    } else {
      setFilteredCompanyCodes(
        companyCodes.filter(
          (companyCode) =>
            companyCode.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            companyCode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            companyCode.country.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, companyCodes]);

  // Company code form setup
  const form = useForm<z.infer<typeof companyCodeSchema>>({
    resolver: zodResolver(companyCodeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      currency: "USD",
      country: "",
      taxId: "",
      fiscalYear: "",
      chartOfAccounts: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      email: "",
      website: "",
      logoUrl: "",
      region: "",
      regionId: "",
      active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingCompanyCode) {
      // Get fiscal year value - prefer variant code from API, fallback to fiscal Year or fiscal_year
      const fiscalYearValue = (editingCompanyCode as any).fiscalYearVariantCode
        || editingCompanyCode.fiscalYear
        || (editingCompanyCode as any).fiscal_year
        || "";

      // Get chart of accounts value - prefer chart code from API
      const chartOfAccountsValue = (editingCompanyCode as any).chartOfAccountsCode
        || (editingCompanyCode as any).chart_of_accounts_code
        || "";

      form.reset({
        code: editingCompanyCode.code,
        name: editingCompanyCode.name,
        description: editingCompanyCode.description || "",
        currency: editingCompanyCode.currency,
        country: editingCompanyCode.country,
        region: editingCompanyCode.region || "",
        regionId: editingCompanyCode.region_id ? String(editingCompanyCode.region_id) : "",
        taxId: editingCompanyCode.taxId || "",
        fiscalYear: fiscalYearValue,
        chartOfAccounts: chartOfAccountsValue,
        address: editingCompanyCode.address || "",
        city: editingCompanyCode.city || "",
        state: editingCompanyCode.state || "",
        postalCode: editingCompanyCode.postalCode || "",
        phone: editingCompanyCode.phone || "",
        email: editingCompanyCode.email || "",
        website: editingCompanyCode.website || "",
        logoUrl: editingCompanyCode.logoUrl || "",
        active: editingCompanyCode.active, // Map database 'active' field to form 'Active' field
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        currency: "USD",
        country: "",
        region: "",
        regionId: "",
        fiscalYear: fiscalYearVariants.length > 0 ? fiscalYearVariants[0].variant_id : "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        phone: "",
        email: "",
        website: "",
        logoUrl: "",
        active: true,
      });
    }
  }, [editingCompanyCode, form, fiscalYearVariants]);

  // States filtered by selected country (must be after form is initialized)
  const [countryStates, setCountryStates] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const watchedCountry = form.watch("country");
  const watchedRegionId = form.watch("regionId");

  // Filter countries based on selected region
  const filteredCountries = watchedRegionId
    ? countries.filter((c: any) => String(c.regionId) === watchedRegionId)
    : countries;

  useEffect(() => {
    if (!watchedRegionId) return;
    const selectedRegion = regionsArr.find((r: any) => String(r.id) === watchedRegionId);
    if (selectedRegion) {
      form.setValue("region", selectedRegion.name);
    }
  }, [watchedRegionId, regionsArr]);

  useEffect(() => {
    if (!watchedCountry || !countries.length) return;

    const selectedCountry = (countries as any[]).find((c: any) => c.code === watchedCountry);

    // Auto-fill currency from country's currency code
    if (selectedCountry?.currencyCode) {
      form.setValue("currency", selectedCountry.currencyCode, { shouldValidate: true });
    }

    // Fetch states for selected country
    if (selectedCountry?.id) {
      setStatesLoading(true);
      fetch(`/api/master-data/states/country/${selectedCountry.id}`, { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(data => {
          setCountryStates(Array.isArray(data) ? data.filter((s: any) => s.isActive !== false) : []);
          setStatesLoading(false);
        })
        .catch(() => { setCountryStates([]); setStatesLoading(false); });
    } else {
      setCountryStates([]);
    }

    // Reset state field when country changes, but ONLY if it's a user action
    // We check if the current value matches the one from editingCompanyCode
    if (!editingCompanyCode || watchedCountry !== editingCompanyCode.country) {
      form.setValue("state", "");
    }
  }, [watchedCountry, countries, editingCompanyCode]);

  // Create company code mutation
  const createCompanyCodeMutation = useMutation({
    mutationFn: (companyCode: z.infer<typeof companyCodeSchema>) => {
      console.log("Sending to API:", JSON.stringify(companyCode));
      return apiRequest(`/api/master-data/company-code`, {
        method: "POST",
        body: JSON.stringify(companyCode)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Failed to create company code");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company Code created successfully",
      });
      // Refresh the company codes list
      fetch("/api/master-data/company-code", {
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          // Map snake_case to camelCase and preserve fiscal year data from API
          const mappedData = Array.isArray(data) ? data.map((item: any) => ({
            ...item,
            fiscalYear: item.fiscal_year || item.fiscalYear || null,
            fiscalYearVariantCode: item.fiscal_year_variant_code || null,
            fiscalYearDescription: item.fiscal_year_description || null,
            chartOfAccountsCode: item.chart_of_accounts_code || null,
            chartOfAccountsName: item.chart_of_accounts_name || null,
            taxId: item.tax_id || item.taxId || null,
            postalCode: item.postal_code || item.postalCode || null,
            logoUrl: item.logo_url || item.logoUrl || null,
            regionId: item.region_id || item.regionId || null
          })) : [];
          setCompanyCodes(mappedData);
          setFilteredCompanyCodes(mappedData);
        });
      setShowDialog(false);
      setActiveTab("basic");
      form.reset();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Company Code",
        variant: "destructive",
      });
    },
  });

  // Update company code mutation
  const updateCompanyCodeMutation = useMutation({
    mutationFn: (data: { id: number; companyCode: z.infer<typeof companyCodeSchema> }) => {
      return apiRequest(`/api/master-data/company-code/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.companyCode),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company Code updated successfully",
      });
      // Refresh the company codes list
      fetch("/api/master-data/company-code", {
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          // Map snake_case to camelCase and preserve fiscal year data from API
          const mappedData = Array.isArray(data) ? data.map((item: any) => ({
            ...item,
            fiscalYear: item.fiscal_year || item.fiscalYear || null,
            fiscalYearVariantCode: item.fiscal_year_variant_code || null,
            fiscalYearDescription: item.fiscal_year_description || null,
            chartOfAccountsCode: item.chart_of_accounts_code || null,
            chartOfAccountsName: item.chart_of_accounts_name || null,
            taxId: item.tax_id || item.taxId || null,
            postalCode: item.postal_code || item.postalCode || null,
            logoUrl: item.logo_url || item.logoUrl || null,
            regionId: item.region_id || item.regionId || null
          })) : [];
          setCompanyCodes(mappedData);
          setFilteredCompanyCodes(mappedData);
        });
      setShowDialog(false);
      setEditingCompanyCode(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Company Code",
        variant: "destructive",
      });
    },
  });

  // Delete company code mutation
  const deleteCompanyCodeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/company-code/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company Code deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/company-code"] });
      // Refresh the company codes list with proper mapping
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Company Code",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof companyCodeSchema>) => {
    console.log("Form submitted with values:", values);

    // Convert code to uppercase and send active field directly
    const updatedValues: any = {
      ...values,
      code: values.code.toUpperCase(),
      active: values.active, // Map Active to active for backend
    };

    // Remove Active since backend expects active
    delete updatedValues.Active;

    if (editingCompanyCode) {
      updateCompanyCodeMutation.mutate({ id: editingCompanyCode.id, companyCode: updatedValues });
    } else {
      createCompanyCodeMutation.mutate(updatedValues);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingCompanyCode(null);
    form.reset();
  };

  // Function to handle editing a company code
  const handleEdit = (companyCode: CompanyCode) => {
    setEditingCompanyCode(companyCode);

    // Map database fields to form fields with proper type conversion
    // Get fiscal year value - prefer variant code from API, fallback to fiscalYear or fiscal_year
    const fiscalYearValue = (companyCode as any).fiscalYearVariantCode
      || companyCode.fiscalYear
      || (companyCode as any).fiscal_year
      || "";

    const formData = {
      code: companyCode.code,
      name: companyCode.name,
      currency: companyCode.currency,
      country: companyCode.country,
      city: companyCode.city || "",
      active: companyCode.active, // Map active to active for the form
      fiscalYear: fiscalYearValue,
      description: companyCode.description || "",
      taxId: companyCode.taxId || "",
      address: companyCode.address || "",
      state: companyCode.state || "",
      postalCode: companyCode.postalCode || "",
      phone: companyCode.phone || "",
      email: companyCode.email || "",
      website: companyCode.website || "",
      logoUrl: companyCode.logoUrl || ""
    };

    form.reset(formData);
    setShowDialog(true);
  };

  // Function to handle exporting company codes to Excel
  const handleExport = () => {
    if (filteredCompanyCodes.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no company codes to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = filteredCompanyCodes.map(companyCode => {
      // Get fiscal year display from API response or lookup from variants
      let fiscalYearDisplay = '';

      // First, try to use the description directly from API response
      if ((companyCode as any).fiscalYearDescription) {
        const variantCode = (companyCode as any).fiscalYearVariantCode || companyCode.fiscalYear || (companyCode as any).fiscal_year;
        fiscalYearDisplay = variantCode
          ? `${variantCode} - ${(companyCode as any).fiscalYearDescription}`
          : (companyCode as any).fiscalYearDescription;
      } else {
        // Fallback: lookup from fiscalYearVariants array
        const fiscalYearValue = companyCode.fiscalYear || (companyCode as any).fiscal_year || null;
        if (fiscalYearValue) {
          const fiscalYearVariant = fiscalYearVariants.find(
            v => v.variant_id === fiscalYearValue
          );
          if (fiscalYearVariant) {
            fiscalYearDisplay = `${fiscalYearVariant.variant_id} - ${fiscalYearVariant.description}`;
          } else {
            fiscalYearDisplay = fiscalYearValue;
          }
        }
      }

      return {
        'Company Code': companyCode.code,
        'Name': companyCode.name,
        'Description': companyCode.description || '',
        'Country': companyCode.country,
        'Currency': companyCode.currency,
        'Fiscal Year': fiscalYearDisplay,
        'Tax ID': companyCode.taxId || '',
        'Address': companyCode.address || '',
        'City': companyCode.city || '',
        'State': companyCode.state || '',
        'Postal Code': companyCode.postalCode || '',
        'Phone': companyCode.phone || '',
        'Email': companyCode.email || '',
        'Website': companyCode.website || '',
        'Status': companyCode.active ? 'Active' : 'Inactive'
      };
    });

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
    link.setAttribute('download', `company-codes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredCompanyCodes.length} company codes to CSV file.`,
    });
  };

  // Function to handle deleting a company code
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Company Code?")) {
      deleteCompanyCodeMutation.mutate(id);
    }
  };

  // Function to open company code details dialog
  const openCompanyCodeDetails = (companyCode: CompanyCode) => {
    setViewingCompanyCodeDetails(companyCode);
    setIsCompanyCodeDetailsOpen(true);
  };

  // Function to handle deactivating a company code
  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this Company Code? This will set it to inactive status but preserve all associated records.")) {
      // Call the deactivate API
      fetch(`/api/master-data/company-code/${id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            toast({
              title: "Success",
              description: data.message,
            });
            // Refresh the company codes list
            fetchData();
          } else {
            throw new Error(data.error || 'Failed to deactivate company code');
          }
        })
        .catch(error => {
          console.error('Error deactivating company code:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to deactivate company code",
            variant: "destructive",
          });
        });
    }
  };

  // Check for errors
  if (companyCodesError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(companyCodesError as Error).message || "An error occurred"}</p>
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
            <h1 className="text-2xl font-bold">Company Codes</h1>
            <p className="text-sm text-muted-foreground">
              Manage the legal entities in your organization
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
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Company Code
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
            placeholder="Search company codes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={companyCodesLoading}
          title="Refresh company codes data"
        >
          <RefreshCw className={`h-4 w-4 ${companyCodesLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Company Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Codes</CardTitle>
          <CardDescription>
            All registered legal entities in your organization
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
                    <TableHead className="hidden lg:table-cell">Region</TableHead>
                    <TableHead className="hidden sm:table-cell">Country</TableHead>
                    <TableHead className="hidden md:table-cell">Currency</TableHead>
                    <TableHead className="hidden md:table-cell">Fiscal Year</TableHead>
                    <TableHead className="hidden lg:table-cell">Chart of Accounts</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyCodesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredCompanyCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        No company codes found. {searchQuery ? "Try a different search." : "Create your first company code."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanyCodes.map((companyCode) => {
                      // Get fiscal year display from API response or lookup from variants
                      let fiscalYearDisplay = "N/A";

                      // First, try to use the description directly from API response
                      if ((companyCode as any).fiscalYearDescription) {
                        const variantCode = (companyCode as any).fiscalYearVariantCode || companyCode.fiscalYear || (companyCode as any).fiscal_year;
                        fiscalYearDisplay = variantCode
                          ? `${variantCode} - ${(companyCode as any).fiscalYearDescription}`
                          : (companyCode as any).fiscalYearDescription;
                      } else {
                        // Fallback: lookup from fiscalYearVariants array
                        const fiscalYearValue = companyCode.fiscalYear || (companyCode as any).fiscal_year || null;
                        if (fiscalYearValue) {
                          const fiscalYearVariant = fiscalYearVariants.find(
                            v => v.variant_id === fiscalYearValue
                          );
                          if (fiscalYearVariant) {
                            fiscalYearDisplay = `${fiscalYearVariant.variant_id} - ${fiscalYearVariant.description}`;
                          } else {
                            fiscalYearDisplay = fiscalYearValue;
                          }
                        }
                      }

                      // Find country name for display
                      const countryData = countries.find((c: any) => c.code === companyCode.country);
                      const countryDisplay = countryData ? `${countryData.code} - ${countryData.name}` : companyCode.country;

                      return (
                        <TableRow
                          key={companyCode.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => openCompanyCodeDetails(companyCode)}
                        >
                          <TableCell className="font-medium">{companyCode.code}</TableCell>
                          <TableCell>{companyCode.name}</TableCell>
                          <TableCell className="hidden lg:table-cell">{(companyCode as any).regionName || companyCode.region || '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell">{countryDisplay}</TableCell>
                          <TableCell className="hidden md:table-cell">{companyCode.currency}</TableCell>
                          <TableCell className="hidden md:table-cell">{fiscalYearDisplay}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(companyCode as any).chartOfAccountsCode
                              ? `${(companyCode as any).chartOfAccountsCode} - ${(companyCode as any).chartOfAccountsName || ''}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${companyCode.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {companyCode.active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {permissions.hasDataModificationRights ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title="More actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openCompanyCodeDetails(companyCode)}>
                                    <Globe className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(companyCode)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  {companyCode.active && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeactivate(companyCode.id)}
                                      className="text-orange-600"
                                    >
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(companyCode.id)}
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Code Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingCompanyCode ? "Edit Company Code" : "Create Company Code"}
            </DialogTitle>
            <DialogDescription>
              {editingCompanyCode
                ? "Update the company code details below"
                : "Add a new legal entity to your organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Information</TabsTrigger>
                    <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                    <TabsTrigger value="additional">Additional Information</TabsTrigger>
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., US01"
                                {...field}
                                disabled={!!editingCompanyCode}
                              />
                            </FormControl>
                            <FormDescription>
                              Unique code for this legal entity (max 10 characters)
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
                                placeholder="E.g., ACME Corporation USA"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Official legal name of the entity
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
                              placeholder="Brief description of this legal entity"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="regionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                // Reset country when region changes
                                form.setValue("country", "");
                              }}
                              defaultValue={field.value}
                              value={field.value}
                              disabled={regionsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={regionsLoading ? "Loading regions..." : "Select region"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regionsLoading ? (
                                  <SelectItem value="loading" disabled>Loading regions...</SelectItem>
                                ) : regionsArr.length === 0 ? (
                                  <SelectItem value="none" disabled>No regions available</SelectItem>
                                ) : (
                                  regionsArr.map((region: any) => (
                                    <SelectItem key={region.id} value={String(region.id)}>
                                      {region.code ? `${region.code} - ` : ""}{region.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a region to filter countries
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country*</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                              }}
                              defaultValue={field.value}
                              value={field.value}
                              disabled={countriesLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countriesLoading ? (
                                  <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                                ) : filteredCountries.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    {watchedRegionId ? "No countries in this region" : "Select a region first"}
                                  </SelectItem>
                                ) : (
                                  filteredCountries.map((country: any) => (
                                    <SelectItem key={country.id} value={country.code}>
                                      {country.code} - {country.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the country — currency will auto-fill
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currenciesLoading ? (
                                  <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                                ) : currencies.length === 0 ? (
                                  <SelectItem value="none" disabled>No currencies available</SelectItem>
                                ) : (
                                  currencies.map((currency) => (
                                    <SelectItem key={currency.code} value={currency.code}>
                                      {currency.code} - {currency.name} ({currency.symbol})
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
                        name="fiscalYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fiscal Year*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fiscal year variant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fiscalYearVariantsLoading ? (
                                  <SelectItem value="loading" disabled>Loading fiscal year variants...</SelectItem>
                                ) : fiscalYearVariants.length === 0 ? (
                                  <SelectItem value="none" disabled>No fiscal year variants available</SelectItem>
                                ) : (
                                  fiscalYearVariants.map((variant) => (
                                    <SelectItem key={variant.id} value={variant.variant_id}>
                                      {variant.variant_id} - {variant.description}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="chartOfAccounts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chart of Accounts</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select chart of accounts (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {chartOfAccountsLoading ? (
                                  <SelectItem value="loading" disabled>Loading charts...</SelectItem>
                                ) : chartOfAccounts.length === 0 ? (
                                  <SelectItem value="none" disabled>No charts available</SelectItem>
                                ) : (
                                  chartOfAccounts.map((chart) => (
                                    <SelectItem key={chart.id} value={chart.chart_id}>
                                      {chart.chart_id} - {chart.description}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional - Select the chart of accounts for this company
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Tax identification number"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="active"
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
                              Is this company code active and available for use?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Contact & Address Tab */}
                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Street address"
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
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="City"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            {countryStates.length > 0 ? (
                              <Select
                                onValueChange={(val) => field.onChange(val === "__NONE__" ? "" : val)}
                                value={field.value || "__NONE__"}
                                disabled={statesLoading}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state/province" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__NONE__">-- None --</SelectItem>
                                  {countryStates.map((s: any) => (
                                    <SelectItem key={s.id} value={s.code}>
                                      {s.code} - {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <FormControl>
                                <Input
                                  placeholder={statesLoading ? "Loading..." : (watchedCountry ? "No states configured for this country" : "Select country first")}
                                  {...field}
                                  value={field.value || ""}
                                  disabled={statesLoading}
                                />
                              </FormControl>
                            )}
                            <FormDescription>
                              {countryStates.length > 0 ? `${countryStates.length} states/provinces available` : "State or province"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Postal or ZIP code"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Phone number"
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
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Email address"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave blank if no email address is available
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Additional Information Tab */}
                  <TabsContent value="additional" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://www.example.com"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Company website URL (must include http:// or https://). Leave blank if no website is available.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="URL to company logo"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
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
                          onClick={() => {
                            if (activeTab === "contact") setActiveTab("basic");
                            if (activeTab === "additional") setActiveTab("contact");
                          }}
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
                        {/* Next button (visible on first two tabs) */}
                        {activeTab !== "additional" && (
                          <Button
                            type="button"
                            onClick={() => {
                              if (activeTab === "basic") setActiveTab("contact");
                              if (activeTab === "contact") setActiveTab("additional");
                            }}
                          >
                            Next
                          </Button>
                        )}

                        {/* Save button (visible on all tabs) */}
                        <Button
                          type="button"
                          variant={activeTab !== "additional" ? "outline" : "default"}
                          onClick={() => {
                            // Get form values
                            const values = form.getValues();

                            // Pre-process values to handle empty email and website
                            const processedValues = {
                              ...values,
                              email: values.email === "" ? undefined : values.email,
                              website: values.website === "" ? undefined : values.website,
                              logoUrl: values.logoUrl === "" ? undefined : values.logoUrl
                            };

                            // Submit the form
                            if (editingCompanyCode) {
                              updateCompanyCodeMutation.mutate({ id: editingCompanyCode.id, companyCode: processedValues });
                            } else {
                              createCompanyCodeMutation.mutate(processedValues);
                            }
                          }}
                          disabled={createCompanyCodeMutation.isPending || updateCompanyCodeMutation.isPending}
                        >
                          {createCompanyCodeMutation.isPending || updateCompanyCodeMutation.isPending ? (
                            "Saving..."
                          ) : (
                            editingCompanyCode ? "Save Changes" : "Save"
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

      {/* Excel Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Company Codes from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with company code data to import in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <CompanyCodeExcelImport />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Code Details Dialog */}
      <Dialog open={isCompanyCodeDetailsOpen} onOpenChange={setIsCompanyCodeDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingCompanyCodeDetails && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompanyCodeDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Company Code Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingCompanyCodeDetails.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingCompanyCodeDetails.name}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingCompanyCodeDetails.code}
                      </Badge>
                      <Badge
                        variant={viewingCompanyCodeDetails.active ? "default" : "secondary"}
                        className={viewingCompanyCodeDetails.active ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingCompanyCodeDetails.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCompanyCodeDetailsOpen(false);
                        handleEdit(viewingCompanyCodeDetails);
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
                        setIsCompanyCodeDetailsOpen(false);
                        handleDelete(viewingCompanyCodeDetails.id);
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
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Currency:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.currency || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Language:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.language || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">
                            {viewingCompanyCodeDetails.active ? "Active" : "Inactive"}
                          </dd>
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
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.address || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">City:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.city || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">State:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.state || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Region:</dt>
                          <dd className="text-sm text-gray-900">{(viewingCompanyCodeDetails as any).regionName || viewingCompanyCodeDetails.region || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Country:</dt>
                          <dd className="text-sm text-gray-900">
                            {(() => {
                              const countryData = countries.find((c: any) => c.code === viewingCompanyCodeDetails.country);
                              return countryData ? `${countryData.code} - ${countryData.name}` : viewingCompanyCodeDetails.country;
                            })()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Postal Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.postalCode || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Financial Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Currency:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.currency || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Tax ID:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.taxId || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Fiscal Year Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Fiscal Year Variant:</dt>
                          <dd className="text-sm text-gray-900">
                            {(() => {
                              if ((viewingCompanyCodeDetails as any).fiscalYearDescription) {
                                const variantCode = (viewingCompanyCodeDetails as any).fiscalYearVariantCode
                                  || viewingCompanyCodeDetails.fiscalYear
                                  || (viewingCompanyCodeDetails as any).fiscal_year;
                                return variantCode
                                  ? `${variantCode} - ${(viewingCompanyCodeDetails as any).fiscalYearDescription}`
                                  : (viewingCompanyCodeDetails as any).fiscalYearDescription;
                              } else {
                                const fiscalYearValue = viewingCompanyCodeDetails.fiscalYear
                                  || (viewingCompanyCodeDetails as any).fiscal_year;
                                if (fiscalYearValue) {
                                  const fiscalYearVariant = fiscalYearVariants.find(
                                    v => v.variant_id === fiscalYearValue
                                  );
                                  return fiscalYearVariant
                                    ? `${fiscalYearVariant.variant_id} - ${fiscalYearVariant.description}`
                                    : fiscalYearValue;
                                }
                                return "—";
                              }
                            })()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Chart of Accounts:</dt>
                          <dd className="text-sm text-gray-900">
                            {(viewingCompanyCodeDetails as any).chartOfAccountsCode
                              ? `${(viewingCompanyCodeDetails as any).chartOfAccountsCode} - ${(viewingCompanyCodeDetails as any).chartOfAccountsName || ''}`
                              : '—'}
                          </dd>
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
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.phone || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Email:</dt>
                          <dd className="text-sm text-gray-900">{viewingCompanyCodeDetails.email || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Website:</dt>
                          <dd className="text-sm text-gray-900 flex items-center">
                            {viewingCompanyCodeDetails.website ? (
                              <>
                                <a
                                  href={viewingCompanyCodeDetails.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline mr-1"
                                >
                                  {viewingCompanyCodeDetails.website}
                                </a>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </>
                            ) : "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {viewingCompanyCodeDetails.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <div className="p-4 bg-gray-50 rounded-md border">
                      <p className="text-gray-600">{viewingCompanyCodeDetails.description}</p>
                    </div>
                  </div>
                )}

                {/* ── Administrative Data (SAP ECC style) ────────────────── */}
                <div className="border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAdminDataOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <Info className="h-3.5 w-3.5" />
                      Administrative Data
                    </span>
                    {adminDataOpen
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>

                  {adminDataOpen && (
                    <dl className="px-4 py-3 space-y-2 bg-white">
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-gray-400">Created on</dt>
                        <dd className="text-xs text-gray-500">
                          {viewingCompanyCodeDetails.created_at
                            ? new Date(viewingCompanyCodeDetails.created_at).toLocaleString()
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                        <dd className="text-xs text-gray-500">
                          {(viewingCompanyCodeDetails as any)._createdBy ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-gray-400">Last changed on</dt>
                        <dd className="text-xs text-gray-500">
                          {viewingCompanyCodeDetails.updated_at
                            ? new Date(viewingCompanyCodeDetails.updated_at).toLocaleString()
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                        <dd className="text-xs text-gray-500">
                          {(viewingCompanyCodeDetails as any)._updatedBy ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-xs text-gray-400">Tenant ID</dt>
                        <dd className="text-xs text-gray-500">
                          {(viewingCompanyCodeDetails as any)._tenantId ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}