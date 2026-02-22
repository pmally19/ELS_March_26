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
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Edit, Trash2, X, FileUp, Download, Factory, ArrowLeft, RefreshCw, PowerOff, Power, MoreHorizontal, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
// Import the plant excel import component
import PlantExcelImport from "../../components/master-data/PlantExcelImport";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Define the Plant type
type Plant = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  companyCodeId: number;
  companyCodeName?: string;
  valuationGroupingCodeId?: number | null;
  valuationGroupingCode?: string | null;
  valuationGroupingName?: string | null;
  type: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  manager: string | null;
  timezone: string | null;
  operatingHours: string | null;
  coordinates: string | null;
  factoryCalendar: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Define the Company Code type for selection
type CompanyCode = {
  id: number;
  code: string;
  name: string;
};

// List of plant types
const PLANT_TYPES = [
  "Manufacturing",
  "Distribution",
  "Warehouse",
  "Sales Office",
  "Service Center",
  "Research & Development",
  "Headquarters",
  "Regional Office",
  "Retail Store"
];


// List of timezones
const TIMEZONES = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00", "UTC+11:00", "UTC+12:00"
];

// Plant Form Schema
const plantSchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  companyCodeId: z.coerce.number().min(1, "Company Code is required"),
  valuationGroupingCodeId: z.coerce.number().optional().nullable(),
  type: z.string().min(1, "Plant Type is required"),
  category: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email format"), z.literal("")]).optional(),
  manager: z.string().optional(),
  timezone: z.string().optional(),
  operatingHours: z.string().optional(),
  coordinates: z.string().optional(),
  factoryCalendar: z.string().optional(),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
});

// Plant Management Page
export default function PlantPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [viewingPlant, setViewingPlant] = useState<Plant | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  // Fetch plants using direct api call to handle JSON parsing correctly
  const [plants, setPlants] = useState<Plant[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<Plant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [plantsError, setPlantsError] = useState<Error | null>(null);

  // Fetch company codes for dropdown selection
  const { data: companyCodes = [], isLoading: companyCodesLoading } = useQuery<CompanyCode[]>({
    queryKey: ['/api/master-data/company-code'],
    retry: 1,
  });

  // Fetch factory calendars for dropdown selection
  const { data: factoryCalendars = [] } = useQuery<any[]>({
    queryKey: ['/api/factory-calendars'],
    queryFn: async () => {
      const response = await fetch('/api/factory-calendars', {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch factory calendars');
      return response.json();
    },
    retry: 1,
  });

  // Fetch valuation grouping codes for dropdown selection
  const { data: valuationGroupingCodes = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/valuation-grouping-codes'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/valuation-grouping-codes?is_active=true');
      return await response.json();
    },
    retry: 1,
  });

  // Fetch countries for dropdown selection
  const { data: countriesList = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/countries');
      return await response.json();
    },
    retry: 1,
  });


  // Fetch data function - extracted for reuse
  const fetchData = async () => {
    try {
      // Fetch plants
      setPlantsLoading(true);
      const response = await fetch("/api/master-data/plant", {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Normalize plant data to handle field name variations and ensure consistent structure
      const normalizedPlants = Array.isArray(data)
        ? data.map((p: any) => ({
          id: p.id,
          code: p.code || '',
          name: p.name || '',
          description: p.description || null,
          companyCodeId: p.companyCodeId || p.company_code_id || null,
          companyCodeName: p.companyCodeName || null,
          valuationGroupingCodeId: p.valuationGroupingCodeId || p.valuation_grouping_code_id || null,
          valuationGroupingCode: p.valuationGroupingCode || p.valuation_grouping_code || null,
          valuationGroupingName: p.valuationGroupingName || p.valuation_grouping_name || null,
          type: p.type || null,
          category: p.category || null,
          address: p.address || null,
          city: p.city || null,
          state: p.state || null,
          country: p.country || null,
          postalCode: p.postalCode || p.postal_code || null,
          phone: p.phone || null,
          email: p.email || null,
          manager: p.manager || null,
          timezone: p.timezone || null,
          operatingHours: p.operatingHours || p.operating_hours || null,
          coordinates: p.coordinates || null,
          status: p.status || 'active',
          isActive: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
          createdAt: p.createdAt || p.created_at || null,
          updatedAt: p.updatedAt || p.updated_at || null
        }))
        : [];
      setPlants(normalizedPlants);
      setFilteredPlants(normalizedPlants);
      setPlantsLoading(false);
    } catch (error) {
      console.error("Error fetching plants:", error);
      setPlantsError(error instanceof Error ? error : new Error('Failed to fetch plants'));
      setPlantsLoading(false);
    }
  };

  // Refresh function for manual data reload
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest plants...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Plants have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Filter plants based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPlants(plants);
    } else {
      setFilteredPlants(
        plants.filter(
          (plant) =>
            plant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (plant.type && plant.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (plant.city && plant.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (plant.country && plant.country.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    }
  }, [searchQuery, plants]);

  // Plant form setup
  const form = useForm<z.infer<typeof plantSchema>>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      companyCodeId: 0,
      valuationGroupingCodeId: null,
      type: "",
      category: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      email: "",
      manager: "",
      timezone: "",
      operatingHours: "",
      coordinates: "",
      factoryCalendar: "",
      status: "active",
      isActive: true,
    },
  });

  // Watch country field to cascade state dropdown
  const selectedCountry = form.watch('country');
  const selectedCountryId = (() => {
    if (!selectedCountry) return null;
    const found = (countriesList as any[]).find(
      (c: any) => c.name === selectedCountry || c.code === selectedCountry
    );
    return found ? found.id : null;
  })();

  // Fetch states filtered by selected country
  const { data: statesList = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/states/country', selectedCountryId],
    queryFn: async () => {
      const response = await apiRequest(`/api/master-data/states/country/${selectedCountryId}`);
      return await response.json();
    },
    enabled: !!selectedCountryId,
    retry: 1,
  });

  // Set form values when editing
  useEffect(() => {
    if (editingPlant) {
      form.reset({
        code: editingPlant.code,
        name: editingPlant.name,
        description: editingPlant.description || "",
        companyCodeId: editingPlant.companyCodeId,
        valuationGroupingCodeId: editingPlant.valuationGroupingCodeId || null,
        type: editingPlant.type,
        category: editingPlant.category || "",
        address: editingPlant.address || "",
        city: editingPlant.city || "",
        state: editingPlant.state || "",
        country: editingPlant.country || "",
        postalCode: editingPlant.postalCode || "",
        phone: editingPlant.phone || "",
        email: editingPlant.email || "",
        manager: editingPlant.manager || "",
        timezone: editingPlant.timezone || "",
        operatingHours: editingPlant.operatingHours || "",
        coordinates: editingPlant.coordinates || "",
        factoryCalendar: editingPlant.factoryCalendar || "",
        status: editingPlant.status,
        isActive: editingPlant.isActive,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        companyCodeId: 0,
        valuationGroupingCodeId: null,
        type: "",
        category: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        phone: "",
        email: "",
        manager: "",
        timezone: "",
        operatingHours: "",
        coordinates: "",
        factoryCalendar: "",
        status: "active",
        isActive: true,
      });
    }
  }, [editingPlant, form]);

  // Create plant mutation
  const createPlantMutation = useMutation({
    mutationFn: (plant: z.infer<typeof plantSchema>) => {
      return apiRequest(`/api/master-data/plant`, {
        method: "POST",
        body: JSON.stringify(plant)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Failed to create plant");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plant created successfully",
      });
      // Refresh the plants list with normalized data
      fetchData();
      setShowDialog(false);
      setActiveTab("basic");
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Plant",
        variant: "destructive",
      });
    },
  });

  // Update plant mutation
  const updatePlantMutation = useMutation({
    mutationFn: (data: { id: number; plant: z.infer<typeof plantSchema> }) => {
      return apiRequest(`/api/master-data/plant/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.plant),
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({} as any));
          throw new Error(err.message || `Failed to update plant (${res.status})`);
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plant updated successfully",
      });
      fetch("/api/master-data/plant", {
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          setPlants(data);
          setFilteredPlants(data);
        });
      setShowDialog(false);
      setEditingPlant(null);
      setActiveTab("basic");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Plant",
        variant: "destructive",
      });
    },
  });

  // Delete plant mutation
  const deletePlantMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/plant/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plant deleted successfully",
      });
      fetch("/api/master-data/plant", {
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          setPlants(data);
          setFilteredPlants(data);
        });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Plant",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof plantSchema>) => {
    console.log("Form submitted with values:", values);

    // Normalize values before sending to API - no hardcoded defaults
    const updatedValues = {
      ...values,
      code: values.code.trim().toUpperCase(),
      // Convert empty strings to null/undefined for optional fields
      description: values.description?.trim() || null,
      email: values.email?.trim() || (values.email === "" ? undefined : values.email),
      category: values.category?.trim() || null,
      address: values.address?.trim() || null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      country: values.country?.trim() || null,
      postalCode: values.postalCode?.trim() || null,
      phone: values.phone?.trim() || null,
      manager: values.manager?.trim() || null,
      timezone: values.timezone?.trim() || null,
      operatingHours: values.operatingHours?.trim() || null,
      coordinates: values.coordinates?.trim() || null,
      // Use values from form, no hardcoded defaults
      type: values.type?.trim() || null,
      status: values.status?.trim() || 'active', // Use form value or database default
      companyCodeId: Number(values.companyCodeId || 0),
      valuationGroupingCodeId: values.valuationGroupingCodeId || null, // Include valuation grouping code
      isActive: values.isActive !== undefined ? values.isActive : true, // Use form value or database default
    };

    if (editingPlant) {
      updatePlantMutation.mutate({ id: editingPlant.id, plant: updatedValues });
    } else {
      createPlantMutation.mutate(updatedValues);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingPlant(null);
    setActiveTab("basic");
    form.reset();
  };

  // Function to handle editing a plant
  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant);

    // Map database fields to form fields - no hardcoded defaults
    const formData = {
      code: plant.code || "",
      name: plant.name || "",
      description: plant.description || "",
      companyCodeId: plant.companyCodeId || 0,
      valuationGroupingCodeId: plant.valuationGroupingCodeId || null,
      type: plant.type || "",
      category: plant.category || "",
      address: plant.address || "",
      city: plant.city || "",
      state: plant.state || "",
      country: plant.country || "",
      postalCode: plant.postalCode || "",
      phone: plant.phone || "",
      email: plant.email || "",
      manager: plant.manager || "",
      timezone: plant.timezone || "",
      operatingHours: plant.operatingHours || "",
      coordinates: plant.coordinates || "",
      factoryCalendar: plant.factoryCalendar || "",
      status: plant.status || "active", // Use database value or default to 'active'
      isActive: plant.isActive !== undefined ? plant.isActive : true, // Use database value or default to true
    };

    form.reset(formData);
    setShowDialog(true);
  };

  // Function to handle deleting a plant
  const handleDelete = (id: number) => {
    const choice = window.confirm(
      "This plant may have associated records. Would you like to:\n\n" +
      "• Click OK to attempt deletion (may fail if records exist)\n" +
      "• Click Cancel to cancel the operation\n\n" +
      "Alternatively, you can deactivate the plant instead of deleting it."
    );

    if (choice) {
      deletePlantMutation.mutate(id);
    }
  };

  // Function to handle viewing plant details
  const handleViewDetails = (plant: Plant) => {
    setViewingPlant(plant);
    setIsViewDetailsOpen(true);
  };

  // Function to handle deactivating a plant
  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this Plant? This will set it to inactive status but preserve all associated records.")) {
      // Call the deactivate API
      fetch(`/api/master-data/plant/${id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(async response => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to deactivate plant');
          }
          return data;
        })
        .then(data => {
          toast({
            title: "Success",
            description: data.message || "Plant deactivated successfully",
          });
          // Refresh the plants list with normalized data
          fetchData();
        })
        .catch(error => {
          console.error('Error deactivating plant:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to deactivate plant",
            variant: "destructive",
          });
        });
    }
  };

  // Function to handle activating a plant
  const handleActivate = (id: number) => {
    if (window.confirm("Are you sure you want to activate this Plant?")) {
      // Update plant to active status
      const plant = plants.find(p => p.id === id);
      if (!plant) {
        toast({
          title: "Error",
          description: "Plant not found",
          variant: "destructive",
        });
        return;
      }

      updatePlantMutation.mutate({
        id: id,
        plant: {
          ...plant,
          isActive: true,
          status: 'active'
        }
      });
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!plants || plants.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no plants to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Code',
      'Name',
      'Description',
      'Company Code',
      'Company Name',
      'Type',
      'Category',
      'Address',
      'City',
      'State',
      'Country',
      'Postal Code',
      'Phone',
      'Email',
      'Manager',
      'Timezone',
      'Operating Hours',
      'Coordinates',
      'Status',
      'Active'
    ];

    const csvContent = [
      headers.join(','),
      ...plants.map(plant => [
        `"${plant.code || ''}"`,
        `"${plant.name || ''}"`,
        `"${plant.description || ''}"`,
        `"${plant.companyCodeId || ''}"`,
        `"${plant.companyCodeName || ''}"`,
        `"${plant.type || ''}"`,
        `"${plant.category || ''}"`,
        `"${plant.address || ''}"`,
        `"${plant.city || ''}"`,
        `"${plant.state || ''}"`,
        `"${plant.country || ''}"`,
        `"${plant.postalCode || ''}"`,
        `"${plant.phone || ''}"`,
        `"${plant.email || ''}"`,
        `"${plant.manager || ''}"`,
        `"${plant.timezone || ''}"`,
        `"${plant.operatingHours || ''}"`,
        `"${plant.coordinates || ''}"`,
        `"${plant.status || ''}"`,
        plant.isActive ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plants-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${plants.length} plants to CSV file`,
    });
  };

  // Check for errors
  if (plantsError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(plantsError as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  // Find company code name by ID
  const getCompanyCodeName = (id: number) => {
    const companyCodesArray = Array.isArray(companyCodes) ? companyCodes : [];
    const companyCode = companyCodesArray.find((cc: any) => cc.id === id);
    return companyCode ? `${companyCode.code} - ${companyCode.name}` : "Unknown";
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
            <h1 className="text-2xl font-bold">Plants</h1>
            <p className="text-sm text-muted-foreground">
              Manage manufacturing sites, warehouses, and other facilities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <FileUp className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Plant
          </Button>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plants..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={plantsLoading}
          title="Refresh plants data"
        >
          <RefreshCw className={`h-4 w-4 ${plantsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Plants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plants</CardTitle>
          <CardDescription>
            All manufacturing and distribution facilities in your organization
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
                    <TableHead className="hidden md:table-cell">Company Code</TableHead>
                    <TableHead className="hidden xl:table-cell">Valuation Grouping</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plantsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredPlants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        No plants found. {searchQuery ? "Try a different search." : "Create your first plant."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlants.map((plant) => (
                      <TableRow
                        key={plant.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetails(plant)}
                      >
                        <TableCell className="font-medium">{plant.code}</TableCell>
                        <TableCell>{plant.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{getCompanyCodeName(plant.companyCodeId)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {plant.valuationGroupingCode
                            ? `${plant.valuationGroupingCode}${plant.valuationGroupingName ? ` - ${plant.valuationGroupingName}` : ''}`
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{plant.type}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {plant.city && plant.country ? `${plant.city}, ${plant.country}` :
                            plant.city || plant.country || "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plant.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {plant.isActive ? "Active" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => handleViewDetails(plant)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(plant)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {plant.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() => handleDeactivate(plant.id)}
                                    className="text-orange-600"
                                  >
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleActivate(plant.id)}
                                    className="text-green-600"
                                  >
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(plant.id)}
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

      {/* Plant Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingPlant ? "Edit Plant" : "Create Plant"}
            </DialogTitle>
            <DialogDescription>
              {editingPlant
                ? "Update the plant details below"
                : "Add a new manufacturing site or warehouse to your organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-170px)] pr-2 my-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 sticky top-0 bg-background z-10">
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
                                placeholder="E.g., P001"
                                {...field}
                                disabled={!!editingPlant}
                              />
                            </FormControl>
                            <FormDescription>
                              Unique code for this plant (max 10 characters)
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
                                placeholder="E.g., Main Manufacturing Plant"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Official name of the plant or facility
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
                              placeholder="Brief description of this plant"
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
                        name="companyCodeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Code*</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value ? field.value.toString() : undefined}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select company code" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companyCodesLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  Array.isArray(companyCodes) && companyCodes.map((cc: any) => (
                                    <SelectItem key={cc.id} value={cc.id.toString()}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Company code this plant belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plant Type*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plant type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PLANT_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
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
                        name="factoryCalendar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Factory Calendar</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select factory calendar (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {factoryCalendars.length === 0 ? (
                                  <SelectItem value="no-calendars" disabled>No factory calendars available</SelectItem>
                                ) : (
                                  factoryCalendars.map((calendar: any) => (
                                    <SelectItem
                                      key={calendar.factory_calendar_id || calendar.id}
                                      value={calendar.factory_calendar_id || calendar.calendar_code || calendar.id}
                                    >
                                      {calendar.calendar_code} - {calendar.description}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Factory calendar for working days and holidays
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valuationGroupingCodeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valuation Grouping Code</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                              value={field.value?.toString() || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select valuation grouping code (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {valuationGroupingCodes.length === 0 ? (
                                  <SelectItem value="no-codes" disabled>No valuation grouping codes available</SelectItem>
                                ) : (
                                  valuationGroupingCodes.map((vgc: any) => (
                                    <SelectItem
                                      key={vgc.id}
                                      value={vgc.id.toString()}
                                    >
                                      {vgc.code} - {vgc.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Valuation grouping code for material valuation at this plant
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
                                placeholder="E.g., Heavy Industry"
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
                      name="isActive"
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
                              Is this plant active and available for use?
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
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Clear state when country changes
                                form.setValue('state', '');
                              }}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countriesList.length === 0 ? (
                                  <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                                ) : (
                                  countriesList.map((c: any) => (
                                    <SelectItem key={c.id} value={c.name}>
                                      {c.code} - {c.name}
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
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value || ""}
                              disabled={!selectedCountryId}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={selectedCountryId ? "Select state/province" : "Select a country first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statesList.length === 0 ? (
                                  <SelectItem value="no-states" disabled>No states available for this country</SelectItem>
                                ) : (
                                  statesList.map((s: any) => (
                                    <SelectItem key={s.id} value={s.name || s.code}>
                                      {s.code} - {s.name}
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <FormField
                        control={form.control}
                        name="manager"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plant Manager</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Name of plant manager"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Additional Information Tab */}
                  <TabsContent value="additional" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TIMEZONES.map((timezone) => (
                                  <SelectItem key={timezone} value={timezone}>
                                    {timezone}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="operatingHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Hours</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="E.g., Mon-Fri: 8AM-5PM"
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
                      name="coordinates"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPS Coordinates</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Latitude, Longitude (E.g., 40.7128, -74.0060)"
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plant Category</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Optional categorization"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional categorization for reporting purposes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4">
                  <div className="flex w-full justify-between">
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                      >
                        Cancel
                      </Button>

                      {activeTab !== "basic" && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (activeTab === "contact") setActiveTab("basic");
                            if (activeTab === "additional") setActiveTab("contact");
                          }}
                          className="ml-2"
                        >
                          Previous
                        </Button>
                      )}
                    </div>

                    <div>
                      {activeTab !== "additional" ? (
                        <Button
                          type="button"
                          onClick={() => {
                            // Validate current tab before proceeding
                            if (activeTab === "basic") {
                              const basicFields = ["code", "name", "companyCodeId", "type"];
                              form.trigger(basicFields as any).then(isValid => {
                                if (isValid) setActiveTab("contact");
                              });
                            } else if (activeTab === "contact") {
                              // Validate email if it's not empty before proceeding
                              const email = form.getValues().email;
                              if (email && email.trim() !== "") {
                                form.trigger("email").then(isValid => {
                                  if (isValid) setActiveTab("additional");
                                });
                              } else {
                                setActiveTab("additional");
                              }
                            }
                          }}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            // Validate form before submitting
                            form.trigger().then(isValid => {
                              if (isValid) {
                                // Get form values
                                const values = form.getValues();

                                // Pre-process values to handle empty email
                                const processedValues = {
                                  ...values,
                                  email: values.email === "" ? undefined : values.email
                                };

                                // Submit the form
                                if (editingPlant) {
                                  updatePlantMutation.mutate({ id: editingPlant.id, plant: processedValues });
                                } else {
                                  createPlantMutation.mutate(processedValues);
                                }
                              }
                            });
                          }}
                          disabled={createPlantMutation.isPending || updatePlantMutation.isPending}
                        >
                          {createPlantMutation.isPending || updatePlantMutation.isPending ? (
                            "Saving..."
                          ) : (
                            editingPlant ? "Update Plant" : "Create Plant"
                          )}
                        </Button>
                      )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Plants from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with plant data to import in bulk
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PlantExcelImport companyCodes={Array.isArray(companyCodes) ? companyCodes : []} />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plant Details</DialogTitle>
            <DialogDescription>
              Complete information about this plant facility
            </DialogDescription>
          </DialogHeader>
          {viewingPlant && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Code</Label>
                    <p className="font-mono font-semibold text-lg">{viewingPlant.code}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${viewingPlant.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {viewingPlant.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium text-lg">{viewingPlant.name}</p>
                  </div>
                  {viewingPlant.description && (
                    <div className="col-span-2">
                      <Label className="text-gray-500">Description</Label>
                      <p className="text-gray-700">{viewingPlant.description}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">Company Code</Label>
                    <p className="text-gray-700">{getCompanyCodeName(viewingPlant.companyCodeId)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Type</Label>
                    <p className="text-gray-700">{viewingPlant.type || "-"}</p>
                  </div>
                  {viewingPlant.factoryCalendar && (
                    <div>
                      <Label className="text-gray-500">Factory Calendar</Label>
                      <p className="text-gray-700">{viewingPlant.factoryCalendar}</p>
                    </div>
                  )}
                  {(viewingPlant.valuationGroupingCode || viewingPlant.valuationGroupingName) && (
                    <div>
                      <Label className="text-gray-500">Valuation Grouping Code</Label>
                      <p className="text-gray-700">
                        {viewingPlant.valuationGroupingCode && viewingPlant.valuationGroupingName
                          ? `${viewingPlant.valuationGroupingCode} - ${viewingPlant.valuationGroupingName}`
                          : viewingPlant.valuationGroupingCode || viewingPlant.valuationGroupingName || "-"}
                      </p>
                    </div>
                  )}
                  {viewingPlant.category && (
                    <div>
                      <Label className="text-gray-500">Category</Label>
                      <p className="text-gray-700">{viewingPlant.category}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Information */}
              {(viewingPlant.address || viewingPlant.city || viewingPlant.state || viewingPlant.country || viewingPlant.postalCode) && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingPlant.address && (
                      <div className="col-span-2">
                        <Label className="text-gray-500">Address</Label>
                        <p className="text-gray-700">{viewingPlant.address}</p>
                      </div>
                    )}
                    {viewingPlant.city && (
                      <div>
                        <Label className="text-gray-500">City</Label>
                        <p className="text-gray-700">{viewingPlant.city}</p>
                      </div>
                    )}
                    {viewingPlant.state && (
                      <div>
                        <Label className="text-gray-500">State</Label>
                        <p className="text-gray-700">{viewingPlant.state}</p>
                      </div>
                    )}
                    {viewingPlant.factoryCalendar && (
                      <div>
                        <Label className="text-gray-500">Factory Calendar</Label>
                        <p className="text-gray-700">{viewingPlant.factoryCalendar}</p>
                      </div>
                    )}
                    {viewingPlant.country && (
                      <div>
                        <Label className="text-gray-500">Country</Label>
                        <p className="text-gray-700">{viewingPlant.country}</p>
                      </div>
                    )}
                    {viewingPlant.postalCode && (
                      <div>
                        <Label className="text-gray-500">Postal Code</Label>
                        <p className="text-gray-700">{viewingPlant.postalCode}</p>
                      </div>
                    )}
                    {viewingPlant.coordinates && (
                      <div className="col-span-2">
                        <Label className="text-gray-500">Coordinates</Label>
                        <p className="text-gray-700 font-mono text-sm">{viewingPlant.coordinates}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(viewingPlant.phone || viewingPlant.email || viewingPlant.manager) && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingPlant.manager && (
                      <div>
                        <Label className="text-gray-500">Manager</Label>
                        <p className="text-gray-700">{viewingPlant.manager}</p>
                      </div>
                    )}
                    {viewingPlant.phone && (
                      <div>
                        <Label className="text-gray-500">Phone</Label>
                        <p className="text-gray-700">{viewingPlant.phone}</p>
                      </div>
                    )}
                    {viewingPlant.email && (
                      <div className="col-span-2">
                        <Label className="text-gray-500">Email</Label>
                        <p className="text-gray-700">{viewingPlant.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Operational Information */}
              {(viewingPlant.timezone || viewingPlant.operatingHours) && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Operations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingPlant.timezone && (
                      <div>
                        <Label className="text-gray-500">Timezone</Label>
                        <p className="text-gray-700">{viewingPlant.timezone}</p>
                      </div>
                    )}
                    {viewingPlant.operatingHours && (
                      <div>
                        <Label className="text-gray-500">Operating Hours</Label>
                        <p className="text-gray-700">{viewingPlant.operatingHours}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">Created At</Label>
                    <p className="text-gray-700">
                      {viewingPlant.createdAt
                        ? new Date(viewingPlant.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Updated At</Label>
                    <p className="text-gray-700">
                      {viewingPlant.updatedAt
                        ? new Date(viewingPlant.updatedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDetailsOpen(false);
                    handleEdit(viewingPlant);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Plant
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}