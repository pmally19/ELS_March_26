import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, ArrowLeft, RefreshCw, Users, Upload, Download, MoreHorizontal, Search, FileUp, PowerOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import CustomerMasterExcelImport from "@/components/master-data/CustomerMasterExcelImport";
import CustomerAddressManager from "@/components/customer/CustomerAddressManager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

interface Customer {
  id: number;
  customer_number: string; // maps from server field `code`
  customer_name: string; // maps from server field `name`
  type?: string;
  customer_type_id?: number;
  customer_type_name?: string;
  description?: string;
  tax_id?: string;
  industry?: string;
  segment?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  region?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  payment_terms?: string;
  payment_method?: string;
  credit_limit?: number;
  credit_limit_group_id?: number;
  credit_rating?: string;
  discount_group?: string;
  price_group?: string;
  incoterms?: string;
  shipping_method?: string;
  delivery_terms?: string;
  delivery_route?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | number;
  updated_by?: string | number;
  _tenantId?: string;
  _deletedAt?: string;

  // Multiple address management fields
  sold_to_addresses?: any[];
  bill_to_addresses?: any[];
  ship_to_addresses?: any[];
  payer_to_addresses?: any[];

  default_address_setup?: string;
  address_notes?: string;

  // === CRITICAL FINANCIAL FIELDS ===
  // Reconciliation Account
  reconciliation_account_code?: string;
  // Dunning and Payment Controls
  dunning_procedure?: string;
  dunning_block?: boolean;
  payment_block?: boolean;

  // Credit Management
  credit_control_area?: string;
  risk_category?: string;
  credit_limit_currency?: string;
  credit_exposure?: number;
  credit_check_procedure?: string;

  // Company Code
  company_code_id?: number;

  // Account Group - REQUIRED
  account_group_id?: number;

  // Tax and Compliance
  tax_profile_id?: number;
  tax_rule_id?: number;
  tax_classification_code?: string;
  tax_exemption_certificate?: string;
  withholding_tax_code?: string;

  // Banking Information
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_name?: string;
  electronic_payment_method?: string;

  // Financial Posting Controls
  deletion_flag?: boolean;
  authorization_group?: string;

  customer_pricing_procedure?: string;

  // Additional Standard Fields
  language_code?: string;
  sales_org_code?: string;
  distribution_channel_code?: string;
  division_code?: string;
  shipping_condition_key?: string;
  delivery_priority?: string;
  sales_district?: string;
  sales_office_code?: string;
  sales_group_code?: string;
  price_list?: string;
  customer_assignment_group_id?: number;
}

export default function CustomerMaster() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [activeTab, setActiveTab] = useState("customers");
  const [viewingCustomerDetails, setViewingCustomerDetails] = useState<Customer | null>(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  // Ref to prevent infinite update loops
  const isUpdatingAddresses = useRef(false);
  const [formData, setFormData] = useState({
    customer_number: "",
    customer_name: "",
    type: "",
    customer_type_id: undefined as number | undefined,
    description: "",
    language_code: "",
    tax_id: "",
    industry: "",
    segment: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    region: "",
    phone: "",
    alt_phone: "",
    email: "",
    website: "",
    currency: "",
    payment_terms: "",
    payment_method: "",
    credit_limit: 0,
    credit_limit_group_id: undefined as number | undefined,
    credit_rating: "",
    discount_group: "",
    price_group: "",
    incoterms: "",
    shipping_method: "",
    delivery_terms: "",
    delivery_route: "",
    shipping_condition_key: "",
    delivery_priority: "",
    sales_org_code: "",
    sales_org_name: "",
    distribution_channel_code: "",
    distribution_channel_name: "",
    division_code: "",
    division_name: "",
    sales_district: "",
    sales_office_code: "",
    sales_group_code: "",
    price_list: "",
    reconciliation_account_code: "",
    is_active: true,

    // === MULTIPLE ADDRESS MANAGEMENT FIELDS ===
    // Multiple address arrays for each type
    sold_to_addresses: [] as any[],
    bill_to_addresses: [] as any[],
    ship_to_addresses: [] as any[],
    payer_to_addresses: [] as any[],

    // Address configuration
    default_address_setup: "standard",
    address_notes: "",

    // === CRITICAL FINANCIAL FIELDS ===
    // Dunning and Payment Controls
    dunning_procedure: "",
    dunning_block: false,
    payment_block: false,

    // Credit Management
    credit_control_area: "",
    risk_category: "",
    credit_limit_currency: "",
    credit_exposure: undefined as number | undefined,
    credit_check_procedure: "",

    // Company Code
    company_code_id: undefined as number | undefined,

    // Account Group - REQUIRED
    account_group_id: undefined as number | undefined,

    // Tax and Compliance
    tax_profile_id: undefined as number | undefined,
    tax_rule_id: undefined as number | undefined,
    tax_classification_code: "",
    tax_exemption_certificate: "",
    withholding_tax_code: "",

    // Banking Information
    bank_account_number: "",
    bank_routing_number: "",
    bank_name: "",
    electronic_payment_method: "",

    // Financial Posting Controls
    deletion_flag: false,
    authorization_group: "",
    customer_pricing_procedure: "",
    customer_assignment_group_id: undefined as number | undefined
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();

  // Track auto-filled fields for UI indication
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Fetch tax profiles for dropdown
  const { data: taxProfiles = [] } = useQuery({
    queryKey: ["tax-profiles"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-profiles");
      return await response.json();
    },
  });

  // Fetch customer types for dropdown
  const { data: customerTypes = [], isLoading: customerTypesLoading } = useQuery({
    queryKey: ["/api/master-data/customer-types"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/customer-types");
        const data = await response.json();
        return Array.isArray(data) ? data.filter((ct: any) => ct.isActive !== false) : [];
      } catch (error) {
        console.error('Error fetching customer types:', error);
        return [];
      }
    },
  });

  // Fetch account groups for dropdown (filtered for CUSTOMER type only)
  const { data: accountGroups = [], isLoading: accountGroupsLoading } = useQuery({
    queryKey: ["/api/master-data/account-groups", "CUSTOMER"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/account-groups");
        const data = await response.json();
        // Filter for CUSTOMER type account groups only and active ones
        return Array.isArray(data) ? data.filter((ag: any) =>
          ag.accountType === 'CUSTOMER' && ag.isActive !== false
        ) : [];
      } catch (error) {
        console.error('Error fetching account groups:', error);
        return [];
      }
    },
  });

  // Get selected account group details for number range validation
  const selectedAccountGroup = accountGroups.find((ag: any) => ag.id === formData.account_group_id);

  // Generate customer code when account group is selected
  useEffect(() => {
    const generateCustomerCode = async () => {
      if (formData.account_group_id && !editingCustomer) {
        try {
          const response = await fetch(`/api/master-data/customer/generate-code?accountGroupId=${formData.account_group_id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.code) {
              setFormData(prev => ({ ...prev, customer_number: data.code }));
            }
          } else {
            // If generation fails, clear the code
            setFormData(prev => ({ ...prev, customer_number: '' }));
          }
        } catch (error) {
          console.error('Error generating customer code:', error);
          setFormData(prev => ({ ...prev, customer_number: '' }));
        }
      }
    };

    generateCustomerCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.account_group_id]);

  // Validate customer number against account group number range
  const validateCustomerNumberRange = (customerNumber: string, accountGroup: any): { valid: boolean; message?: string } => {
    if (!accountGroup) {
      return { valid: true }; // No account group selected, skip validation
    }

    // Check multiple possible field names from API response
    const numberRangeFrom = accountGroup.numberRangeFrom || accountGroup.numberRange || accountGroup.number_range_from || accountGroup.number_range;
    const numberRangeTo = accountGroup.numberRangeTo || accountGroup.number_range_to;

    // If no number range is set for the account group, allow any number
    if (!numberRangeFrom || !numberRangeTo) {
      return { valid: true };
    }

    // Convert customer number to numeric for comparison
    const customerNum = parseInt(customerNumber);
    const rangeFrom = parseInt(numberRangeFrom);
    const rangeTo = parseInt(numberRangeTo);

    // Check if customer number is numeric
    if (isNaN(customerNum)) {
      return {
        valid: false,
        message: `Customer number must be numeric. Allowed range: ${numberRangeFrom} - ${numberRangeTo}`
      };
    }

    // Check if customer number is within range
    if (customerNum < rangeFrom || customerNum > rangeTo) {
      return {
        valid: false,
        message: `Customer number must be between ${numberRangeFrom} and ${numberRangeTo} for account group "${accountGroup.name || accountGroup.code}"`
      };
    }

    return { valid: true };
  };

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/master-data/customer", showInactive],
    queryFn: () => {
      const url = showInactive
        ? "/api/master-data/customer?includeInactive=true"
        : "/api/master-data/customer";
      return apiRequest(url).then(res => res.json()).then((rows) => {
        // Normalize server payload to DB-style field names used by this UI
        // Server sends: { id, code, name, country, city, paymentTerms, currency, isActive, created_at, updated_at, ... }
        return rows.map((r: any) => ({
          // Basic customer information
          id: r.id,
          customer_number: r.code ?? r.customer_number ?? "",
          customer_name: r.name ?? r.customer_name ?? "",
          type: r.type ?? undefined,
          customer_type_id: r.customer_type_id ?? undefined,
          customer_type_name: r.customer_type_name ?? undefined,
          description: r.description ?? undefined,
          tax_id: r.taxId ?? r.tax_id ?? undefined,
          industry: r.industry ?? undefined,
          segment: r.segment ?? undefined,
          address: r.address ?? undefined,
          city: r.city ?? undefined,
          state: r.state ?? undefined,
          country: r.country ?? undefined,
          postal_code: r.postalCode ?? r.postal_code ?? undefined,
          region: r.region ?? undefined,
          phone: r.phone ?? undefined,
          alt_phone: r.alt_phone ?? undefined,
          email: r.email ?? undefined,
          website: r.website ?? undefined,
          currency: r.currency ?? undefined,
          payment_terms: r.paymentTerms ?? r.payment_terms ?? undefined,
          payment_method: r.payment_method ?? undefined,
          credit_limit: r.creditLimit ?? r.credit_limit ?? undefined,
          credit_limit_group_id: r.credit_limit_group ?? undefined,
          account_group_id: r.account_group_id ?? undefined,
          credit_rating: r.credit_rating ?? undefined,
          discount_group: r.discount_group ?? undefined,
          price_group: r.price_group ?? undefined,
          incoterms: r.incoterms ?? undefined,
          shipping_method: r.shipping_method ?? undefined,
          delivery_terms: r.delivery_terms ?? undefined,
          delivery_route: r.delivery_route ?? undefined,
          is_active: r.isActive !== undefined ? r.isActive : (r.is_active !== undefined ? r.is_active : true),
          created_at: r.created_at,
          updated_at: r.updated_at,

          // Sales and relationship information
          sales_rep_id: r.sales_rep_id ?? undefined,
          parent_customer_id: r.parent_customer_id ?? undefined,

          // Business type flags
          is_b2b: r.is_b2b ?? undefined,
          is_b2c: r.is_b2c ?? undefined,
          is_vip: r.is_vip ?? undefined,
          tags: r.tags ?? undefined,

          // Company and versioning
          company_code_id: r.companyCodeId ?? r.company_code_id ?? undefined,
          version: r.version ?? undefined,
          created_by: r.createdBy ?? r.created_by ?? undefined,
          updated_by: r.updatedBy ?? r.updated_by ?? undefined,
          _tenantId: r._tenantId ?? undefined,
          _deletedAt: r._deletedAt ?? undefined,

          // === CRITICAL FINANCIAL FIELDS ===
          // Dunning and Payment Controls
          dunning_procedure: r.dunning_procedure ?? undefined,
          dunning_block: r.dunning_block ?? undefined,
          payment_block: r.payment_block ?? undefined,

          // Credit Management
          credit_control_area: r.credit_control_area ?? undefined,
          risk_category: r.risk_category ?? undefined,
          credit_limit_currency: r.credit_limit_currency ?? undefined,
          credit_exposure: r.credit_exposure ?? undefined,
          credit_check_procedure: r.credit_check_procedure ?? undefined,

          // Tax and Compliance
          tax_profile_id: r.tax_profile_id ?? undefined,
          tax_rule_id: r.tax_rule_id ?? undefined,
          tax_classification_code: r.tax_classification_code ?? undefined,
          tax_exemption_certificate: r.tax_exemption_certificate ?? undefined,
          withholding_tax_code: r.withholding_tax_code ?? undefined,

          // Reconciliation Account
          reconciliation_account_code: r.reconciliation_account_code ?? undefined,

          // Banking Information
          bank_account_number: r.bank_account_number ?? undefined,
          bank_routing_number: r.bank_routing_number ?? undefined,
          bank_name: r.bank_name ?? undefined,
          electronic_payment_method: r.electronic_payment_method ?? undefined,

          // Financial Posting Controls
          deletion_flag: r.deletion_flag ?? undefined,
          authorization_group: r.authorization_group ?? undefined,
          customer_pricing_procedure: r.customer_pricing_procedure ?? r.customerPricingProcedure,

          // Address management fields (populated from API)
          sold_to_addresses: r.sold_to_addresses ?? [],
          bill_to_addresses: r.bill_to_addresses ?? [],
          ship_to_addresses: r.ship_to_addresses ?? [],
          payer_to_addresses: r.payer_to_addresses ?? [],
          default_address_setup: r.default_address_setup,

          // Additional Standard Fields
          language_code: r.language_code,
          sales_org_code: r.sales_org_code,
          distribution_channel_code: r.distribution_channel_code,
          division_code: r.division_code,
          shipping_condition_key: r.shipping_condition_key || r.shipping_conditions,
          delivery_priority: r.delivery_priority,
          sales_district: r.sales_district,
          sales_office_code: r.sales_office_code,
          sales_group_code: r.sales_group_code,
          price_list: r.price_list,
          address_notes: r.address_notes ?? "",
          customer_assignment_group_id: r.customer_assignment_group_id ?? undefined
        }));
      });
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });


  // Fetch sales areas for dropdown
  const { data: salesAreas = [] } = useQuery({
    queryKey: ['/api/master-data/sales-areas'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/sales-areas?active_only=true');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((sa: any) => sa.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch payment terms for dropdown selection
  const { data: paymentTerms = [], isLoading: paymentTermsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/payment-terms'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/payment-terms');
        const data = await response.json();
        // Normalize payment terms data - handle different response formats
        if (Array.isArray(data)) {
          return data.map((term: any) => ({
            id: term.id,
            code: term.code || term.paymentTermCode || term.payment_term_key || term.paymentTermCode || term.id?.toString(),
            name: term.name || term.description || "",
            description: term.description || term.name || ""
          }));
        } else if (data.records && Array.isArray(data.records)) {
          return data.records.map((term: any) => ({
            id: term.id,
            code: term.code || term.paymentTermCode || term.payment_term_key || term.paymentTermCode || term.id?.toString(),
            name: term.name || term.description || "",
            description: term.description || term.name || ""
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    retry: 1
  });

  // Fetch company codes for dropdown selection
  // Fetch reconciliation accounts (filtered for AR - Accounts Receivable)
  const { data: reconciliationAccounts = [], isLoading: reconciliationAccountsLoading } = useQuery<any[]>({
    queryKey: ["reconciliation-accounts"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/reconciliation-accounts");
      const data = await response.json();
      // Filter for AR (Accounts Receivable) type accounts and active ones
      return Array.isArray(data) ? data.filter((acc: any) =>
        acc.accountType === "AR" && acc.isActive !== false
      ) : [];
    },
  });

  const { data: companyCodes = [], isLoading: companyCodesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/company-code'],
    queryFn: () => apiRequest('/api/master-data/company-code').then(res => res.json()),
    retry: 1
  });

  // Fetch discount groups for dropdown selection
  const { data: discountGroups = [], isLoading: discountGroupsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/discount-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/discount-groups');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((dg: any) => dg.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch credit limit groups for auto-fill matching
  const { data: creditLimitGroups = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/credit-limit-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/credit-limit-groups');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((clg: any) => clg.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch customer pricing procedures
  const { data: customerPricingProcedures = [] } = useQuery({
    queryKey: ['/api/master-data/customer-pricing-procedures'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/customer-pricing-procedures');
        const data = await response.json();
        // Map procedure_code to code and procedure_name to name for consistency
        return Array.isArray(data) ? data
          .filter((cpp: any) => cpp.is_active !== false)
          .map((cpp: any) => ({
            ...cpp,
            code: cpp.procedure_code,
            name: cpp.procedure_name,
            description: cpp.description || cpp.procedure_name
          })) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch customer assignment groups for dropdown
  const { data: customerAssignmentGroups = [], isLoading: assignmentGroupsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/customer-account-assignment-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/customer-account-assignment-groups');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cag: any) => cag.is_active !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch countries for dropdown selection
  const { data: countries = [], isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          region: c.region || undefined, // Include region from country data
          regionId: c.regionId || c.region_id || undefined,
          currencyCode: c.currencyCode || c.currency_code || undefined, // Include currency code
          languageCode: c.languageCode || c.language_code || undefined, // Include language code
          isActive: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true),
        })).filter((c: any) => c.isActive) : [];
      } catch {
        return [];
      }
    },
  });

  // State to track selected country ID for cascading states
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>(undefined);

  // Fetch states by country ID (cascading dropdown)
  const { data: states = [], isLoading: statesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/states/country', selectedCountryId],
    queryFn: async () => {
      if (!selectedCountryId) return [];
      try {
        const response = await apiRequest(`/api/master-data/states/country/${selectedCountryId}`);
        const data = await response.json();
        return Array.isArray(data) ? data.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          countryId: s.countryId,
          isActive: s.isActive !== undefined ? s.isActive : (s.is_active !== undefined ? s.is_active : true),
        })).filter((s: any) => s.isActive) : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedCountryId, // Only fetch when country is selected
  });

  // Use only API data - no hardcoded fallback
  // Fetch incoterms for dropdown selection
  const { data: incoterms = [], isLoading: incotermsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/incoterms'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/incoterms');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((inc: any) => inc.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch shipping condition keys for dropdown selection
  const { data: shippingConditionKeys = [], isLoading: shippingConditionKeysLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/shipping-condition-keys'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/shipping-condition-keys');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((sck: any) => sck.isActive !== false && sck.is_active !== false) : [];
      } catch {
        return [];
      }
    },
  });

  // State for Sales Area ID to drive Sales Office query
  const [selectedSalesAreaId, setSelectedSalesAreaId] = useState<number | null>(null);

  // Fetch Assigned Sales Offices based on Selected Sales Area
  const { data: availableSalesOffices = [] } = useQuery<any[]>({
    queryKey: ['/api/sales-distribution/sales-office-assignments', selectedSalesAreaId],
    queryFn: async () => {
      if (!selectedSalesAreaId) return [];
      try {
        const response = await apiRequest(`/api/sales-distribution/sales-office-assignments/${selectedSalesAreaId}`);
        const data = await response.json();
        // The API returns assignments with salesOfficeCode, salesOfficeName, etc.
        // We need to map it to a format suitable for the Select
        return data.map((assignment: any) => ({
          code: assignment.salesOfficeCode,
          name: assignment.salesOfficeName,
          description: assignment.salesOfficeDescription
        }));
      } catch (error) {
        console.error("Error fetching assigned sales offices:", error);
        return [];
      }
    },
    enabled: !!selectedSalesAreaId
  });

  // Effect to set selectedSalesAreaId when editing a customer
  useEffect(() => {
    if (editingCustomer && salesAreas.length > 0) {
      const matchingSalesArea = salesAreas.find((sa: any) =>
        sa.salesOrgCode === editingCustomer.sales_org_code &&
        sa.distributionChannelCode === editingCustomer.distribution_channel_code &&
        sa.divisionCode === editingCustomer.division_code
      );
      if (matchingSalesArea) {
        setSelectedSalesAreaId(matchingSalesArea.id);
      }
    }
  }, [editingCustomer, salesAreas]);

  const paymentTermsData = paymentTerms || [];
  const companyCodesData = companyCodes || [];
  const discountGroupsData = discountGroups || [];
  const incotermsData = incoterms || [];
  const shippingConditionKeysData = shippingConditionKeys || [];

  // Sync selectedCountryId when editing customer and countries are loaded
  useEffect(() => {
    if (editingCustomer && editingCustomer.country && countries.length > 0) {
      const foundCountry = countries.find((c: any) => c.code === editingCustomer.country);
      if (foundCountry && foundCountry.id !== selectedCountryId) {
        setSelectedCountryId(foundCountry.id);
      }
    } else if (!editingCustomer && selectedCountryId !== undefined) {
      // Reset when not editing
      setSelectedCountryId(undefined);
    }
  }, [editingCustomer, countries, selectedCountryId]);


  // Removed debug logging and useEffect that were causing infinite loops

  // Helper function to save all addresses for a customer
  // Each address will get a unique auto-generated address_number from the database
  // IMPORTANT: This function now properly handles deletions - removes addresses that user deleted from UI
  const saveCustomerAddresses = async (customerId: number, addresses: {
    sold_to_addresses?: any[];
    bill_to_addresses?: any[];
    ship_to_addresses?: any[];
    payer_to_addresses?: any[];
  }) => {
    const addressTypes: Array<'sold_to' | 'bill_to' | 'ship_to' | 'payer_to'> = ['sold_to', 'bill_to', 'ship_to', 'payer_to'];
    const errors: string[] = [];

    // STEP 1: Fetch existing addresses from database to determine what to delete
    let existingAddresses: Record<string, any[]> = {
      sold_to_addresses: [],
      bill_to_addresses: [],
      ship_to_addresses: [],
      payer_to_addresses: []
    };

    try {
      console.log('🚀 FETCHING addresses for customer:', customerId);
      const response = await apiRequest(`/api/customers/${customerId}/addresses`);
      console.log('📡 Response status:', response.status, response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📦 Raw response data:', responseData);
        console.log('📦 Response type:', typeof responseData);
        console.log('📦 Is Array?:', Array.isArray(responseData));
        console.log('📦 Has .data?:', responseData.hasOwnProperty('data'));
        console.log('📦 Has .success?:', responseData.hasOwnProperty('success'));

        // Backend should return { success: true, data: [...] }
        let allAddresses;
        if (responseData.data) {
          allAddresses = responseData.data;
          console.log('✅ Extracted from responseData.data');
        } else if (Array.isArray(responseData)) {
          allAddresses = responseData;
          console.log('✅ Using responseData directly (is array)');
        } else {
          console.error('❌ Response format unexpected!');
          allAddresses = [];
        }

        console.log('🔍 Addresses array:', allAddresses);
        console.log('🔍 Addresses count:', allAddresses?.length || 0);
        console.log('🔍 Addresses type:', typeof allAddresses, Array.isArray(allAddresses));

        if (!Array.isArray(allAddresses)) {
          console.error('❌ allAddresses is not an array!', allAddresses);
          allAddresses = [];
        }

        // Group addresses by type
        for (const addr of allAddresses) {
          console.log('  📍 Processing address:', addr.id, addr.address_type, addr.address_name);
          const type = `${addr.address_type}_addresses`;
          if (!existingAddresses[type]) existingAddresses[type] = [];
          existingAddresses[type].push(addr);
        }

        console.log('📊 Grouped by type:', Object.fromEntries(
          Object.entries(existingAddresses).map(([k, v]) => [k, `${v.length} addresses`])
        ));
      } else {
        console.warn('⚠️ Failed to fetch existing addresses, status:', response.status);
      }
    } catch (error) {
      console.error('❌ FATAL ERROR fetching addresses:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }

    // STEP 2: Delete addresses that exist in DB but not in UI (user removed them)
    console.log('\n🗑️ DELETION PHASE - Comparing DB addresses with UI addresses');
    for (const addressType of addressTypes) {
      const newAddresses = addresses[`${addressType}_addresses`] || [];
      const oldAddresses = existingAddresses[`${addressType}_addresses`] || [];

      console.log(`\n📍 ${addressType}:`);
      console.log(`  - DB has ${oldAddresses.length} addresses`);
      console.log(`  - UI has ${newAddresses.length} addresses`);

      // Find addresses to delete (exist in DB but not in new data)
      const newAddressIds = new Set(
        newAddresses
          .map(addr => addr.id)
          .filter(id => id !== undefined && id !== null)
          .map(id => Number(id)) // Convert to number for consistent comparison
      );

      console.log(`  - UI address IDs:`, Array.from(newAddressIds));
      console.log(`  - DB address IDs:`, oldAddresses.map(a => a.id));

      for (const oldAddr of oldAddresses) {
        const oldAddrIdNum = Number(oldAddr.id);
        const hasInUI = newAddressIds.has(oldAddrIdNum);
        console.log(`  - DB address ${oldAddr.id} (type: ${oldAddr.address_type}) exists in UI? ${hasInUI}`);

        if (!hasInUI && oldAddr.id) {
          // This address was removed by user - delete it
          console.log(`  ❌ DELETING address ${oldAddr.id} (not in UI)`);
          try {
            const deleteResponse = await apiRequest(`/api/customers/${customerId}/addresses/${oldAddr.id}`, {
              method: 'DELETE'
            });
            if (!deleteResponse.ok) {
              console.warn(`  ⚠️ Failed to delete address ${oldAddr.id}`);
            } else {
              console.log(`  ✅ Successfully deleted address ${oldAddr.id}`);
            }
          } catch (error) {
            console.warn(`  ❌ Error deleting address ${oldAddr.id}:`, error);
          }
        }
      }
    }

    // STEP 3: Create or update addresses from the UI
    for (const addressType of addressTypes) {
      const addressesOfType = addresses[`${addressType}_addresses`] || [];

      for (const address of addressesOfType) {
        // Validate required fields before saving
        if (!address.address_name || address.address_name.trim() === '') {
          errors.push(`${addressType} address: Address name is required`);
          continue;
        }
        if (!address.address_line_1 || address.address_line_1.trim() === '') {
          errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": Address line 1 is required`);
          continue;
        }
        if (!address.city || address.city.trim() === '') {
          errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": City is required`);
          continue;
        }
        if (!address.country || address.country.trim() === '') {
          errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": Country is required`);
          continue;
        }

        // Strip address_number - it will be auto-generated by the database
        const { address_number, id: tempId, ...addressData } = address;

        // Check if this is an existing address (has a numeric ID) or a new one (temporary string ID)
        // Existing addresses from API will have numeric IDs (number) or string representation of numbers
        // New addresses created in UI will have string IDs like "sold_to_1234567890_abc123"
        const isExistingAddress = (
          (typeof tempId === 'number') ||
          (typeof tempId === 'string' && /^\d+$/.test(tempId))
        );
        const addressId = isExistingAddress ? String(tempId) : undefined;

        try {
          if (addressId) {
            // Update existing address
            const response = await apiRequest(`/api/customers/${customerId}/addresses/${addressId}`, {
              method: 'PUT',
              body: JSON.stringify({
                ...addressData,
                address_type: addressType
              })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.message || 'Unknown error';
              errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": ${errorMessage}`);
            }
          } else {
            // Create new address - address_number will be auto-generated by database trigger
            const response = await apiRequest(`/api/customers/${customerId}/addresses`, {
              method: 'POST',
              body: JSON.stringify({
                ...addressData,
                address_type: addressType
              })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.message || 'Unknown error';
              errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": ${errorMessage}`);
            }
          }
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error';
          errors.push(`${addressType} address "${address.address_name || 'Unnamed'}": ${errorMessage}`);
        }
      }
    }

    // Return errors if any occurred
    if (errors.length > 0) {
      throw new Error(`Address validation errors:\n${errors.join('\n')}`);
    }

    // STEP 4: Sync relationships in the backend
    try {
      console.log('🔄 Syncing address relationships for customer', customerId);
      await apiRequest(`/api/customers/${customerId}/relationships/sync`, {
        method: 'POST'
      });
      console.log('✅ Synchronized address relationships successfully');
    } catch (error) {
      console.error('⚠️ Failed to sync address relationships:', error);
    }
  };

  // Helper function to normalize address data for comparison (handles null/undefined and temporary numbers)
  // This ensures address_number changes don't trigger unnecessary updates
  const normalizeAddressForComparison = (addr: any) => {
    if (!addr) return null;
    const normalized: any = { ...addr };
    // Normalize null/undefined/temporary address_number - treat all as "no address_number" for comparison
    // This prevents false positives when:
    // 1. address_number is populated after save (null -> "ADDR-000001")
    // 2. Temporary preview numbers are used (ADDR-TEMP-000001)
    if (
      normalized.address_number === undefined ||
      normalized.address_number === null ||
      normalized.address_number === '' ||
      (typeof normalized.address_number === 'string' && normalized.address_number.startsWith('ADDR-TEMP-'))
    ) {
      delete normalized.address_number; // Remove it entirely for comparison
    }
    // Create a stable object for comparison by sorting keys
    const sortedKeys = Object.keys(normalized).sort();
    const stableObj: any = {};
    for (const key of sortedKeys) {
      stableObj[key] = normalized[key];
    }
    return stableObj;
  };

  // Helper to check if addresses are semantically the same (ignoring address_number population)
  const areAddressesEqual = (addr1: any, addr2: any): boolean => {
    const normalized1 = normalizeAddressForComparison(addr1);
    const normalized2 = normalizeAddressForComparison(addr2);
    return JSON.stringify(normalized1) === JSON.stringify(normalized2);
  };

  // Memoize the onUpdate callback to prevent unnecessary re-renders and infinite loops
  const handleAddressUpdate = useCallback((updates: Partial<typeof formData>) => {
    // Prevent infinite loops - if we're already updating, skip
    if (isUpdatingAddresses.current) {
      return;
    }

    // Quick check: if updates object is empty, skip
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    // Set flag BEFORE updating to prevent recursive calls
    isUpdatingAddresses.current = true;

    // Reset flag after a short delay to allow state update to complete
    setTimeout(() => {
      isUpdatingAddresses.current = false;
    }, 10);

    setFormData(prev => {
      // Create new state object - always accept address updates (they come from user typing)
      const newState = { ...prev };

      for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
          const updateValue = updates[key as keyof typeof updates];
          const prevValue = prev[key as keyof typeof prev];

          // For arrays (address arrays), only skip if it's the EXACT same reference
          // This allows typing updates to go through while preventing unnecessary re-renders
          if (Array.isArray(prevValue) && Array.isArray(updateValue)) {
            // If same reference, no change needed (skip update)
            if (prevValue === updateValue) {
              continue;
            }
            // Otherwise, accept the update (user is typing, so always update)
          }

          // Update the field
          (newState as any)[key] = updateValue;
        }
      }
      return newState;
    });
  }, []);

  // Fetch tax classifications
  const { data: taxClassifications = [] } = useQuery({
    queryKey: ['tax-classifications'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/tax-classifications');
      if (!res.ok) throw new Error('Failed to fetch tax classifications');
      return res.json();
    }
  });

  // Filter customers based on search term and active status
  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.customer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.industry && customer.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.segment && customer.segment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()));

    // Active/Inactive filter logic:
    // - If showInactive is true: show ALL customers (active and inactive)
    // - If showInactive is false: show ONLY active customers (is_active === true)
    // Handle null/undefined as inactive
    const isCustomerActive = customer.is_active === true;
    const matchesActiveFilter = showInactive ? true : isCustomerActive;

    return matchesSearch && matchesActiveFilter;
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/master-data/customer", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create customer" }));
        throw new Error(errorData.message || errorData.error || "Failed to create customer");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Customer created successfully:", data);

      // Get the customer ID from the response
      const customerId = data?.id || data?.customer_id;

      if (customerId) {
        // Save all addresses - each will get a unique auto-generated address_number
        try {
          await saveCustomerAddresses(customerId, {
            sold_to_addresses: formData.sold_to_addresses,
            bill_to_addresses: formData.bill_to_addresses,
            ship_to_addresses: formData.ship_to_addresses,
            payer_to_addresses: formData.payer_to_addresses
          });
        } catch (error: any) {
          console.error("Error saving addresses:", error);
          toast({
            title: "Address Validation Error",
            description: error.message || "Customer created but some addresses may not have been saved. Please check required address fields.",
            variant: "destructive"
          });
        }
      }

      // Reset form and close dialog first to prevent state conflicts
      resetForm(false);
      setIsDialogOpen(false);

      // Delay query invalidation to ensure dialog and form states have settled
      // Use a longer delay to prevent state conflicts with address updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer"] });
      }, 500);

      toast({ title: "Success", description: "Customer created successfully" });
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create customer. Please check all required fields.",
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Customer>) => {
      console.log('🔍 UPDATE MUTATION - Customer ID:', id);
      console.log('🔍 UPDATE MUTATION - Data to send:', data);
      console.log('🔍 UPDATE MUTATION - Data keys:', Object.keys(data));
      console.log('🔍 UPDATE MUTATION - Sample fields:', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        country: data.country
      });

      const response = await apiRequest(`/api/master-data/customer/${id}`, {
        method: "PATCH",
        body: data
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update customer" }));
        throw new Error(errorData.message || errorData.error || "Failed to update customer");
      }
      return response.json();
    },
    onSuccess: async () => {
      if (editingCustomer?.id) {
        // Save all addresses - each will get a unique auto-generated address_number
        try {
          await saveCustomerAddresses(editingCustomer.id, {
            sold_to_addresses: formData.sold_to_addresses,
            bill_to_addresses: formData.bill_to_addresses,
            ship_to_addresses: formData.ship_to_addresses,
            payer_to_addresses: formData.payer_to_addresses
          });
        } catch (error: any) {
          console.error("Error saving addresses:", error);
          toast({
            title: "Address Validation Error",
            description: error.message || "Customer updated but some addresses may not have been saved. Please check required address fields.",
            variant: "destructive"
          });
        }
      }

      // Reset form and close dialog first to prevent state conflicts
      resetForm(false);
      setIsDialogOpen(false);

      // Delay query invalidation to ensure dialog and form states have settled
      // Use a longer delay to prevent state conflicts with address updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer"] });
      }, 500);

      toast({ title: "Success", description: "Customer updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer. Please check all required fields.",
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/ api / master - data / customer / ${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer"] });
      toast({ title: "Success", description: "Customer deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiRequest(`/ api / master - data / customer / ${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !is_active })
      }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer"] });
      toast({
        title: "Status Updated",
        description: `Customer ${data.is_active ? 'activated' : 'deactivated'} successfully`
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = (closeDialog: boolean = true) => {
    setSelectedCountryId(undefined);
    setFormData({
      customer_number: "",
      customer_name: "",
      type: "",
      customer_type_id: undefined,
      description: "",
      tax_id: "",
      industry: "",
      segment: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      region: "",
      phone: "",
      alt_phone: "",
      email: "",
      website: "",
      currency: "",
      payment_terms: "",
      payment_method: "",
      credit_limit: undefined,
      credit_limit_group_id: undefined,
      credit_rating: "",
      discount_group: "",
      price_group: "",
      incoterms: "",
      shipping_method: "",
      shipping_condition_key: "",
      delivery_terms: "",
      delivery_route: "",
      delivery_priority: "",
      sales_org_code: "",
      sales_org_name: "",
      distribution_channel_code: "",
      distribution_channel_name: "",
      division_code: "",
      division_name: "",
      sales_district: "",
      sales_office_code: "",
      sales_group_code: "",
      price_list: "",
      reconciliation_account_code: "",
      is_active: true,

      // === MULTIPLE ADDRESS MANAGEMENT FIELDS ===
      // Multiple address arrays for each type
      sold_to_addresses: [],
      bill_to_addresses: [],
      ship_to_addresses: [],
      payer_to_addresses: [],

      // Address configuration
      default_address_setup: "",
      address_notes: "",

      // === CRITICAL FINANCIAL FIELDS ===
      // Dunning and Payment Controls
      dunning_procedure: "",
      dunning_block: undefined,
      payment_block: undefined,

      // Credit Management
      credit_control_area: "",
      risk_category: "",
      credit_limit_currency: "",
      credit_exposure: undefined,
      credit_check_procedure: "",

      // Company Code
      company_code_id: undefined,

      // Account Group - REQUIRED 
      account_group_id: undefined,

      // Tax and Compliance
      tax_profile_id: undefined,
      tax_rule_id: undefined,
      tax_classification_code: "",
      tax_exemption_certificate: "",
      withholding_tax_code: "",

      // Banking Information
      bank_account_number: "",
      bank_routing_number: "",
      bank_name: "",
      electronic_payment_method: "",

      // Financial Posting Controls
      deletion_flag: undefined,
      authorization_group: "",

      // Additional Standard Fields
      language_code: "",
      customer_pricing_procedure: "",
      customer_assignment_group_id: undefined
    });
    setEditingCustomer(null);
    if (closeDialog) {
      setIsDialogOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customer_number || !formData.customer_name) {
      toast({
        title: "Validation Error",
        description: "Customer Number and Customer Name are required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.company_code_id) {
      toast({
        title: "Validation Error",
        description: "Company Code is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.reconciliation_account_code) {
      toast({
        title: "Validation Error",
        description: "Reconciliation Account Code is required",
        variant: "destructive"
      });
      return;
    }

    // Validate Account Group - REQUIRED
    if (!formData.account_group_id) {
      toast({
        title: "Validation Error",
        description: "Account Group is required ()",
        variant: "destructive"
      });
      return;
    }

    // Customer number is auto-generated, so no need to validate range manually

    // Transform form data to match server expectations (using snake_case field names)
    const apiData = {
      code: formData.customer_number,
      name: formData.customer_name,
      type: formData.type || null,
      customer_type_id: formData.customer_type_id || null,
      description: formData.description || null,
      industry: formData.industry || null,
      segment: formData.segment || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      postal_code: formData.postal_code || null, // Fixed: was postalCode
      region: formData.region || null,
      email: formData.email || null,
      phone: formData.phone || null,
      alt_phone: formData.alt_phone || null,
      website: formData.website || null,
      tax_id: formData.tax_id || null, // Fixed: was taxId
      status: formData.status || 'Active',
      notes: formData.description || null,
      is_active: formData.is_active, // Fixed: was isActive
      payment_terms: formData.payment_terms || null, // Fixed: was paymentTerms
      payment_method: formData.payment_method || null,
      credit_limit: formData.credit_limit || null, // Fixed: was creditLimit
      credit_limit_group_id: formData.credit_limit_group_id || null, // Fixed: was creditLimitGroupId
      credit_rating: formData.credit_rating || null,
      currency: formData.currency || null,
      discount_group: formData.discount_group || null,
      price_group: formData.price_group || null,
      incoterms: formData.incoterms || null,
      shipping_method: formData.shipping_method || null,
      delivery_terms: formData.delivery_terms || null,
      delivery_route: formData.delivery_route || null,
      company_code_id: formData.company_code_id || null, // Fixed: was companyCodeId
      account_group_id: formData.account_group_id || null, // Account Group - REQUIRED
      tax_profile_id: formData.tax_profile_id || null,
      tax_rule_id: formData.tax_rule_id || null,
      reconciliation_account_code: formData.reconciliation_account_code || null,
      // Additional Standard Fields
      language_code: formData.language_code || null,
      sales_org_code: formData.sales_org_code || null,
      distribution_channel_code: formData.distribution_channel_code || null,
      division_code: formData.division_code || null,
      shipping_condition_key: formData.shipping_condition_key || null,
      delivery_priority: formData.delivery_priority || null,
      sales_district: formData.sales_district || null,
      sales_office_code: formData.sales_office_code || null,
      sales_group_code: formData.sales_group_code || null,
      price_list: formData.price_list || null,
      // Financial fields
      dunning_procedure: formData.dunning_procedure || null,
      dunning_block: formData.dunning_block || false,
      payment_block: formData.payment_block || false,
      credit_control_area: formData.credit_control_area || null,
      risk_category: formData.risk_category || null,
      credit_limit_currency: formData.credit_limit_currency || null,
      credit_exposure: formData.credit_exposure || null,
      credit_check_procedure: formData.credit_check_procedure || null,
      tax_classification_code: formData.tax_classification_code || null,
      tax_exemption_certificate: formData.tax_exemption_certificate || null,
      withholding_tax_code: formData.withholding_tax_code || null,
      bank_account_number: formData.bank_account_number || null,
      bank_routing_number: formData.bank_routing_number || null,
      bank_name: formData.bank_name || null,
      electronic_payment_method: formData.electronic_payment_method || null,
      deletion_flag: formData.deletion_flag || false,
      authorization_group: formData.authorization_group || null,
      customer_pricing_procedure: formData.customer_pricing_procedure || null,
      customer_assignment_group_id: formData.customer_assignment_group_id || null,
      // Address Management - include all address arrays
      sold_to_addresses: formData.sold_to_addresses || [],
      bill_to_addresses: formData.bill_to_addresses || [],
      ship_to_addresses: formData.ship_to_addresses || [],
      payer_to_addresses: formData.payer_to_addresses || [],
    } as any;

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, ...apiData });
    } else {
      createMutation.mutate(apiData);
    }
  };

  const handleEdit = async (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);

    // Find country ID from country code if country is set
    let countryId: number | undefined = undefined;
    let countryRegion: string | undefined = undefined;
    if (customer.country) {
      const foundCountry = countries.find((c: any) => c.code === customer.country);
      if (foundCountry) {
        countryId = foundCountry.id;
        countryRegion = foundCountry.region || undefined;
        setSelectedCountryId(foundCountry.id);
      }
    } else {
      setSelectedCountryId(undefined);
    }

    // Fetch addresses from the API (they're not included in the customer list)
    let addressesData = {
      sold_to_addresses: [],
      bill_to_addresses: [],
      ship_to_addresses: [],
      payer_to_addresses: []
    };

    try {
      const addressResponse = await fetch(`/api/customers/${customer.id}/addresses`);
      if (addressResponse.ok) {
        const addressResult = await addressResponse.json();
        if (addressResult.success && Array.isArray(addressResult.data)) {
          // Group addresses by type
          addressesData = {
            sold_to_addresses: addressResult.data.filter((addr: any) => addr.address_type === 'sold_to'),
            bill_to_addresses: addressResult.data.filter((addr: any) => addr.address_type === 'bill_to'),
            ship_to_addresses: addressResult.data.filter((addr: any) => addr.address_type === 'ship_to'),
            payer_to_addresses: addressResult.data.filter((addr: any) => addr.address_type === 'payer_to')
          };
          console.log('✅ Loaded addresses for customer', customer.id, addressesData);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load addresses:', error);
    }

    setFormData({
      customer_number: customer.customer_number,
      customer_name: customer.customer_name,
      type: customer.type || "",
      customer_type_id: customer.customer_type_id,
      description: customer.description || "",
      tax_id: customer.tax_id || "",
      industry: customer.industry || "",
      segment: customer.segment || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "",
      postal_code: customer.postal_code || "",
      region: customer.region || countryRegion || "", // Use customer region or auto-filled from country
      phone: customer.phone || "",
      alt_phone: customer.alt_phone || "",
      email: customer.email || "",
      website: customer.website || "",
      currency: customer.currency || "",
      payment_terms: customer.payment_terms || "",
      language_code: customer.language_code || "",

      // Multiple address management fields - NOW LOADED FROM API
      sold_to_addresses: addressesData.sold_to_addresses,
      bill_to_addresses: addressesData.bill_to_addresses,
      ship_to_addresses: addressesData.ship_to_addresses,
      payer_to_addresses: addressesData.payer_to_addresses,

      default_address_setup: customer.default_address_setup || "",
      address_notes: customer.address_notes || "",
      payment_method: customer.payment_method || "",
      credit_limit: customer.credit_limit || 0,
      customer_pricing_procedure: customer.customer_pricing_procedure || "",
      credit_limit_group_id: customer.credit_limit_group_id || undefined,
      account_group_id: customer.account_group_id || undefined,
      credit_rating: customer.credit_rating || "",
      discount_group: customer.discount_group || "",
      price_group: customer.price_group || "",
      customer_assignment_group_id: customer.customer_assignment_group_id || undefined,
      incoterms: customer.incoterms || "",
      shipping_method: customer.shipping_method || "",
      shipping_condition_key: customer.shipping_condition_key || customer.shipping_conditions || "",
      delivery_terms: customer.delivery_terms || "",
      delivery_route: customer.delivery_route || "",
      delivery_priority: customer.delivery_priority || "",
      sales_org_code: customer.sales_org_code || "",
      sales_org_name: (customer as any).sales_org_name || "",
      distribution_channel_code: customer.distribution_channel_code || "",
      distribution_channel_name: (customer as any).distribution_channel_name || "",
      division_code: customer.division_code || "",
      division_name: (customer as any).division_name || "",
      sales_district: customer.sales_district || "",
      sales_office_code: customer.sales_office_code || "",
      sales_group_code: customer.sales_group_code || "",
      price_list: customer.price_list || "",
      is_active: customer.is_active,

      // === CRITICAL FINANCIAL FIELDS ===
      // Reconciliation Account
      reconciliation_account_code: customer.reconciliation_account_code || "",
      // Dunning and Payment Controls
      dunning_procedure: customer.dunning_procedure || "",
      dunning_block: customer.dunning_block || false,
      payment_block: customer.payment_block || false,

      // Credit Management
      credit_control_area: customer.credit_control_area || "",
      risk_category: customer.risk_category || "",
      credit_limit_currency: customer.credit_limit_currency || "",
      credit_exposure: customer.credit_exposure,
      credit_check_procedure: customer.credit_check_procedure || "",

      // Company Code
      company_code_id: customer.company_code_id || undefined,

      // Tax and Compliance
      tax_profile_id: customer.tax_profile_id || undefined,
      tax_rule_id: customer.tax_rule_id || undefined,
      tax_classification_code: customer.tax_classification_code || "",
      tax_exemption_certificate: customer.tax_exemption_certificate || "",
      withholding_tax_code: customer.withholding_tax_code || "",

      // Banking Information
      bank_account_number: customer.bank_account_number || "",
      bank_routing_number: customer.bank_routing_number || "",
      bank_name: customer.bank_name || "",
      electronic_payment_method: customer.electronic_payment_method || "",

      // Financial Posting Controls
      deletion_flag: customer.deletion_flag || false,
      authorization_group: customer.authorization_group || ""
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (customer: Customer) => {
    // Toggle the status: if currently active (true), set to false; otherwise set to true
    // Handle undefined/null as inactive (false)
    const currentStatus = customer.is_active === true;
    toggleStatusMutation.mutate({
      id: customer.id,
      is_active: currentStatus
    });
  };

  // Function to open customer details dialog
  const openCustomerDetails = (customer: Customer) => {
    setViewingCustomerDetails(customer);
    setIsCustomerDetailsOpen(true);
  };


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data refreshed",
        description: "Customer master data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh customer data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Customer Number', 'Customer Name', 'Customer Group', 'Country', 'City', 'Payment Terms', 'Currency', 'Active', 'Created At'];
    const csvData = filteredCustomers.map((customer: Customer) => [
      customer.customer_number,
      customer.customer_name,
      customer.segment || '',
      customer.country || '',
      customer.city || '',
      customer.payment_terms || '',
      customer.currency || '',
      customer.is_active === true ? 'Yes' : 'No',
      new Date(customer.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers - ${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export completed",
      description: `Exported ${filteredCustomers.length} customers to CSV file.`
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
            <h1 className="text-2xl font-bold">Customer Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage customer information and business relationships
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.hasDataModificationRights ? (
            <>
              <Button variant="outline" onClick={exportToCSV} disabled={filteredCustomers.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("import")}>
                <FileUp className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open && editingCustomer !== null) {
                  setEditingCustomer(null);
                  resetForm(false);
                } else if (!open) {
                  resetForm(false);
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Customer
                  </Button>
                </DialogTrigger>
              </Dialog>
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
            placeholder="Search customers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 px-3">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <span className="text-sm text-gray-600">Show Inactive</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh customer data"
        >
          <RefreshCw className={`h - 4 w - 4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">Customer Data</TabsTrigger>
          <TabsTrigger value="import">Import Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                All registered customers in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">Customer Number</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Country</TableHead>
                        <TableHead className="hidden md:table-cell">City</TableHead>
                        <TableHead className="hidden md:table-cell">Currency</TableHead>
                        <TableHead className="hidden md:table-cell">Payment Terms</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            No customers found. {searchTerm ? "Try a different search." : "Create your first customer."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer: Customer) => (
                          <TableRow
                            key={customer.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => openCustomerDetails(customer)}
                          >
                            <TableCell className="font-medium">{customer.customer_number}</TableCell>
                            <TableCell>{customer.customer_name}</TableCell>
                            <TableCell className="hidden sm:table-cell">{customer.country || "N/A"}</TableCell>
                            <TableCell className="hidden md:table-cell">{customer.city || "N/A"}</TableCell>
                            <TableCell className="hidden md:table-cell">{customer.currency || "N/A"}</TableCell>
                            <TableCell className="hidden md:table-cell">{customer.payment_terms || "N/A"}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline - flex items - center px - 2 py - 0.5 rounded text - xs font - medium ${customer.is_active === true
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {customer.is_active === true ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {permissions.hasDataModificationRights ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" title="More actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}>
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    {customer.is_active === true && (
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(customer); }}
                                        className="text-orange-600"
                                      >
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Deactivate
                                      </DropdownMenuItem>
                                    )}
                                    {customer.is_active !== true && (
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(customer); }}
                                        className="text-green-600"
                                      >
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Activate
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => deleteMutation.mutate(customer.id)}
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

          {/* Customer Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open && editingCustomer !== null) {
              setEditingCustomer(null);
              resetForm(false);
            } else if (!open) {
              resetForm(false);
            }
          }}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[85vw] md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="flex flex-wrap h-auto w-full gap-2 sm:grid sm:grid-cols-5">
                    <TabsTrigger value="general">General Data</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="company">finance</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  {/* General Data Tab */}
                  <TabsContent value="general" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Customer Number *</label>
                        <Input
                          value={formData.customer_number ?? ""}
                          placeholder="Auto-generated"
                          readOnly
                          disabled
                          className="bg-gray-50 cursor-not-allowed"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-generated based on account group number range
                        </p>
                        {selectedAccountGroup ? (
                          (() => {
                            // Check multiple possible field names from API response
                            const rangeFrom = selectedAccountGroup.numberRangeFrom || selectedAccountGroup.numberRange || selectedAccountGroup.number_range_from || selectedAccountGroup.number_range;
                            const rangeTo = selectedAccountGroup.numberRangeTo || selectedAccountGroup.number_range_to;

                            if (rangeFrom && rangeTo) {
                              return (
                                <p className="text-xs text-blue-600 font-medium mt-1.5 flex items-center gap-1">
                                  <span className="font-semibold">Number range:</span>
                                  <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {rangeFrom} - {rangeTo}
                                  </span>
                                </p>
                              );
                            } else {
                              return (
                                <p className="text-xs text-gray-500 mt-1">
                                  No number range restriction for this account group
                                </p>
                              );
                            }
                          })()
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Select an account group to see number range
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Customer Name *</label>
                        <Input
                          value={formData.customer_name ?? ""}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Account Group <span className="text-red-500">*</span></label>
                        <Select
                          value={formData.account_group_id ? formData.account_group_id.toString() : ""}
                          onValueChange={(value) => {
                            const selectedId = parseInt(value);
                            setFormData({ ...formData, account_group_id: selectedId, customer_number: '' });
                          }}
                          required
                          disabled={accountGroupsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account group" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountGroups.length > 0 ? (
                              accountGroups.map((ag: any) => {
                                // Check multiple possible field names from API response
                                const rangeFrom = ag.numberRangeFrom || ag.numberRange || ag.number_range_from || ag.number_range;
                                const rangeTo = ag.numberRangeTo || ag.number_range_to;
                                const hasRange = rangeFrom && rangeTo;
                                return (
                                  <SelectItem key={ag.id} value={ag.id.toString()}>
                                    <div className="flex flex-col">
                                      <span>{ag.code} - {ag.name}</span>
                                      {hasRange && (
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                          Number range: {rangeFrom} - {rangeTo}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {accountGroupsLoading ? "Loading account groups..." : "No account groups available. Please create account groups first."}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            if (!selectedAccountGroup) {
                              return "Required field for customer classification";
                            }
                            // Check multiple possible field names from API response
                            const rangeFrom = selectedAccountGroup.numberRangeFrom || selectedAccountGroup.numberRange || selectedAccountGroup.number_range_from || selectedAccountGroup.number_range;
                            const rangeTo = selectedAccountGroup.numberRangeTo || selectedAccountGroup.number_range_to;

                            if (rangeFrom && rangeTo) {
                              return (
                                <>
                                  Required field for customer classification. Allowed customer number range: <span className="font-semibold text-blue-600">{rangeFrom} - {rangeTo}</span>
                                </>
                              );
                            } else {
                              return "Required field for customer classification";
                            }
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Language Code</label>
                        <Input
                          value={formData.language_code ?? ""}
                          onChange={(e) => setFormData({ ...formData, language_code: e.target.value.toUpperCase() })}
                          placeholder="e.g., EN, FR, DE"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Customer Type</label>
                        <Select
                          value={formData.customer_type_id?.toString() || ""}
                          onValueChange={(value) => {
                            const selectedType = customerTypes.find((ct: any) => ct.id.toString() === value);
                            if (selectedType) {
                              // Get default values from customer type (handle both camelCase and snake_case from API)
                              const defaultCurrency = selectedType.defaultCurrency || selectedType.default_currency || "";
                              const defaultPaymentTerms = selectedType.defaultPaymentTerms || selectedType.default_payment_terms || "";
                              const defaultCreditLimit = selectedType.defaultCreditLimit || selectedType.default_credit_limit;

                              // Find matching credit limit group based on defaultCreditLimit
                              let matchedCreditLimitGroupId: number | undefined = undefined;
                              if (defaultCreditLimit && creditLimitGroups.length > 0) {
                                const defaultCreditLimitValue = parseFloat(defaultCreditLimit.toString());
                                // Find credit limit group that matches the default credit limit value
                                const matchedGroup = creditLimitGroups.find((clg: any) => {
                                  const clgValue = parseFloat(clg.creditLimit?.toString() || clg.credit_limit?.toString() || "0");
                                  // Match if credit limit values are equal (within 0.01 tolerance for decimal precision)
                                  return Math.abs(clgValue - defaultCreditLimitValue) < 0.01;
                                });
                                if (matchedGroup) {
                                  matchedCreditLimitGroupId = matchedGroup.id;
                                }
                              }

                              // Helper function to check if a field is truly empty
                              const isEmpty = (val: any) => {
                                if (val === null || val === undefined) return true;
                                if (typeof val === 'string') return val.trim() === '';
                                if (typeof val === 'number') return val === 0;
                                return false;
                              };

                              // Track what was auto-filled for user feedback
                              const autoFilledFields: string[] = [];

                              // Determine auto-filled values - always update when customer type changes
                              // Check if customer type is actually changing
                              const isCustomerTypeChanging = formData.customer_type_id !== undefined && formData.customer_type_id !== parseInt(value);

                              let newCurrency = formData.currency;
                              let newPaymentTerms = formData.payment_terms;
                              let newCreditLimit = formData.credit_limit;
                              let newCreditLimitGroupId = formData.credit_limit_group_id;

                              // Auto-fill currency - always update when customer type changes or if empty
                              if (defaultCurrency) {
                                if (isEmpty(formData.currency) || isCustomerTypeChanging) {
                                  newCurrency = defaultCurrency;
                                  autoFilledFields.push(`Currency: ${defaultCurrency}`);
                                }
                              }

                              // Auto-fill payment terms - always update when customer type changes or if empty
                              if (defaultPaymentTerms) {
                                if (isEmpty(formData.payment_terms) || isCustomerTypeChanging) {
                                  // Try to find matching payment term by code (case-insensitive)
                                  const matchingTerm = paymentTermsData.find((term: any) => {
                                    const termCode = (term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString() || "").toString().toUpperCase().trim();
                                    const defaultCode = defaultPaymentTerms.toString().toUpperCase().trim();
                                    return termCode === defaultCode;
                                  });

                                  if (matchingTerm) {
                                    // Use the exact code from the matching term - ensure it's a string
                                    newPaymentTerms = String(matchingTerm.code || matchingTerm.paymentTermCode || matchingTerm.payment_term_key || defaultPaymentTerms);
                                  } else {
                                    // If no match found, use the defaultPaymentTerms value directly as string
                                    // This allows for payment terms that might not be in the dropdown yet
                                    newPaymentTerms = String(defaultPaymentTerms);
                                  }
                                  autoFilledFields.push(`Payment Terms: ${newPaymentTerms}(Auto - filled from Customer Type)`);
                                }
                              }

                              // Auto-fill credit limit - always update when customer type changes or if empty
                              if (defaultCreditLimit) {
                                if ((!formData.credit_limit || formData.credit_limit === 0) || isCustomerTypeChanging) {
                                  const limitValue = parseFloat(defaultCreditLimit.toString());
                                  newCreditLimit = limitValue;
                                  autoFilledFields.push(`Credit Limit: ${limitValue}`);
                                }
                              }

                              // Auto-fill credit limit group - always update when customer type changes or if empty
                              if (matchedCreditLimitGroupId) {
                                if (!formData.credit_limit_group_id || isCustomerTypeChanging) {
                                  newCreditLimitGroupId = matchedCreditLimitGroupId;
                                  autoFilledFields.push(`Credit Limit Group`);
                                }
                              }

                              // Track which fields were auto-filled for UI indication
                              // Always mark as auto-filled when customer type changes, even if value is the same
                              const fieldsAutoFilled = new Set<string>();

                              // If customer type is changing, mark all fields that have default values as auto-filled
                              if (isCustomerTypeChanging) {
                                if (defaultCurrency) fieldsAutoFilled.add('currency');
                                if (defaultPaymentTerms) fieldsAutoFilled.add('payment_terms');
                                if (defaultCreditLimit) fieldsAutoFilled.add('credit_limit');
                                if (matchedCreditLimitGroupId) fieldsAutoFilled.add('credit_limit_group_id');
                              } else {
                                // First time selection - only mark if value actually changed
                                if (newPaymentTerms !== formData.payment_terms && newPaymentTerms) {
                                  fieldsAutoFilled.add('payment_terms');
                                }
                                if (newCurrency !== formData.currency && newCurrency) {
                                  fieldsAutoFilled.add('currency');
                                }
                                if (newCreditLimit !== formData.credit_limit && newCreditLimit) {
                                  fieldsAutoFilled.add('credit_limit');
                                }
                                if (newCreditLimitGroupId !== formData.credit_limit_group_id && newCreditLimitGroupId) {
                                  fieldsAutoFilled.add('credit_limit_group_id');
                                }
                              }

                              // Update form data with all changes at once (use functional update to ensure React detects changes)
                              setFormData((prevFormData) => {
                                const updated = {
                                  ...prevFormData,
                                  customer_type_id: value ? parseInt(value) : undefined,
                                  type: selectedType.name || "",
                                  currency: newCurrency,
                                  payment_terms: newPaymentTerms,
                                  credit_limit: newCreditLimit,
                                  credit_limit_group_id: newCreditLimitGroupId
                                };
                                return updated;
                              });

                              // Update auto-filled fields tracking
                              setAutoFilledFields(fieldsAutoFilled);

                              // Show toast notification if fields were auto-filled
                              if (autoFilledFields.length > 0) {
                                // Use setTimeout to ensure state update completes before showing toast
                                setTimeout(() => {
                                  toast({
                                    title: "Fields Auto-filled",
                                    description: `Auto - filled from customer type: ${autoFilledFields.join(", ")}.Don't forget to save!`,
                                  });
                                }, 100);
                              } else if (editingCustomer) {
                                // If editing and no fields were auto-filled (all already had values), still notify
                                setTimeout(() => {
                                  toast({
                                    title: "Customer Type Updated",
                                    description: `Customer type changed to "${selectedType.name}". Existing field values preserved.`,
                                  });
                                }, 100);
                              }
                            } else {
                              setFormData({
                                ...formData,
                                customer_type_id: value ? parseInt(value) : undefined,
                                type: ""
                              });
                              // Clear auto-filled fields when customer type is cleared
                              setAutoFilledFields(new Set());
                            }
                          }}
                          disabled={customerTypesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                          <SelectContent>
                            {customerTypes.map((ct: any) => (
                              <SelectItem key={ct.id} value={ct.id.toString()}>
                                {ct.name} ({ct.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select >
                      </div >
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={formData.description ?? ""}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Customer description"
                        />
                      </div>
                    </div >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tax ID</label>
                        <Input
                          value={formData.tax_id ?? ""}
                          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                          placeholder="Tax identification number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Industry</label>
                        <Input
                          value={formData.industry ?? ""}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          placeholder="Industry sector"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Segment</label>
                        <Input
                          value={formData.segment ?? ""}
                          onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                          placeholder="Customer segment"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Currency
                          {autoFilledFields.has('currency') && (
                            <span className="ml-2 text-xs text-green-600 font-normal">
                              (Auto-filled from Customer Type)
                            </span>
                          )}
                        </label>
                        <Input
                          value={formData.currency ?? ""}
                          onChange={(e) => {
                            setFormData({ ...formData, currency: e.target.value.toUpperCase() });
                            // Remove from auto-filled fields when user manually changes it
                            setAutoFilledFields(prev => {
                              const updated = new Set(prev);
                              updated.delete('currency');
                              return updated;
                            });
                          }}
                          placeholder="e.g., USD, EUR"
                          maxLength={10}
                          className={autoFilledFields.has('currency') ? 'bg-green-50 border-green-300' : ''}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input
                          value={formData.phone ?? ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Primary phone number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Alternative Phone</label>
                        <Input
                          value={formData.alt_phone ?? ""}
                          onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
                          placeholder="Alternative phone number"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={formData.email ?? ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Email address"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Website</label>
                        <Input
                          value={formData.website ?? ""}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="Website URL"
                        />
                      </div>
                    </div>
                  </TabsContent >

                  {/* Address Tab */}
                  < TabsContent value="address" className="space-y-4 pt-4" >
                    <CustomerAddressManager
                      customerData={formData}
                      onUpdate={handleAddressUpdate}
                      isEditing={true}
                    />
                  </TabsContent >

                  {/* Company Code Data Tab */}
                  < TabsContent value="company" className="space-y-4 pt-4" >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Company Code *</label>
                        <Select
                          value={formData.company_code_id ? formData.company_code_id.toString() : ""}
                          onValueChange={(value) => setFormData({ ...formData, company_code_id: parseInt(value) })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company code" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyCodesData.length > 0 ? (
                              companyCodesData.map((companyCode: any) => (
                                <SelectItem key={companyCode.id} value={companyCode.id.toString()}>
                                  {companyCode.code} - {companyCode.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {companyCodesLoading ? "Loading company codes..." : "No company codes available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Payment Terms
                          {autoFilledFields.has('payment_terms') && (
                            <span className="ml-2 text-xs text-green-600 font-normal">
                              (Auto-filled from Customer Type)
                            </span>
                          )}
                        </label>
                        <Select
                          value={formData.payment_terms || ""}
                          onValueChange={(value) => {
                            setFormData({ ...formData, payment_terms: value });
                            // Remove from auto-filled fields when user manually changes it
                            setAutoFilledFields(prev => {
                              const updated = new Set(prev);
                              updated.delete('payment_terms');
                              return updated;
                            });
                          }}
                        >
                          <SelectTrigger className={autoFilledFields.has('payment_terms') ? 'bg-green-50 border-green-300' : ''}>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTermsData.length > 0 ? (
                              paymentTermsData.map((term: any) => {
                                // Normalize the term code to ensure matching
                                const termCode = (term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString() || "").toString();
                                return (
                                  <SelectItem key={term.id} value={termCode}>
                                    {term.name} - {term.description}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {paymentTermsLoading ? "Loading payment terms..." : "No payment terms available"}
                              </SelectItem>
                            )}
                            {/* If payment_terms is set but not in the list, add it as a custom option */}
                            {formData.payment_terms && !paymentTermsData.find((term: any) => {
                              const termCode = (term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString() || "").toString();
                              return termCode === formData.payment_terms;
                            }) && (
                                <SelectItem value={formData.payment_terms}>
                                  {formData.payment_terms} (Auto-filled)
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Payment Method</label>
                        <Input
                          value={formData.payment_method ?? ""}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          placeholder="Payment method"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Reconciliation Account Code <span className="text-red-500">*</span></label>
                        <Select
                          value={formData.reconciliation_account_code || ""}
                          onValueChange={(value) => setFormData({ ...formData, reconciliation_account_code: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reconciliation account" />
                          </SelectTrigger>
                          <SelectContent>
                            {reconciliationAccountsLoading ? (
                              <SelectItem value="__none__" disabled>
                                Loading reconciliation accounts...
                              </SelectItem>
                            ) : reconciliationAccounts.length > 0 ? (
                              reconciliationAccounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.code}>
                                  {account.code} - {account.name}
                                  {account.description ? ` (${account.description})` : ""}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                No reconciliation accounts available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Dunning Procedure</label>
                        <Input
                          value={formData.dunning_procedure ?? ""}
                          onChange={(e) => setFormData({ ...formData, dunning_procedure: e.target.value })}
                          placeholder="e.g., DUNN001"
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Credit Control Area</label>
                        <Input
                          value={formData.credit_control_area ?? ""}
                          onChange={(e) => setFormData({ ...formData, credit_control_area: e.target.value })}
                          placeholder="e.g., CC001"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Risk Category</label>
                        <Input
                          value={formData.risk_category ?? ""}
                          onChange={(e) => setFormData({ ...formData, risk_category: e.target.value })}
                          placeholder="e.g., Low, Medium, High"
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Credit Limit
                          {autoFilledFields.has('credit_limit') && (
                            <span className="ml-2 text-xs text-green-600 font-normal">
                              (Auto-filled from Customer Type)
                            </span>
                          )}
                        </label>
                        <Input
                          type="number"
                          value={formData.credit_limit || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, credit_limit: e.target.value ? parseFloat(e.target.value) : undefined });
                            // Remove from auto-filled fields when user manually changes it
                            setAutoFilledFields(prev => {
                              const updated = new Set(prev);
                              updated.delete('credit_limit');
                              return updated;
                            });
                          }}
                          placeholder="Auto-fills from customer type"
                          className={autoFilledFields.has('credit_limit') ? 'bg-green-50 border-green-300' : ''}
                        />
                        {!autoFilledFields.has('credit_limit') && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-filled when customer type is selected
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Credit Limit Currency</label>
                        <Input
                          value={formData.credit_limit_currency ?? ""}
                          onChange={(e) => setFormData({ ...formData, credit_limit_currency: e.target.value.toUpperCase() })}
                          placeholder="e.g., USD, EUR"
                          maxLength={3}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Credit Limit Group
                          {autoFilledFields.has('credit_limit_group_id') && (
                            <span className="ml-2 text-xs text-green-600 font-normal">
                              (Auto-filled from Customer Type)
                            </span>
                          )}
                        </label>
                        <Select
                          value={formData.credit_limit_group_id ? formData.credit_limit_group_id.toString() : ""}
                          onValueChange={(value) => {
                            const selectedGroupId = value ? parseInt(value) : undefined;
                            setFormData({ ...formData, credit_limit_group_id: selectedGroupId });
                            // Remove from auto-filled fields when user manually changes it
                            setAutoFilledFields(prev => {
                              const updated = new Set(prev);
                              updated.delete('credit_limit_group_id');
                              return updated;
                            });

                            // Find the selected credit limit group
                            const selectedGroup = creditLimitGroups.find((clg: any) => clg.id === selectedGroupId);

                            // Auto-fill credit limit from the selected group
                            if (selectedGroup) {
                              // Try multiple possible field names (camelCase, snake_case, etc.)
                              let groupCreditLimit = selectedGroup.creditLimit;
                              if (groupCreditLimit === undefined || groupCreditLimit === null) {
                                groupCreditLimit = selectedGroup.credit_limit;
                              }
                              if (groupCreditLimit === undefined || groupCreditLimit === null) {
                                groupCreditLimit = selectedGroup.creditLimitValue;
                              }
                              if (groupCreditLimit === undefined || groupCreditLimit === null) {
                                groupCreditLimit = selectedGroup.creditLimitAmount;
                              }

                              // Convert to number if it's a string or decimal
                              if (groupCreditLimit !== undefined && groupCreditLimit !== null) {
                                const creditLimitValue = typeof groupCreditLimit === 'string'
                                  ? parseFloat(groupCreditLimit)
                                  : typeof groupCreditLimit === 'number'
                                    ? groupCreditLimit
                                    : parseFloat(String(groupCreditLimit));

                                if (!isNaN(creditLimitValue) && creditLimitValue >= 0) {
                                  // Update both credit limit group ID and credit limit
                                  setFormData(prev => ({
                                    ...prev,
                                    credit_limit_group_id: selectedGroupId,
                                    credit_limit: creditLimitValue
                                  }));

                                  toast({
                                    title: "Credit Limit Updated",
                                    description: `Credit limit updated to ${creditLimitValue.toLocaleString()} from selected group.`,
                                  });
                                  return;
                                }
                              }
                            }

                            // If no credit limit found, just update the group ID
                            setFormData(prev => ({
                              ...prev,
                              credit_limit_group_id: selectedGroupId
                            }));
                          }}
                        >
                          <SelectTrigger className={autoFilledFields.has('credit_limit_group_id') ? 'bg-green-50 border-green-300' : ''}>
                            <SelectValue placeholder="Select credit limit group" />
                          </SelectTrigger>
                          <SelectContent>
                            {creditLimitGroups.length > 0 ? (
                              creditLimitGroups.map((clg: any) => {
                                const creditLimitValue = clg.creditLimit || clg.credit_limit || clg.creditLimitValue || clg.creditLimitAmount || 0;
                                const displayText = `${clg.code || clg.name}${clg.description ? ` - ${clg.description}` : ''} (${typeof creditLimitValue === 'number' ? creditLimitValue.toLocaleString() : creditLimitValue})`;
                                return (
                                  <SelectItem key={clg.id} value={clg.id.toString()}>
                                    {displayText}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="__none__" disabled>
                                No credit limit groups available
                              </SelectItem>
                            )}
                            {/* If credit_limit_group_id is set but not in the list, add it as a custom option */}
                            {formData.credit_limit_group_id && !creditLimitGroups.find((clg: any) => clg.id === formData.credit_limit_group_id) && (
                              <SelectItem value={formData.credit_limit_group_id.toString()}>
                                Group ID: {formData.credit_limit_group_id} (Auto-filled)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {!autoFilledFields.has('credit_limit_group_id') && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-fills credit limit when selected
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Credit Rating</label>
                        <Select
                          value={formData.credit_rating ?? ""}
                          onValueChange={(value) => setFormData({ ...formData, credit_rating: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select credit rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXCELLENT">Excellent (AAA)</SelectItem>
                            <SelectItem value="GOOD">Good (AA)</SelectItem>
                            <SelectItem value="FAIR">Fair (A)</SelectItem>
                            <SelectItem value="AVERAGE">Average (BBB)</SelectItem>
                            <SelectItem value="BELOW_AVERAGE">Below Average (BB)</SelectItem>
                            <SelectItem value="POOR">Poor (B)</SelectItem>
                            <SelectItem value="VERY_POOR">Very Poor (CCC)</SelectItem>
                            <SelectItem value="DEFAULT">Default (D)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Credit Exposure</label>
                        <Input
                          type="number"
                          value={formData.credit_exposure || ""}
                          onChange={(e) => setFormData({ ...formData, credit_exposure: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Current credit exposure"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Credit Check Procedure</label>
                        <Input
                          value={formData.credit_check_procedure ?? ""}
                          onChange={(e) => setFormData({ ...formData, credit_check_procedure: e.target.value })}
                          placeholder="Credit check process"
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.dunning_block || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, dunning_block: checked })}
                        />
                        <span className="text-sm font-medium">Dunning Block</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.payment_block || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, payment_block: checked })}
                        />
                        <span className="text-sm font-medium">Payment Block</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.deletion_flag || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, deletion_flag: checked })}
                        />
                        <span className="text-sm font-medium">Deletion Flag</span>
                      </div>
                    </div>
                  </TabsContent >

                  {/* Sales Area Data Tab */}
                  < TabsContent value="sales" className="space-y-4 pt-4" >
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium">Sales Area</label>
                        <Select
                          value={formData.sales_org_code && formData.distribution_channel_code && formData.division_code
                            ? `${formData.sales_org_code}-${formData.distribution_channel_code}-${formData.division_code}`
                            : ""
                          }
                          onValueChange={(value) => {
                            // Find the selected sales area - backend returns snake_case fields
                            const selectedSalesArea = salesAreas.find((sa: any) =>
                              `${sa.sales_org_code}-${sa.distribution_channel_code}-${sa.division_code}` === value
                            );
                            if (selectedSalesArea) {
                              // Use functional update to preserve all other form fields
                              setFormData(prev => ({
                                ...prev,
                                sales_org_code: selectedSalesArea.sales_org_code,
                                sales_org_name: selectedSalesArea.sales_org_name || "",
                                distribution_channel_code: selectedSalesArea.distribution_channel_code,
                                distribution_channel_name: selectedSalesArea.distribution_channel_name || "",
                                division_code: selectedSalesArea.division_code,
                                division_name: selectedSalesArea.division_name || "",
                                // Reset sales office when sales area changes
                                sales_office_code: ""
                              }));
                              setSelectedSalesAreaId(selectedSalesArea.id);
                              toast({
                                title: "Sales Area Selected",
                                description: `Auto-filled: ${selectedSalesArea.sales_org_name || selectedSalesArea.sales_org_code} - ${selectedSalesArea.distribution_channel_name || selectedSalesArea.distribution_channel_code} - ${selectedSalesArea.division_name || selectedSalesArea.division_code}`,
                              });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sales area (auto-fills Sales Org, Distribution Channel, and Division)" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesAreas.length > 0 ? (
                              salesAreas.map((sa: any) => (
                                <SelectItem
                                  key={sa.id}
                                  value={`${sa.sales_org_code}-${sa.distribution_channel_code}-${sa.division_code}`}
                                >
                                  {sa.name || `${sa.sales_org_name || sa.sales_org_code} - ${sa.distribution_channel_name || sa.distribution_channel_code} - ${sa.division_name || sa.division_code}`} ({sa.sales_org_code} / {sa.distribution_channel_code} / {sa.division_code})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                No sales areas available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select a sales area to auto-fill Sales Organization, Distribution Channel, and Division
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Sales Organization</label>
                        <Input
                          value={formData.sales_org_code && formData.sales_org_name
                            ? `${formData.sales_org_code} - ${formData.sales_org_name}`
                            : formData.sales_org_code ?? ""
                          }
                          readOnly
                          placeholder="Auto-filled from sales area"
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Distribution Channel</label>
                        <Input
                          value={formData.distribution_channel_code && formData.distribution_channel_name
                            ? `${formData.distribution_channel_code} - ${formData.distribution_channel_name}`
                            : formData.distribution_channel_code ?? ""
                          }
                          readOnly
                          placeholder="Auto-filled from sales area"
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Division</label>
                        <Input
                          value={formData.division_code && formData.division_name
                            ? `${formData.division_code} - ${formData.division_name}`
                            : formData.division_code ?? ""
                          }
                          readOnly
                          placeholder="Auto-filled from sales area"
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Sales District</label>
                        <Input
                          value={formData.sales_district ?? ""}
                          onChange={(e) => setFormData({ ...formData, sales_district: e.target.value })}
                          placeholder="Sales district code"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Sales Office</label>
                        <Select
                          value={formData.sales_office_code || ""}
                          onValueChange={(value) => setFormData({ ...formData, sales_office_code: value })}
                          disabled={!selectedSalesAreaId} // Disable if no sales area selected
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedSalesAreaId ? "Select Sales Office" : "Select Sales Area first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSalesOffices.length > 0 ? (
                              availableSalesOffices.map((so: any) => (
                                <SelectItem key={so.code} value={so.code}>
                                  {so.name} ({so.code})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {selectedSalesAreaId ? "No sales offices assigned" : "Select Sales Area first"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Sales Group</label>
                        <Input
                          value={formData.sales_group_code ?? ""}
                          onChange={(e) => setFormData({ ...formData, sales_group_code: e.target.value })}
                          placeholder="Sales group code"
                          maxLength={3}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price List</label>
                        <Input
                          value={formData.price_list ?? ""}
                          onChange={(e) => setFormData({ ...formData, price_list: e.target.value })}
                          placeholder="Price list identifier"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Discount Group</label>
                        <Select
                          value={formData.discount_group || ""}
                          onValueChange={(value) => setFormData({ ...formData, discount_group: value === "__none__" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount group" />
                          </SelectTrigger>
                          <SelectContent>
                            {discountGroupsData.length > 0 ? (
                              discountGroupsData.map((dg: any) => (
                                <SelectItem key={dg.id} value={dg.code}>
                                  {dg.code} - {dg.name} ({dg.discountPercent}%)
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {discountGroupsLoading ? "Loading discount groups..." : "No discount groups available"}
                              </SelectItem>
                            )}
                            {discountGroupsData.length > 0 && (
                              <SelectItem value="__none__">None</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Customer Pricing Procedure</label>
                        <Select
                          value={formData.customer_pricing_procedure || ""}
                          onValueChange={(value) => setFormData({ ...formData, customer_pricing_procedure: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select pricing procedure">
                              {formData.customer_pricing_procedure && customerPricingProcedures.length > 0
                                ? (() => {
                                  const selected = customerPricingProcedures.find((pp: any) => pp.code === formData.customer_pricing_procedure);
                                  return selected ? `${selected.code} - ${selected.description || selected.name}` : formData.customer_pricing_procedure;
                                })()
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {customerPricingProcedures.length > 0 ? (
                              customerPricingProcedures.map((pp: any) => (
                                <SelectItem key={pp.id} value={pp.code}>
                                  {pp.code} - {pp.description}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>No pricing procedures available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Customer Assignment Group</label>
                        <Select
                          value={formData.customer_assignment_group_id?.toString() || ""}
                          onValueChange={(value) => setFormData({ ...formData, customer_assignment_group_id: value ? parseInt(value) : undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignment group (optional)">
                              {formData.customer_assignment_group_id && customerAssignmentGroups.length > 0
                                ? (() => {
                                  const selected = customerAssignmentGroups.find((cag: any) =>
                                    String(cag.id) === String(formData.customer_assignment_group_id)
                                  );
                                  return selected ? `${selected.code} - ${selected.name}` : formData.customer_assignment_group_id;
                                })()
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {customerAssignmentGroups.length > 0 ? (
                              customerAssignmentGroups.map((cag: any) => (
                                <SelectItem key={cag.id} value={cag.id.toString()}>
                                  {cag.code} - {cag.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>No assignment groups available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price Group</label>
                        <Input
                          value={formData.price_group ?? ""}
                          onChange={(e) => setFormData({ ...formData, price_group: e.target.value })}
                          placeholder="Price group"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Shipping Condition</label>
                        <Select
                          value={formData.shipping_condition_key || ""}
                          onValueChange={(value) => setFormData({ ...formData, shipping_condition_key: value === "__none__" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipping condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {shippingConditionKeysData.length > 0 ? (
                              shippingConditionKeysData.map((sck: any) => (
                                <SelectItem key={sck.id} value={sck.keyCode || sck.key_code}>
                                  {sck.keyCode || sck.key_code} - {sck.description}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {shippingConditionKeysLoading ? "Loading..." : "No shipping conditions available"}
                              </SelectItem>
                            )}
                            {shippingConditionKeysData.length > 0 && (
                              <SelectItem value="__none__">None</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Delivery Priority</label>
                        <Input
                          value={formData.delivery_priority ?? ""}
                          onChange={(e) => setFormData({ ...formData, delivery_priority: e.target.value })}
                          placeholder="Delivery priority code"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Incoterms</label>
                        <Select
                          value={formData.incoterms || ""}
                          onValueChange={(value) => setFormData({ ...formData, incoterms: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select incoterms" />
                          </SelectTrigger>
                          <SelectContent>
                            {incotermsData.length > 0 ? (
                              incotermsData.map((incoterm: any) => (
                                <SelectItem key={incoterm.id} value={incoterm.incotermsKey}>
                                  {incoterm.incotermsKey} - {incoterm.description}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>
                                {incotermsLoading ? "Loading incoterms..." : "No incoterms available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Shipping Method</label>
                        <Input
                          value={formData.shipping_method ?? ""}
                          onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
                          placeholder="Shipping method"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Delivery Terms</label>
                        <Input
                          value={formData.delivery_terms ?? ""}
                          onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                          placeholder="Delivery terms"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Delivery Route</label>
                        <Input
                          value={formData.delivery_route ?? ""}
                          onChange={(e) => setFormData({ ...formData, delivery_route: e.target.value })}
                          placeholder="Delivery route"
                        />
                      </div>
                    </div>
                  </TabsContent >

                  {/* Settings Tab */}
                  < TabsContent value="settings" className="space-y-4 pt-4" >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.is_active || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <span className="text-sm font-medium">Active Customer</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Authorization Group</label>
                        <Input
                          value={formData.authorization_group ?? ""}
                          onChange={(e) => setFormData({ ...formData, authorization_group: e.target.value })}
                          placeholder="Authorization group for access control"
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Tax & Compliance</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Tax Profile</label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={formData.tax_profile_id || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              tax_profile_id: e.target.value ? Number(e.target.value) : undefined
                            })}
                          >
                            <option value="">Select Tax Profile</option>
                            {taxProfiles
                              .filter((p: any) => p.isActive)
                              .map((profile: any) => (
                                <option key={profile.id} value={profile.id}>
                                  {profile.profileCode} - {profile.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tax Classification</label>
                          <Select
                            value={formData.tax_classification_code || ""}
                            onValueChange={(value) => setFormData({ ...formData, tax_classification_code: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select classification" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxClassifications
                                .filter((tc: any) => tc.applies_to === 'BOTH' || tc.applies_to === 'CUSTOMER')
                                .map((tc: any) => (
                                  <SelectItem key={tc.id} value={tc.code}>
                                    {tc.code} - {tc.description}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Withholding Tax Code</label>
                          <Input
                            value={formData.withholding_tax_code ?? ""}
                            onChange={(e) => setFormData({ ...formData, withholding_tax_code: e.target.value })}
                            placeholder="Tax withholding requirements"
                            maxLength={10}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tax Exemption Certificate</label>
                          <Input
                            value={formData.tax_exemption_certificate}
                            onChange={(e) => setFormData({ ...formData, tax_exemption_certificate: e.target.value })}
                            placeholder="Tax exemption details"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Banking Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Bank Account Number</label>
                          <Input
                            value={formData.bank_account_number ?? ""}
                            onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                            placeholder="Customer bank account number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bank Routing Number</label>
                          <Input
                            value={formData.bank_routing_number ?? ""}
                            onChange={(e) => setFormData({ ...formData, bank_routing_number: e.target.value })}
                            placeholder="Bank routing information"
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Bank Name</label>
                          <Input
                            value={formData.bank_name ?? ""}
                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                            placeholder="Customer bank name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Electronic Payment Method</label>
                          <Input
                            value={formData.electronic_payment_method}
                            onChange={(e) => setFormData({ ...formData, electronic_payment_method: e.target.value })}
                            placeholder="Preferred electronic payment method"
                            maxLength={20}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent >
                </Tabs >

                <div className="flex gap-2 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => resetForm()}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? "Update" : "Create"} Customer
                  </Button>
                </div>
              </form >
            </DialogContent >
          </Dialog >
        </TabsContent >

        <TabsContent value="import" className="space-y-6">
          <CustomerMasterExcelImport />
        </TabsContent>
      </Tabs >

      {/* Customer Details Dialog */}
      < Dialog open={isCustomerDetailsOpen} onOpenChange={setIsCustomerDetailsOpen} >
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[90vw] md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {viewingCustomerDetails && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomerDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Customer Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingCustomerDetails.customer_name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingCustomerDetails.customer_name}</h3>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="outline">{viewingCustomerDetails.customer_number}</Badge>
                      <Badge
                        variant={viewingCustomerDetails.is_active ? "default" : "secondary"}
                        className={viewingCustomerDetails.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingCustomerDetails.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {viewingCustomerDetails.customer_type_name && (
                        <Badge variant="outline">{viewingCustomerDetails.customer_type_name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCustomerDetailsOpen(false);
                        handleEdit(viewingCustomerDetails);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Customer Number:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.customer_number}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Customer Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.customer_name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Type:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.customer_type_name || viewingCustomerDetails.type || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Industry:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.industry || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Tax ID:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.tax_id || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">
                            {viewingCustomerDetails.is_active ? "Active" : "Inactive"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.phone || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Email:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.email || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Website:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.website || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">City:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.city || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">State:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.state || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Country:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.country || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Financial Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Currency:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.currency || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Payment Terms:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.payment_terms || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Payment Method:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.payment_method || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Credit Limit:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingCustomerDetails.credit_limit
                              ? `${viewingCustomerDetails.credit_limit_currency || viewingCustomerDetails.currency || ''} ${viewingCustomerDetails.credit_limit.toLocaleString()}`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Credit Rating:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.credit_rating || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Reconciliation Account:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.reconciliation_account_code || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Sales Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sales Organization:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.sales_org_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Distribution Channel:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.distribution_channel_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Division:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.division_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sales Office:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.sales_office_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Incoterms:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.incoterms || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Shipping Method:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.shipping_method || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Shipping Condition:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.shipping_condition_key || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sales Group:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.sales_group_code || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Sales District:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.sales_district_code || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Pricing Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Customer Pricing Procedure:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingCustomerDetails.customer_pricing_procedure ? (() => {
                              const procedure = customerPricingProcedures.find((pp: any) =>
                                String(pp.id) === String(viewingCustomerDetails.customer_pricing_procedure) ||
                                String(pp.code) === String(viewingCustomerDetails.customer_pricing_procedure)
                              );
                              return procedure
                                ? `${procedure.code} - ${procedure.description || procedure.name}`
                                : viewingCustomerDetails.customer_pricing_procedure;
                            })() : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Customer Assignment Group:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingCustomerDetails.customer_assignment_group_id ? (() => {
                              const assignmentGroup = customerAssignmentGroups.find((cag: any) =>
                                String(cag.id) === String(viewingCustomerDetails.customer_assignment_group_id)
                              );
                              return assignmentGroup
                                ? `${assignmentGroup.code} - ${assignmentGroup.name}`
                                : viewingCustomerDetails.customer_assignment_group_id;
                            })() : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Price List:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.price_list || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Price Group:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.price_group || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Discount Group:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.discount_group || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Delivered at Place:</dt>
                          <dd className="text-sm text-gray-900">{viewingCustomerDetails.delivered_at_place ? "Yes" : "No"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {viewingCustomerDetails.description && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{viewingCustomerDetails.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Timestamps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created At:</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(viewingCustomerDetails.created_at).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Updated At:</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(viewingCustomerDetails.updated_at).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 cursor-pointer" onClick={(e) => {
                    const content = e.currentTarget.nextElementSibling;
                    if (content) {
                      content.classList.toggle('hidden');
                      const icon = e.currentTarget.querySelector('.chevron-icon');
                      if (icon) {
                        icon.classList.toggle('rotate-180');
                      }
                    }
                  }}>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Administrative Data</CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="chevron-icon transition-transform duration-200"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </CardHeader>
                  <CardContent className="hidden">
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created By:</dt>
                        <dd className="text-sm text-gray-900">{viewingCustomerDetails.created_by || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Updated By:</dt>
                        <dd className="text-sm text-gray-900">{viewingCustomerDetails.updated_by || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tenant ID:</dt>
                        <dd className="text-sm text-gray-900">{viewingCustomerDetails._tenantId || "—"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
}