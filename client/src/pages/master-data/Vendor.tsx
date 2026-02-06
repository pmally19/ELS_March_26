import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
  Building, Edit, Trash2, RefreshCw, Plus, FileUp, Mail,
  Phone, DollarSign, MapPin, Globe, User, Filter, TruckIcon, StarIcon, ArrowLeft, Package2, Check, ChevronsUpDown
} from 'lucide-react';
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Types for data
interface Vendor {
  id: number;
  code: string;
  name: string;
  legalName?: string;
  name2?: string;
  name3?: string;
  name4?: string;
  searchTerm?: string;
  sortField?: string;
  title?: string;
  type: string;
  categoryId?: number;
  accountGroup?: string;
  industry?: string;
  industryKey?: string;
  industryClassification?: string;
  taxId?: string;
  taxId2?: string;
  taxId3?: string;
  taxOffice?: string;
  vatNumber?: string;
  fiscalAddress?: string;
  registrationNumber?: string;
  address?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  address5?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  poBox?: string;
  poBoxPostalCode?: string;
  region?: string;
  county?: string;
  timeZone?: string;
  taxJurisdiction?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  currency?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  alternativePayee?: string;
  paymentBlock?: string;
  houseBank?: string;
  checkDoubleInvoice?: boolean;
  bankName?: string;
  bankAccount?: string;
  bankRoutingNumber?: string;
  swiftCode?: string;
  iban?: string;
  bankCountry?: string;
  bankKey?: string;
  accountType?: string;
  bankTypeKey?: string;
  incoterms?: string;
  minimumOrderValue?: number;
  evaluationScore?: number;
  leadTime?: number;
  purchasingGroupId?: number;
  authorizationGroup?: string;
  corporateGroup?: string;
  withholdingTaxCountry?: string;
  withholdingTaxType?: string;
  withholdingTaxCode?: string;
  withholdingTaxLiable?: boolean;
  exemptionNumber?: string;
  exemptionPercentage?: number;
  exemptionReason?: string;
  exemptionFrom?: string;
  exemptionTo?: string;
  status: string;
  centralPostingBlock?: boolean;
  centralDeletionFlag?: boolean;
  postingBlockCompanyCode?: boolean;
  deletionFlagCompanyCode?: boolean;
  postingBlockPurchasingOrg?: boolean;
  deletionFlagPurchasingOrg?: boolean;
  blacklisted: boolean;
  blacklistReason?: string;
  notes?: string;
  tags?: string[];
  companyCodeId?: number;
  purchaseOrganizationId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
  version?: number;
}

interface VendorContact {
  id: number;
  vendorId: number;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  isOrderContact: boolean;
  isPurchaseContact: boolean;
  isQualityContact: boolean;
  isAccountsContact: boolean;
  preferredLanguage?: string;
  notes?: string;
  isActive: boolean;
}

// Validation schema for vendor form
const vendorFormSchema = z.object({
  code: z.string().optional(), // Auto-generated, not required from user
  name: z.string().min(3, "Name must be at least 3 characters"),
  legalName: z.string().optional(),
  name2: z.string().optional(),
  name3: z.string().optional(),
  name4: z.string().optional(),
  searchTerm: z.string().optional(),
  sortField: z.string().optional(),
  title: z.string().optional(),
  type: z.string().min(1, "Vendor type is required"),
  categoryId: z.coerce.number().optional(),
  accountGroupId: z.coerce.number().optional(),
  accountGroup: z.string().optional(),
  industry: z.string().optional(),
  industryKey: z.string().optional(),
  industryClassification: z.string().optional(),
  taxId: z.string().optional(),
  taxId2: z.string().optional(),
  taxId3: z.string().optional(),
  taxOffice: z.string().optional(),
  vatNumber: z.string().optional(),
  fiscalAddress: z.string().optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  address3: z.string().optional(),
  address4: z.string().optional(),
  address5: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  poBox: z.string().optional(),
  poBoxPostalCode: z.string().optional(),
  region: z.string().optional(),
  county: z.string().optional(),
  timeZone: z.string().optional(),
  taxJurisdiction: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  website: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.string().optional(),
  reconciliationAccountId: z.coerce.number().optional(),
  alternativePayee: z.string().optional(),
  paymentBlock: z.string().optional(),
  houseBank: z.string().optional(),
  checkDoubleInvoice: z.boolean().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  bankCountry: z.string().optional(),
  bankKey: z.string().optional(),
  accountType: z.string().optional(),
  bankTypeKey: z.string().optional(),
  incoterms: z.string().optional(),
  minimumOrderValue: z.coerce.number().optional(),
  evaluationScore: z.coerce.number().min(0).max(100).optional(),
  leadTime: z.coerce.number().optional(),
  purchasingGroupId: z.coerce.number().optional(),
  authorizationGroup: z.string().optional(),
  corporateGroup: z.string().optional(),
  withholdingTaxCountry: z.string().optional(),
  withholdingTaxType: z.string().optional(),
  withholdingTaxCode: z.string().optional(),
  withholdingTaxLiable: z.boolean().optional(),
  exemptionNumber: z.string().optional(),
  exemptionPercentage: z.coerce.number().optional(),
  exemptionReason: z.string().optional(),
  exemptionFrom: z.string().optional(),
  exemptionTo: z.string().optional(),
  status: z.string().default("active"),
  centralPostingBlock: z.boolean().optional(),
  centralDeletionFlag: z.boolean().optional(),
  postingBlockCompanyCode: z.boolean().optional(),
  deletionFlagCompanyCode: z.boolean().optional(),
  postingBlockPurchasingOrg: z.boolean().optional(),
  deletionFlagPurchasingOrg: z.boolean().optional(),
  blacklisted: z.boolean().default(false),
  blacklistReason: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  companyCodeId: z.coerce.number().optional(),
  purchaseOrganizationId: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

// Validation schema for vendor contact form
const contactFormSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isOrderContact: z.boolean().default(false),
  isPurchaseContact: z.boolean().default(false),
  isQualityContact: z.boolean().default(false),
  isAccountsContact: z.boolean().default(false),
  preferredLanguage: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function Vendor() {
  const permissions = useAgentPermissions();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [viewingVendorDetails, setViewingVendorDetails] = useState<Vendor | null>(null);
  const [isVendorDetailsOpen, setIsVendorDetailsOpen] = useState(false);

  // Forms
  const addForm = useForm<z.infer<typeof vendorFormSchema>>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "supplier",
      status: "active",
      blacklisted: false,
      isActive: true,
      accountGroupId: undefined,
    },
  });

  const editForm = useForm<z.infer<typeof vendorFormSchema>>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "supplier",
      status: "active",
      blacklisted: false,
      isActive: true,
    },
  });

  const contactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      position: "",
      department: "",
      email: "",
      phone: "",
      mobile: "",
      isPrimary: false,
      isOrderContact: false,
      isPurchaseContact: false,
      isQualityContact: false,
      isAccountsContact: false,
      preferredLanguage: "English",
      notes: "",
      isActive: true,
    },
  });

  // Fetch data
  const { data: vendors = [] as Vendor[], isLoading, error } = useQuery({
    queryKey: ['/api/master-data/vendor'],
    retry: 1,
  });

  const { data: contacts = [] as VendorContact[], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['/api/master-data/vendor-contact', selectedVendorId],
    enabled: !!selectedVendorId,
    retry: 1,
  });

  // Fetch currencies for dropdown
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ['/api/master-data/currency'],
    retry: 1,
  });
  const currencies: any[] = Array.isArray(currenciesData) ? currenciesData : [];

  // Fetch payment terms for dropdown
  const { data: paymentTermsData, isLoading: isLoadingPaymentTerms } = useQuery({
    queryKey: ['/api/master-data-crud/payment-terms'],
    retry: 1,
  });

  // Extract payment terms from the response
  const paymentTerms: any[] = (() => {
    if (!paymentTermsData) return [];
    if (typeof paymentTermsData === 'object' && 'records' in paymentTermsData) {
      const records = (paymentTermsData as any).records;
      return Array.isArray(records) ? records : [];
    }
    return Array.isArray(paymentTermsData) ? paymentTermsData : [];
  })();

  // Fetch company codes for dropdown
  const { data: companyCodesData, isLoading: isLoadingCompanyCodes } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    retry: 1,
  });
  const companyCodes: any[] = Array.isArray(companyCodesData) ? companyCodesData : [];

  // Fetch purchase organizations for dropdown
  const { data: purchaseOrganizationsData, isLoading: isLoadingPurchaseOrganizations } = useQuery({
    queryKey: ['/api/master-data/purchase-organization'],
    retry: 1,
  });
  // Filter to show only active purchase organizations
  const purchaseOrganizations: any[] = Array.isArray(purchaseOrganizationsData)
    ? purchaseOrganizationsData.filter((org: any) => org.isActive !== false && org.active !== false)
    : [];

  // Fetch purchasing groups for dropdown (from purchase_groups table)
  const { data: purchasingGroupsData, isLoading: isLoadingPurchasingGroups } = useQuery({
    queryKey: ['/api/master-data/purchase-group'],
    retry: 1,
  });
  const purchasingGroups: any[] = Array.isArray(purchasingGroupsData)
    ? purchasingGroupsData.filter((group: any) => group.is_active !== false && group.active !== false)
    : [];

  // Fetch vendor account groups (account_type = 'VENDOR')
  const { data: accountGroupsData, isLoading: isLoadingAccountGroups } = useQuery({
    queryKey: ['/api/master-data/account-groups', 'VENDOR'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/account-groups?accountType=VENDOR');
      if (!response.ok) throw new Error('Failed to fetch account groups');
      return response.json();
    },
    retry: 1,
  });
  const accountGroups: any[] = Array.isArray(accountGroupsData) ? accountGroupsData : [];

  // Fetch reconciliation accounts (filtered for AP - Accounts Payable)
  const { data: reconciliationAccountsData, isLoading: isLoadingReconciliationAccounts } = useQuery({
    queryKey: ['/api/master-data/reconciliation-accounts', 'AP'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/reconciliation-accounts');
      if (!response.ok) throw new Error('Failed to fetch reconciliation accounts');
      const data = await response.json();
      // Filter for AP (Accounts Payable) type accounts and active ones
      return Array.isArray(data) ? data.filter((acc: any) =>
        acc.accountType === 'AP' && acc.isActive !== false
      ) : [];
    },
    retry: 1,
  });
  const reconciliationAccounts: any[] = Array.isArray(reconciliationAccountsData) ? reconciliationAccountsData : [];

  // Mutations
  const addVendorMutation = useMutation({
    mutationFn: (data: z.infer<typeof vendorFormSchema>) =>
      apiRequest('/api/master-data/vendor', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Vendor Added",
        description: "Vendor has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof vendorFormSchema> }) =>
      apiRequest(`/api/master-data/vendor/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor'] });
      setIsEditDialogOpen(false);
      setEditingVendor(null);
      toast({
        title: "Vendor Updated",
        description: "Vendor has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/vendor/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor'] });
      setIsDeleteDialogOpen(false);
      setDeletingVendor(null);
      toast({
        title: "Vendor Deleted",
        description: "Vendor has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (data: z.infer<typeof contactFormSchema>) =>
      apiRequest(`/api/master-data/vendor/${selectedVendorId}/contacts`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor-contact', selectedVendorId] });
      setIsAddContactDialogOpen(false);
      contactForm.reset();
      toast({
        title: "Contact Added",
        description: "Contact has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submit handlers
  const handleAddSubmit = (data: z.infer<typeof vendorFormSchema>) => {
    // Manually validate accountGroupId is present for creation
    if (!data.accountGroupId) {
      addForm.setError("accountGroupId", {
        type: "manual",
        message: "Account Group is required"
      });
      return;
    }
    addVendorMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof vendorFormSchema>) => {
    if (!editingVendor) return;
    updateVendorMutation.mutate({ id: editingVendor.id, data });
  };

  const handleAddContactSubmit = (data: z.infer<typeof contactFormSchema>) => {
    if (!selectedVendorId) return;
    addContactMutation.mutate(data);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);

    // Extract accountGroupId safely
    let accountGroupId = (vendor as any).accountGroupId;

    // If not found directly, try to find it in the loaded accountGroups list by matching code or ID
    if (!accountGroupId && vendor.accountGroup && accountGroups.length > 0) {
      const match = accountGroups.find((ag: any) =>
        ag.code === vendor.accountGroup || ag.id.toString() === vendor.accountGroup
      );
      if (match) {
        accountGroupId = match.id;
      }
    }

    // Fallback: try parsing if it looks like a number, ensuring we don't pass NaN
    if (!accountGroupId && vendor.accountGroup) {
      const parsed = parseInt(vendor.accountGroup);
      if (!isNaN(parsed)) accountGroupId = parsed;
    }

    // Use a default account group if absolutely nothing is found (optional, but prevents form crash)
    // or leave it undefined to let validation logic handle it, but avoid NaN.

    editForm.reset({
      code: vendor.code,
      name: vendor.name,
      type: vendor.type,
      accountGroupId: accountGroupId,
      taxId: vendor.taxId || "",
      industry: vendor.industry || "",
      address: vendor.address || "",
      city: vendor.city || "",
      state: vendor.state || "",
      country: vendor.country || "",
      postalCode: vendor.postalCode || "",
      region: vendor.region || "",
      phone: vendor.phone || "",
      altPhone: vendor.altPhone || "",
      email: vendor.email || "",
      website: vendor.website || "",
      currency: vendor.currency || "",
      paymentTerms: vendor.paymentTerms || "",
      paymentMethod: vendor.paymentMethod || "",
      reconciliationAccountId: (vendor as any).reconciliationAccountId,
      minimumOrderValue: vendor.minimumOrderValue,
      evaluationScore: vendor.evaluationScore,
      leadTime: vendor.leadTime,
      purchasingGroupId: vendor.purchasingGroupId,
      status: vendor.status,
      blacklisted: vendor.blacklisted,
      blacklistReason: vendor.blacklistReason || "",
      notes: vendor.notes || "",
      companyCodeId: vendor.companyCodeId,
      purchaseOrganizationId: vendor.purchaseOrganizationId,
      isActive: vendor.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (vendor: Vendor) => {
    setDeletingVendor(vendor);
    setIsDeleteDialogOpen(true);
  };

  const openVendorDetails = (vendor: Vendor) => {
    setViewingVendorDetails(vendor);
    setSelectedVendorId(vendor.id);
    setIsVendorDetailsOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Vendor
        </div>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor</h1>
          <p className="text-gray-600 mt-1">
            Manage suppliers, contractors, and service providers
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/master-data/vendor'] });
              toast({
                title: "Refreshed",
                description: "Vendor list has been refreshed.",
              });
            }}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => window.location.href = '/master-data/vendor-material-assignment'}
          >
            <Package2 className="h-4 w-4" />
            <span>Assign Materials</span>
          </Button>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => {
              const csvContent = (vendors as Vendor[])?.map((vendor: Vendor) => ({
                Code: vendor.code,
                Name: vendor.name,
                Type: vendor.type,
                Industry: vendor.industry || '',
                City: vendor.city || '',
                Country: vendor.country || '',
                Phone: vendor.phone || '',
                Email: vendor.email || '',
                PaymentTerms: vendor.paymentTerms || '',
                Status: vendor.isActive ? 'Active' : 'Inactive'
              })) || [];

              const csvString = [
                Object.keys(csvContent[0] || {}).join(','),
                ...csvContent.map((row: any) => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'vendors.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <FileUp className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
          >
            <FileUp className="h-4 w-4" />
            <span>Import</span>
          </Button>
          <Button
            variant="default"
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vendor</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Vendors</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="service">Service Providers</TabsTrigger>
          <TabsTrigger value="blacklisted">Blacklisted</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <VendorTable
            vendors={vendors as Vendor[]}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onViewDetails={openVendorDetails}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <VendorTable
            vendors={(vendors as Vendor[]).filter(vendor => vendor.type === 'supplier')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onViewDetails={openVendorDetails}
          />
        </TabsContent>

        <TabsContent value="contractors">
          <VendorTable
            vendors={(vendors as Vendor[]).filter(vendor => vendor.type === 'contractor')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onViewDetails={openVendorDetails}
          />
        </TabsContent>

        <TabsContent value="service">
          <VendorTable
            vendors={(vendors as Vendor[]).filter(vendor => vendor.type === 'service_provider')}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onViewDetails={openVendorDetails}
          />
        </TabsContent>

        <TabsContent value="blacklisted">
          <VendorTable
            vendors={(vendors as Vendor[]).filter(vendor => vendor.blacklisted)}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onViewDetails={openVendorDetails}
          />
        </TabsContent>
      </Tabs>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to the system. Fill in basic vendor information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="finance">Financial</TabsTrigger>
                  <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="accountGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Group *</FormLabel>
                          <Select
                            onValueChange={async (value) => {
                              const accountGroupId = parseInt(value);
                              field.onChange(accountGroupId);

                              // Generate vendor code when account group is selected
                              try {
                                const response = await fetch(`/api/master-data/vendor/generate-code?accountGroupId=${accountGroupId}`);
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.code) {
                                    addForm.setValue('code', data.code);
                                  }
                                } else {
                                  // If generation fails, clear the code
                                  addForm.setValue('code', '');
                                }
                              } catch (error) {
                                console.error('Error generating vendor code:', error);
                                addForm.setValue('code', '');
                              }
                            }}
                            value={field.value?.toString() || ''}
                            disabled={isLoadingAccountGroups}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingAccountGroups ? "Loading..." : "Select Account Group"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accountGroups.map((ag: any) => (
                                <SelectItem key={ag.id} value={ag.id.toString()}>
                                  {ag.code} - {ag.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Account group determines vendor code format and number range
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Auto-generated"
                              {...field}
                              readOnly
                              disabled
                              className="bg-gray-50 cursor-not-allowed"
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-generated based on account group number range
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Global Supply Co." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Type *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., supplier, contractor, service_provider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="onboarding">Onboarding</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="construction">Construction</SelectItem>
                              <SelectItem value="transportation">Transportation</SelectItem>
                              <SelectItem value="agriculture">Agriculture</SelectItem>
                              <SelectItem value="energy">Energy</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@supplier.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.supplier.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="address" className="space-y-4 pt-4">
                  <FormField
                    control={addForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Chicago" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="IL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter country code (e.g., US, IN, GB)" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter ISO country code (2-3 letters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal/ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="60601" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="north_america">North America</SelectItem>
                            <SelectItem value="south_america">South America</SelectItem>
                            <SelectItem value="europe">Europe</SelectItem>
                            <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                            <SelectItem value="middle_east">Middle East</SelectItem>
                            <SelectItem value="africa">Africa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCurrencies ? (
                                <SelectItem value="" disabled>Loading currencies...</SelectItem>
                              ) : (currencies && currencies.length > 0) ? (
                                currencies.map((currency: any) => (
                                  <SelectItem key={currency.id || currency.code} value={currency.code || currency.currencyCode || currency.currency_code}>
                                    {currency.code || currency.currencyCode || currency.currency_code} - {currency.name || currency.currencyName || currency.currency_name || ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No currencies available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingPaymentTerms ? (
                                <SelectItem value="" disabled>Loading payment terms...</SelectItem>
                              ) : paymentTerms.length > 0 ? (
                                paymentTerms.map((term: any) => (
                                  <SelectItem key={term.id} value={term.paymentTermCode || term.payment_term_key || term.code || term.key}>
                                    {term.description || term.paymentTermCode || term.payment_term_key || term.code || term.key}
                                    {term.dueDays !== undefined ? ` (${term.dueDays} days)` : ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No payment terms available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="reconciliationAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reconciliation Account</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              if (value === 'none') {
                                field.onChange(undefined);
                              } else {
                                field.onChange(value ? parseInt(value) : undefined);
                              }
                            }}
                            value={field.value?.toString() || 'none'}
                            disabled={isLoadingReconciliationAccounts}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingReconciliationAccounts ? "Loading..." : "Select Reconciliation Account"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {reconciliationAccounts.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.code} - {acc.name} ({acc.glAccountNumber || acc.glAccountNumber || ''})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            GL account for vendor reconciliation (AP accounts only)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Bank Transfer, Check, Credit Card" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter payment method name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="companyCodeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCompanyCodes ? (
                                <SelectItem value="" disabled>Loading company codes...</SelectItem>
                              ) : (companyCodes && companyCodes.length > 0) ? (
                                companyCodes.map((company: any) => (
                                  <SelectItem key={company.id} value={company.id.toString()}>
                                    {company.code} - {company.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No company codes available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </TabsContent>

                <TabsContent value="purchasing" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="purchaseOrganizationId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Purchase Organization</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value
                                    ? purchaseOrganizations.find((org: any) => org.id === field.value)?.code
                                      ? `${purchaseOrganizations.find((org: any) => org.id === field.value)?.code} - ${purchaseOrganizations.find((org: any) => org.id === field.value)?.name || ''}`
                                      : purchaseOrganizations.find((org: any) => org.id === field.value)?.name || 'Select organization'
                                    : "Select purchase organization"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search organization..." />
                                <CommandEmpty>No organization found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {isLoadingPurchaseOrganizations ? (
                                    <CommandItem disabled>Loading...</CommandItem>
                                  ) : (purchaseOrganizations && purchaseOrganizations.length > 0) ? (
                                    purchaseOrganizations.map((org: any) => (
                                      <CommandItem
                                        key={org.id}
                                        value={`${org.code} ${org.name}`.toLowerCase()}
                                        onSelect={() => {
                                          field.onChange(org.id);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${field.value === org.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                        {org.code ? `${org.code} - ${org.name || ''}` : (org.name || '')}
                                      </CommandItem>
                                    ))
                                  ) : (
                                    <CommandItem disabled>No organizations available</CommandItem>
                                  )}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="purchasingGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Group</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select purchase group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingPurchasingGroups ? (
                                <SelectItem value="" disabled>Loading purchase groups...</SelectItem>
                              ) : (purchasingGroups && purchasingGroups.length > 0) ? (
                                purchasingGroups.map((group: any) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.code ? `${group.code} - ${group.name || ''}` : (group.name || '')}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No purchase groups available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="minimumOrderValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Value</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} />
                          </FormControl>
                          <FormDescription>
                            Minimum value required for orders
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="leadTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Time (Days)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="14" {...field} />
                          </FormControl>
                          <FormDescription>
                            Average days from order to delivery
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="evaluationScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluation Score (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" placeholder="75" {...field} />
                        </FormControl>
                        <FormDescription>
                          Supplier performance rating
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="purchasingGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchasing Group</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purchasing group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingPurchasingGroups ? (
                              <SelectItem value="" disabled>Loading purchasing groups...</SelectItem>
                            ) : (purchasingGroups && purchasingGroups.length > 0) ? (
                              purchasingGroups.map((org: any) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.code ? `${org.code} - ${org.name || ''}` : (org.name || '')}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>No purchasing groups available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="blacklisted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Blacklisted</FormLabel>
                            <FormDescription>
                              Prevent ordering from this vendor
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="blacklistReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blacklist Reason</FormLabel>
                          <FormControl>
                            <Input placeholder="Reason for blacklisting" disabled={!addForm.watch("blacklisted")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes about this vendor"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable for transactions and reporting
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addVendorMutation.isPending}>
                  {addVendorMutation.isPending ? "Saving..." : "Save Vendor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog - Similar to Add with prefilled values */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="finance">Financial</TabsTrigger>
                  <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="accountGroupId"
                      render={({ field }) => {
                        // Resolve the display name for the account group
                        const selectedGroup = accountGroups.find((ag: any) => ag.id === field.value);
                        const displayValue = selectedGroup
                          ? `${selectedGroup.code} - ${selectedGroup.name}`
                          : (field.value ? `ID: ${field.value}` : 'No Account Group Selected');

                        return (
                          <FormItem>
                            <FormLabel>Account Group</FormLabel>
                            <FormControl>
                              <Input
                                value={displayValue}
                                readOnly
                                disabled
                                className="bg-gray-50 cursor-not-allowed"
                              />
                            </FormControl>
                            <FormDescription>
                              Account group cannot be changed (linked to vendor code)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Code</FormLabel>
                          <FormControl>
                            <Input placeholder="V10001" {...field} readOnly disabled className="bg-gray-50 cursor-not-allowed" />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for this vendor (cannot be changed)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Global Supply Co." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Type *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., supplier, contractor, service_provider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="onboarding">Onboarding</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="construction">Construction</SelectItem>
                              <SelectItem value="transportation">Transportation</SelectItem>
                              <SelectItem value="agriculture">Agriculture</SelectItem>
                              <SelectItem value="energy">Energy</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@supplier.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.supplier.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                </TabsContent>

                <TabsContent value="address" className="space-y-4 pt-4">
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Chicago" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="IL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter country code (e.g., US, IN, GB)" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter ISO country code (2-3 letters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal/ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="60601" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="north_america">North America</SelectItem>
                            <SelectItem value="south_america">South America</SelectItem>
                            <SelectItem value="europe">Europe</SelectItem>
                            <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                            <SelectItem value="middle_east">Middle East</SelectItem>
                            <SelectItem value="africa">Africa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCurrencies ? (
                                <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                              ) : (currencies && currencies.length > 0) ? (
                                currencies.map((currency: any) => (
                                  <SelectItem key={currency.id || currency.code} value={currency.code || currency.currencyCode || currency.currency_code}>
                                    {currency.code || currency.currencyCode || currency.currency_code} - {currency.name || currency.currencyName || currency.currency_name || ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No currencies available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingPaymentTerms ? (
                                <SelectItem value="loading" disabled>Loading payment terms...</SelectItem>
                              ) : paymentTerms.length > 0 ? (
                                paymentTerms.map((term: any) => (
                                  <SelectItem key={term.id} value={term.paymentTermCode || term.payment_term_key || term.code || term.key}>
                                    {term.description || term.paymentTermCode || term.payment_term_key || term.code || term.key}
                                    {term.dueDays !== undefined ? ` (${term.dueDays} days)` : ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No payment terms available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="reconciliationAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reconciliation Account</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              if (value === 'none') {
                                field.onChange(undefined);
                              } else {
                                field.onChange(value ? parseInt(value) : undefined);
                              }
                            }}
                            value={field.value?.toString() || 'none'}
                            disabled={isLoadingReconciliationAccounts}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingReconciliationAccounts ? "Loading..." : "Select Reconciliation Account"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {reconciliationAccounts.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.code} - {acc.name} ({acc.glAccountNumber || acc.glAccountNumber || ''})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            GL account for vendor reconciliation (AP accounts only)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Bank Transfer, Check, Credit Card" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter payment method name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="companyCodeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCompanyCodes ? (
                                <SelectItem value="loading" disabled>Loading company codes...</SelectItem>
                              ) : (companyCodes && companyCodes.length > 0) ? (
                                companyCodes.map((company: any) => (
                                  <SelectItem key={company.id} value={company.id.toString()}>
                                    {company.code} - {company.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No company codes available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </TabsContent>

                <TabsContent value="purchasing" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="purchaseOrganizationId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Purchase Organization</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value
                                    ? purchaseOrganizations.find((org: any) => org.id === field.value)?.code
                                      ? `${purchaseOrganizations.find((org: any) => org.id === field.value)?.code} - ${purchaseOrganizations.find((org: any) => org.id === field.value)?.name || ''}`
                                      : purchaseOrganizations.find((org: any) => org.id === field.value)?.name || 'Select organization'
                                    : "Select purchase organization"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search organization..." />
                                <CommandEmpty>No organization found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {isLoadingPurchaseOrganizations ? (
                                    <CommandItem disabled>Loading...</CommandItem>
                                  ) : (purchaseOrganizations && purchaseOrganizations.length > 0) ? (
                                    purchaseOrganizations.map((org: any) => (
                                      <CommandItem
                                        key={org.id}
                                        value={`${org.code} ${org.name}`.toLowerCase()}
                                        onSelect={() => {
                                          field.onChange(org.id);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${field.value === org.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                        {org.code ? `${org.code} - ${org.name || ''}` : (org.name || '')}
                                      </CommandItem>
                                    ))
                                  ) : (
                                    <CommandItem disabled>No organizations available</CommandItem>
                                  )}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="purchasingGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Group</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select purchase group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingPurchasingGroups ? (
                                <SelectItem value="loading" disabled>Loading purchase groups...</SelectItem>
                              ) : (purchasingGroups && purchasingGroups.length > 0) ? (
                                purchasingGroups.map((group: any) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.code ? `${group.code} - ${group.name || ''}` : (group.name || '')}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled>No purchase groups available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="minimumOrderValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Value</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} />
                          </FormControl>
                          <FormDescription>
                            Minimum value required for orders
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="leadTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Time (Days)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="14" {...field} />
                          </FormControl>
                          <FormDescription>
                            Average days from order to delivery
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="evaluationScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluation Score (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" placeholder="75" {...field} />
                        </FormControl>
                        <FormDescription>
                          Supplier performance rating
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="purchasingGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchasing Group</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purchasing group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingPurchasingGroups ? (
                              <SelectItem value="loading" disabled>Loading purchasing groups...</SelectItem>
                            ) : (purchasingGroups && purchasingGroups.length > 0) ? (
                              purchasingGroups.map((org: any) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.code ? `${org.code} - ${org.name || ''}` : (org.name || '')}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No purchasing groups available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="blacklisted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Blacklisted</FormLabel>
                            <FormDescription>
                              Prevent ordering from this vendor
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="blacklistReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blacklist Reason</FormLabel>
                          <FormControl>
                            <Input placeholder="Reason for blacklisting" disabled={!editForm.watch("blacklisted")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes about this vendor"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable for transactions and reporting
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateVendorMutation.isPending}>
                  {updateVendorMutation.isPending ? "Updating..." : "Update Vendor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the vendor "{deletingVendor?.name}" ({deletingVendor?.code}) and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVendor && deleteVendorMutation.mutate(deletingVendor.id)}
              disabled={deleteVendorMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteVendorMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vendor Details Dialog */}
      <Dialog open={isVendorDetailsOpen} onOpenChange={setIsVendorDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingVendorDetails && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVendorDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Vendor Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingVendorDetails.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingVendorDetails.name}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingVendorDetails.code}
                      </Badge>
                      <Badge
                        variant={viewingVendorDetails.isActive ? "default" : "secondary"}
                        className={viewingVendorDetails.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingVendorDetails.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {viewingVendorDetails.blacklisted && (
                        <Badge variant="default" className="bg-red-100 text-red-800 ml-2">
                          Blacklisted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(viewingVendorDetails)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsVendorDetailsOpen(false);
                        openDeleteDialog(viewingVendorDetails);
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
                          <dt className="text-sm font-medium text-gray-500">Type:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingVendorDetails.type?.replace("_", " ")}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Tax ID:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.taxId || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Industry:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingVendorDetails.industry?.replace("_", " ") || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingVendorDetails.status?.replace("_", " ")}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Address:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.address || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">City/State:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingVendorDetails.city ? viewingVendorDetails.city + (viewingVendorDetails.state ? `, ${viewingVendorDetails.state}` : "") : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Country:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.country || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.phone || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Email:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.email || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Website:</dt>
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.website || "—"}</dd>
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
                          <dd className="text-sm text-gray-900">{viewingVendorDetails.currency || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Payment Terms:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingVendorDetails.paymentTerms?.replace("_", " ") || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Payment Method:</dt>
                          <dd className="text-sm text-gray-900 capitalize">{viewingVendorDetails.paymentMethod?.replace("_", " ") || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Min. Order Value:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingVendorDetails.minimumOrderValue ?
                              `${viewingVendorDetails.currency || 'USD'} ${viewingVendorDetails.minimumOrderValue.toLocaleString()}` :
                              "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <TruckIcon className="h-4 w-4 mr-2" />
                        Purchasing Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Purchase Organization:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingVendorDetails.purchaseOrganizationId ? (
                              purchaseOrganizations.find((org: any) => org.id === viewingVendorDetails.purchaseOrganizationId)?.code
                                ? `${purchaseOrganizations.find((org: any) => org.id === viewingVendorDetails.purchaseOrganizationId)?.code} - ${purchaseOrganizations.find((org: any) => org.id === viewingVendorDetails.purchaseOrganizationId)?.name || ''}`
                                : purchaseOrganizations.find((org: any) => org.id === viewingVendorDetails.purchaseOrganizationId)?.name || '—'
                            ) : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Purchase Group:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingVendorDetails.purchasingGroupId ? (
                              purchasingGroups.find((group: any) => group.id === viewingVendorDetails.purchasingGroupId)?.code
                                ? `${purchasingGroups.find((group: any) => group.id === viewingVendorDetails.purchasingGroupId)?.code} - ${purchasingGroups.find((group: any) => group.id === viewingVendorDetails.purchasingGroupId)?.name || ''}`
                                : purchasingGroups.find((group: any) => group.id === viewingVendorDetails.purchasingGroupId)?.name || '—'
                            ) : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Lead Time:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingVendorDetails.leadTime ? `${viewingVendorDetails.leadTime} days` : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Evaluation Score:</dt>
                          <dd className="text-sm text-gray-900 flex items-center">
                            {viewingVendorDetails.evaluationScore ? (
                              <>
                                {viewingVendorDetails.evaluationScore}/100
                                <StarIcon className="h-3 w-3 ml-1 text-yellow-500" />
                              </>
                            ) : "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Contact Persons</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddContactDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                  </div>

                  {isLoadingContacts ? (
                    <div className="flex justify-center items-center h-20">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      <p className="ml-2 text-gray-500">Loading contacts...</p>
                    </div>
                  ) : contacts && Array.isArray(contacts) && contacts.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contacts.map((contact: VendorContact) => (
                            <TableRow key={contact.id}>
                              <TableCell className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </TableCell>
                              <TableCell>{contact.position || "—"}</TableCell>
                              <TableCell>{contact.email || "—"}</TableCell>
                              <TableCell>{contact.phone || contact.mobile || "—"}</TableCell>
                              <TableCell>
                                {contact.isPrimary && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-1">
                                    Primary
                                  </Badge>
                                )}
                                {contact.isOrderContact && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mr-1">
                                    Order
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 border rounded-md bg-gray-50">
                      <User className="h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-gray-500">No contacts added</p>
                      <p className="text-sm text-gray-400">Add contacts to manage specific points of communication</p>
                    </div>
                  )}
                </div>

                {viewingVendorDetails.notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Notes</h3>
                    <div className="p-4 bg-gray-50 rounded-md border">
                      <p className="text-gray-600">{viewingVendorDetails.notes}</p>
                    </div>
                  </div>
                )}

                {viewingVendorDetails.blacklisted && viewingVendorDetails.blacklistReason && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-red-700">Blacklist Information</h3>
                    <div className="p-4 bg-red-50 rounded-md border border-red-200">
                      <p className="text-red-700">{viewingVendorDetails.blacklistReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Contact Person</DialogTitle>
            <DialogDescription>
              Add a new contact for {viewingVendorDetails?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(handleAddContactSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position/Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Sales Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Sales" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.smith@supplier.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={contactForm.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 987-6543" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="isPrimary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Primary Contact</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="isOrderContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Order Contact</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="isQualityContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Quality Contact</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="isAccountsContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Accounts Contact</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={contactForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this contact"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddContactDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addContactMutation.isPending}>
                  {addContactMutation.isPending ? "Saving..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Vendor Table Component
function VendorTable({
  vendors,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails
}: {
  vendors: Vendor[];
  isLoading: boolean;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  onViewDetails: (vendor: Vendor) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading vendors...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vendors || vendors.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center">
              <Building className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-gray-500">No vendors found</p>
              <p className="text-sm text-gray-400">Add a vendor to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onViewDetails(vendor)}>
                <TableCell className="font-medium">{vendor.code || "—"}</TableCell>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">
                    {vendor.type?.replace(/_/g, " ") || "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {vendor.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="truncate max-w-[150px]">{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {!vendor.email && !vendor.phone && <span className="text-gray-400 text-sm">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {vendor.city && vendor.country
                    ? `${vendor.city}, ${vendor.country}`
                    : vendor.country
                      ? vendor.country
                      : vendor.city
                        ? vendor.city
                        : "—"}
                </TableCell>
                <TableCell>
                  {vendor.blacklisted ? (
                    <Badge variant="default" className="bg-red-100 text-red-800 hover:bg-red-100">
                      Blacklisted
                    </Badge>
                  ) : vendor.isActive ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(vendor);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(vendor);
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}