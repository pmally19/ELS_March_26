import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiGet } from "@/lib/apiClient";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  Percent,
  Globe,
  ArrowLeft,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Landmark
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ===== TYPES =====
type TaxProfile = {
  id: number;
  profileCode: string;
  name: string;
  description?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ruleCount?: number;
};

type TaxRule = {
  id: number;
  profileId: number;
  ruleCode: string;
  title: string;
  ratePercent: string;
  jurisdiction?: string;
  taxCategoryId?: number;
  appliesTo?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profileName?: string;
  profileCode?: string;
  taxCategoryCode?: string;
  taxCategoryName?: string;
};

type TaxConditionRecord = {
  id: number;
  condition_type_code: string;
  departure_country?: string;
  departure_state?: string;
  destination_country?: string;
  destination_state?: string;
  customer_tax_class?: string;
  material_tax_class?: string;
  tax_profile_id?: number;
  tax_rule_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  profile_code?: string;
  tax_profile_name?: string;
  tax_rule_code?: string;
  tax_rule_title?: string;
  tax_rule_rate?: string;
};

type TaxProcedure = {
  id: number;
  procedure_code: string;
  procedure_name: string;
  description?: string;
  is_active: boolean;
  step_count?: number;
  created_at: string;
  updated_at: string;
};

type TaxProcedureStep = {
  id: number;
  procedure_id: number;
  step_number: number;
  condition_type_code?: string;
  condition_name?: string;
  tax_rule_id?: number;
  tax_rule_code?: string;
  tax_rule_title?: string;
  tax_rule_rate?: string;
  description?: string;
  from_step?: number;
  to_step?: number;
  account_key?: string;
  is_statistical: boolean;
};

type TaxAccountDetermination = {
  id: number;
  chart_of_accounts_id: number;
  coa_code: string;
  coa_name: string;
  account_key: string;
  account_key_name: string;
  account_key_type: string;
  tax_rule_id?: number;
  tax_rule_code?: string;
  tax_rule_title?: string;
  tax_rule_rate?: string;
  gl_account_id: number;
  gl_account_number: string;
  gl_account_name: string;
  description?: string;
  is_active: boolean;
};

const TaxManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("profiles");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [viewingRule, setViewingRule] = useState<TaxRule | null>(null);

  // Procedure state
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<TaxProcedure | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<TaxProcedure | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<TaxProcedureStep | null>(null);

  // Account Determination state
  const [acctDetDialogOpen, setAcctDetDialogOpen] = useState(false);
  const [editingAcctDet, setEditingAcctDet] = useState<TaxAccountDetermination | null>(null);
  const [selectedCoaId, setSelectedCoaId] = useState<number | null>(null);

  // Condition Records state
  const [condRecordDialogOpen, setCondRecordDialogOpen] = useState(false);
  const [editingCondRecord, setEditingCondRecord] = useState<TaxConditionRecord | null>(null);
  const [condRecordSearchTerm, setCondRecordSearchTerm] = useState("");
  const [condRecordFormData, setCondRecordFormData] = useState({
    condition_type_code: "",
    departure_country: "",
    departure_state: "",
    destination_country: "",
    destination_state: "",
    customer_tax_class: "",
    material_tax_class: "",
    tax_profile_id: undefined as number | undefined,
    tax_rule_id: undefined as number | undefined,
  });

  // ===== FETCH DATA =====
  // Tax Profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<TaxProfile[]>({
    queryKey: ["tax-profiles"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-profiles");
      return await response.json();
    },
  });

  // Tax Rules
  const { data: rules = [], isLoading: loadingRules } = useQuery<TaxRule[]>({
    queryKey: ["tax-rules"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-rules");
      return await response.json();
    },
  });

  // Tax Categories for dropdown
  const { data: taxCategories = [] } = useQuery<any[]>({
    queryKey: ['tax-categories-dropdown'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/tax-rules/tax-categories');
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  // Countries for dropdown
  const { data: countries = [], isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/countries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/countries');
        const data = await response.json();
        return Array.isArray(data) ? data.map((c: any) => ({
          id: c.id,
          code: c.code || "",
          name: c.name || "",
          isActive: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true),
        })).filter((c: any) => c.isActive) : [];
      } catch (error) {
        console.error('Error fetching countries:', error);
        return [];
      }
    },
  });

  // Condition Records
  const { data: condRecords = [], isLoading: loadingCondRecords, refetch: refetchCondRecords } = useQuery<TaxConditionRecord[]>({
    queryKey: ["tax-condition-records"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-condition-records");
      return await response.json();
    },
  });

  // Condition Records dropdowns
  const { data: condRecordDropdowns } = useQuery<any>({
    queryKey: ["tax-condition-records-dropdowns"],
    queryFn: async () => {
      try {
        const r = await apiRequest("/api/master-data/tax-condition-records/dropdowns");
        return await r.json();
      } catch { return {}; }
    },
  });

  // ===== FORM STATE =====
  const [profileFormData, setProfileFormData] = useState({
    profileCode: "",
    name: "",
    description: "",
    country: "",
    isActive: true,
  });

  const [ruleFormData, setRuleFormData] = useState({
    profileId: 0,
    ruleCode: "",
    title: "",
    ratePercent: "",
    jurisdiction: "",
    taxCategoryId: undefined as number | undefined,
    appliesTo: "",
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: "",
    isActive: true,
  });

  // ===== MUTATIONS - PROFILES =====
  const createProfile = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-profiles", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      toast({ title: "Success", description: "Tax profile created successfully" });
      setProfileDialogOpen(false);
      resetProfileForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-profiles/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      toast({ title: "Success", description: "Tax profile updated successfully" });
      setProfileDialogOpen(false);
      setEditingProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-profiles/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax profile deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ===== MUTATIONS - RULES =====
  const createRule = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-rules", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule created successfully" });
      setRuleDialogOpen(false);
      resetRuleForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule updated successfully" });
      setRuleDialogOpen(false);
      setEditingRule(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-rules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
      toast({ title: "Success", description: "Tax rule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ===== PROCEDURE DATA =====
  const { data: procedures = [], isLoading: loadingProcedures } = useQuery<TaxProcedure[]>({
    queryKey: ["tax-procedures"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/tax-procedures");
      return await response.json();
    },
  });

  const { data: procedureSteps = [] } = useQuery<TaxProcedureStep[]>({
    queryKey: ["tax-procedure-steps", selectedProcedure?.id],
    queryFn: async () => {
      if (!selectedProcedure) return [];
      const response = await apiRequest(`/api/master-data/tax-procedures/${selectedProcedure.id}/steps`);
      return await response.json();
    },
    enabled: !!selectedProcedure,
  });

  const { data: conditionTypes = [] } = useQuery<any[]>({
    queryKey: ["procedure-condition-types"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-procedures/condition-types");
        return await response.json();
      } catch { return []; }
    },
  });

  const { data: taxRulesDropdown = [] } = useQuery<any[]>({
    queryKey: ["procedure-tax-rules"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-procedures/tax-rules");
        return await response.json();
      } catch { return []; }
    },
  });

  const { data: accountKeysDropdown = [] } = useQuery<any[]>({
    queryKey: ["procedure-account-keys"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-procedures/account-keys");
        return await response.json();
      } catch { return []; }
    },
  });

  // ===== ACCOUNT DETERMINATION DATA =====
  const { data: acctDetList = [], isLoading: loadingAcctDet, refetch: refetchAcctDet } = useQuery<TaxAccountDetermination[]>({
    queryKey: ["tax-account-determination", selectedCoaId],
    queryFn: async () => {
      const url = selectedCoaId
        ? `/api/master-data/tax-account-determination?chart_of_accounts_id=${selectedCoaId}`
        : "/api/master-data/tax-account-determination";
      const response = await apiRequest(url);
      return await response.json();
    },
  });

  const { data: coaList = [] } = useQuery<any[]>({
    queryKey: ["acct-det-coa"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-account-determination/chart-of-accounts");
        return await response.json();
      } catch { return []; }
    },
  });

  const { data: acctDetGlAccounts = [] } = useQuery<any[]>({
    queryKey: ["acct-det-gl-accounts", selectedCoaId],
    queryFn: async () => {
      try {
        const url = selectedCoaId
          ? `/api/master-data/tax-account-determination/gl-accounts?chart_of_accounts_id=${selectedCoaId}`
          : "/api/master-data/tax-account-determination/gl-accounts";
        const response = await apiRequest(url);
        return await response.json();
      } catch { return []; }
    },
  });

  const { data: acctDetAccountKeys = [] } = useQuery<any[]>({
    queryKey: ["acct-det-account-keys"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-account-determination/account-keys");
        return await response.json();
      } catch { return []; }
    },
  });

  const { data: acctDetTaxRules = [] } = useQuery<any[]>({
    queryKey: ["acct-det-tax-rules"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/tax-account-determination/tax-rules");
        return await response.json();
      } catch { return []; }
    },
  });

  const [acctDetFormData, setAcctDetFormData] = useState({
    chart_of_accounts_id: undefined as number | undefined,
    account_key: "",
    tax_rule_id: undefined as number | undefined,
    gl_account_id: undefined as number | undefined,
    description: "",
    is_active: true,
  });

  const createAcctDet = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-account-determination", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-account-determination"] });
      toast({ title: "Success", description: "Tax account mapping created" });
      setAcctDetDialogOpen(false);
      resetAcctDetForm();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateAcctDet = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-account-determination/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-account-determination"] });
      toast({ title: "Success", description: "Tax account mapping updated" });
      setAcctDetDialogOpen(false);
      setEditingAcctDet(null);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteAcctDet = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-account-determination/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-account-determination"] });
      toast({ title: "Success", description: "Tax account mapping deleted" });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  // ===== MUTATIONS - CONDITION RECORDS =====
  const createCondRecord = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("/api/master-data/tax-condition-records", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-condition-records"] });
      toast({ title: "Success", description: "Condition record created" });
      setCondRecordDialogOpen(false);
      resetCondRecordForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCondRecord = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/master-data/tax-condition-records/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-condition-records"] });
      toast({ title: "Success", description: "Condition record updated" });
      setCondRecordDialogOpen(false);
      setEditingCondRecord(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCondRecord = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/master-data/tax-condition-records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-condition-records"] });
      toast({ title: "Success", description: "Condition record deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetAcctDetForm = () => {
    setAcctDetFormData({
      chart_of_accounts_id: selectedCoaId ?? undefined,
      account_key: "",
      tax_rule_id: undefined,
      gl_account_id: undefined,
      description: "",
      is_active: true,
    });
  };

  const handleEditAcctDet = (row: TaxAccountDetermination) => {
    setEditingAcctDet(row);
    setAcctDetFormData({
      chart_of_accounts_id: row.chart_of_accounts_id,
      account_key: row.account_key,
      tax_rule_id: row.tax_rule_id,
      gl_account_id: row.gl_account_id,
      description: row.description || "",
      is_active: row.is_active,
    });
    setAcctDetDialogOpen(true);
  };

  // ===== PROCEDURE FORM STATE =====
  const [procedureFormData, setProcedureFormData] = useState({
    procedure_code: "",
    procedure_name: "",
    description: "",
    is_active: true,
  });

  const [stepFormData, setStepFormData] = useState({
    step_number: 10,
    condition_type_code: "",
    tax_rule_id: undefined as number | undefined,
    description: "",
    from_step: undefined as number | undefined,
    to_step: undefined as number | undefined,
    account_key: "",
    is_statistical: false,
  });

  // ===== PROCEDURE MUTATIONS =====
  const createProcedure = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/master-data/tax-procedures", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedures"] });
      toast({ title: "Success", description: "Tax procedure created successfully" });
      setProcedureDialogOpen(false);
      resetProcedureForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProcedure = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-procedures/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedures"] });
      toast({ title: "Success", description: "Tax procedure updated successfully" });
      setProcedureDialogOpen(false);
      setEditingProcedure(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProcedure = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/master-data/tax-procedures/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedures"] });
      toast({ title: "Success", description: "Tax procedure deleted successfully" });
      if (selectedProcedure) setSelectedProcedure(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createStep = useMutation({
    mutationFn: async ({ procedureId, data }: { procedureId: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-procedures/${procedureId}/steps`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedure-steps", selectedProcedure?.id] });
      queryClient.invalidateQueries({ queryKey: ["tax-procedures"] });
      toast({ title: "Success", description: "Step added successfully" });
      setStepDialogOpen(false);
      resetStepForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStep = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: number; data: any }) => {
      return apiRequest(`/api/master-data/tax-procedures/steps/${stepId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedure-steps", selectedProcedure?.id] });
      toast({ title: "Success", description: "Step updated successfully" });
      setStepDialogOpen(false);
      setEditingStep(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: number) => {
      return apiRequest(`/api/master-data/tax-procedures/steps/${stepId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-procedure-steps", selectedProcedure?.id] });
      queryClient.invalidateQueries({ queryKey: ["tax-procedures"] });
      toast({ title: "Success", description: "Step deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ===== HELPER FUNCTIONS =====
  const resetProfileForm = () => {
    setProfileFormData({
      profileCode: "",
      name: "",
      description: "",
      country: "",
      isActive: true,
    });
  };

  // Condition Record helpers 
  const resetCondRecordForm = () => {
    setCondRecordFormData({
      condition_type_code: "",
      departure_country: "",
      departure_state: "",
      destination_country: "",
      destination_state: "",
      customer_tax_class: "",
      material_tax_class: "",
      tax_profile_id: undefined,
      tax_rule_id: undefined,
    });
  };

  const handleEditCondRecord = (rec: TaxConditionRecord) => {
    setEditingCondRecord(rec);
    setCondRecordFormData({
      condition_type_code: rec.condition_type_code,
      departure_country: rec.departure_country || "",
      departure_state: rec.departure_state || "",
      destination_country: rec.destination_country || "",
      destination_state: rec.destination_state || "",
      customer_tax_class: rec.customer_tax_class || "",
      material_tax_class: rec.material_tax_class || "",
      tax_profile_id: rec.tax_profile_id,
      tax_rule_id: rec.tax_rule_id,
    });
    setCondRecordDialogOpen(true);
  };

  const resetRuleForm = () => {
    setRuleFormData({
      profileId: 0,
      ruleCode: "",
      title: "",
      ratePercent: "",
      jurisdiction: "",
      taxCategoryId: undefined,
      appliesTo: "",
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: "",
      isActive: true,
    });
  };

  const handleEditProfile = (profile: TaxProfile) => {
    setEditingProfile(profile);
    setProfileFormData({
      profileCode: profile.profileCode,
      name: profile.name,
      description: profile.description || "",
      country: profile.country || "",
      isActive: profile.isActive,
    });
    setProfileDialogOpen(true);
  };

  const handleEditRule = (rule: TaxRule) => {
    setEditingRule(rule);
    setRuleFormData({
      profileId: rule.profileId,
      ruleCode: rule.ruleCode,
      title: rule.title,
      ratePercent: rule.ratePercent,
      jurisdiction: rule.jurisdiction || "",
      taxCategoryId: rule.taxCategoryId || undefined,
      appliesTo: rule.appliesTo || "",
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo || "",
      isActive: rule.isActive,
    });
    setRuleDialogOpen(true);
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profileCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.country && p.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRules = rules.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ruleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.jurisdiction && r.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetProcedureForm = () => {
    setProcedureFormData({ procedure_code: "", procedure_name: "", description: "", is_active: true });
  };

  const resetStepForm = () => {
    setStepFormData({ step_number: 10, condition_type_code: "", tax_rule_id: undefined, description: "", from_step: undefined, to_step: undefined, account_key: "", is_statistical: false });
  };

  const handleEditProcedure = (proc: TaxProcedure) => {
    setEditingProcedure(proc);
    setProcedureFormData({
      procedure_code: proc.procedure_code,
      procedure_name: proc.procedure_name,
      description: proc.description || "",
      is_active: proc.is_active,
    });
    setProcedureDialogOpen(true);
  };

  const handleEditStep = (step: TaxProcedureStep) => {
    setEditingStep(step);
    setStepFormData({
      step_number: step.step_number,
      condition_type_code: step.condition_type_code || "",
      tax_rule_id: step.tax_rule_id || undefined,
      description: step.description || "",
      from_step: step.from_step || undefined,
      to_step: step.to_step || undefined,
      account_key: step.account_key || "",
      is_statistical: step.is_statistical,
    });
    setStepDialogOpen(true);
  };

  const filteredProcedures = procedures.filter(p =>
    p.procedure_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.procedure_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
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
          Master Data → Tax Management
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Comprehensive tax configuration for your business
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profiles">
            <FileText className="mr-2 h-4 w-4" />
            Tax Profiles
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Percent className="mr-2 h-4 w-4" />
            Tax Rules
          </TabsTrigger>
          <TabsTrigger value="procedures">
            <ListChecks className="mr-2 h-4 w-4" />
            Tax Procedures
          </TabsTrigger>
          <TabsTrigger value="account-determination">
            <Landmark className="mr-2 h-4 w-4" />
            Account Determination
          </TabsTrigger>
          <TabsTrigger value="condition-records">
            <Globe className="mr-2 h-4 w-4" />
            Condition Records
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TAX PROFILES */}
        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Profiles</CardTitle>
                  <CardDescription>
                    Define tax profile configurations for different countries or regions
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingProfile(null);
                  resetProfileForm();
                  setProfileDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search profiles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loadingProfiles ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.profileCode}</TableCell>
                        <TableCell>{profile.name}</TableCell>
                        <TableCell>
                          {profile.country ? (
                            <div className="flex items-center">
                              <Globe className="mr-1 h-3 w-3" />
                              {profile.country}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.ruleCount && profile.ruleCount > 0 ? "default" : "secondary"}>
                            {profile.ruleCount || 0} rule{profile.ruleCount !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.isActive ? "default" : "secondary"}>
                            {profile.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProfile(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this profile?")) {
                                  deleteProfile.mutate(profile.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProfiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tax profiles found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TAX RULES */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Rules</CardTitle>
                  <CardDescription>
                    Define specific tax rates and calculations for each profile
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingRule(null);
                  resetRuleForm();
                  setRuleDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loadingRules ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Tax Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="font-medium">{rule.profileCode}</div>
                          <div className="text-xs text-muted-foreground">{rule.profileName}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{rule.ruleCode}</TableCell>
                        <TableCell>{rule.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Percent className="mr-1 h-3 w-3" />
                            {parseFloat(rule.ratePercent).toFixed(2)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.jurisdiction || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {rule.taxCategoryName ? `${rule.taxCategoryCode} - ${rule.taxCategoryName}` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRule(rule)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this rule?")) {
                                  deleteRule.mutate(rule.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No tax rules found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TAX PROCEDURES */}
        <TabsContent value="procedures" className="space-y-4">
          {selectedProcedure ? (
            /* STEPS VIEW */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedProcedure(null)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <CardTitle>{selectedProcedure.procedure_code} — {selectedProcedure.procedure_name}</CardTitle>
                    </div>
                    <CardDescription className="ml-10">
                      {selectedProcedure.description || 'Manage procedure steps'}
                    </CardDescription>
                  </div>
                  <Button onClick={() => { resetStepForm(); setEditingStep(null); setStepDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Step</TableHead>
                      <TableHead>Condition Type</TableHead>
                      <TableHead>Tax Rule</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Account Key</TableHead>
                      <TableHead>Statistical</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureSteps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell className="font-mono font-bold">{step.step_number}</TableCell>
                        <TableCell>
                          {step.condition_type_code ? (
                            <div>
                              <span className="font-mono">{step.condition_type_code}</span>
                              {step.condition_name && <span className="text-xs text-muted-foreground ml-1">({step.condition_name})</span>}
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {step.tax_rule_code ? (
                            <div>
                              <span className="font-mono">{step.tax_rule_code}</span>
                              {step.tax_rule_rate && <span className="text-xs text-muted-foreground ml-1">({parseFloat(step.tax_rule_rate).toFixed(2)}%)</span>}
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{step.description || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="font-mono">{step.from_step || '-'}</TableCell>
                        <TableCell className="font-mono">{step.to_step || '-'}</TableCell>
                        <TableCell className="font-mono">{step.account_key || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={step.is_statistical ? 'default' : 'secondary'}>
                            {step.is_statistical ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditStep(step)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this step?')) deleteStep.mutate(step.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {procedureSteps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No steps defined yet. Click "Add Step" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            /* PROCEDURES LIST VIEW */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tax Procedures</CardTitle>
                    <CardDescription>Define tax calculation procedures with ordered steps</CardDescription>
                  </div>
                  <Button onClick={() => { resetProcedureForm(); setEditingProcedure(null); setProcedureDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> New Procedure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProcedures ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProcedures.map((proc) => (
                        <TableRow key={proc.id} className="cursor-pointer" onClick={() => setSelectedProcedure(proc)}>
                          <TableCell className="font-mono font-bold">{proc.procedure_code}</TableCell>
                          <TableCell className="font-medium">{proc.procedure_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{proc.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{proc.step_count || 0} steps</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={proc.is_active ? 'default' : 'secondary'}>
                              {proc.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedProcedure(proc)} title="View steps">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditProcedure(proc)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this procedure and all its steps?')) deleteProcedure.mutate(proc.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredProcedures.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No tax procedures found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: ACCOUNT DETERMINATION */}
        <TabsContent value="account-determination" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Account Determination</CardTitle>
                  <CardDescription>Map Account Keys to GL Accounts per Chart of Accounts</CardDescription>
                </div>
                <Button onClick={() => { resetAcctDetForm(); setEditingAcctDet(null); setAcctDetDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Mapping
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chart of Accounts filter */}
              <div className="flex items-center gap-3">
                <div className="font-medium text-sm text-muted-foreground whitespace-nowrap">Chart of Accounts:</div>
                <Select
                  value={selectedCoaId?.toString() || "__all__"}
                  onValueChange={(v) => setSelectedCoaId(v === "__all__" ? null : Number(v))}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="All Charts of Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Charts of Accounts</SelectItem>
                    {coaList.map((coa: any) => (
                      <SelectItem key={coa.id} value={coa.id.toString()}>
                        {coa.code} — {coa.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingAcctDet ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chart of Accounts</TableHead>
                      <TableHead>Account Key</TableHead>
                      <TableHead>Tax Rule</TableHead>
                      <TableHead>GL Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acctDetList.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <span className="font-mono font-bold">{row.coa_code}</span>
                          <div className="text-xs text-muted-foreground">{row.coa_name}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-bold">{row.account_key}</span>
                          <div className="text-xs text-muted-foreground">{row.account_key_name}</div>
                          <Badge variant="outline" className="text-xs mt-1">{row.account_key_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {row.tax_rule_code ? (
                            <div>
                              <span className="font-mono">{row.tax_rule_code}</span>
                              <div className="text-xs text-muted-foreground">{row.tax_rule_title}</div>
                              {row.tax_rule_rate && <span className="text-xs text-muted-foreground">({parseFloat(row.tax_rule_rate).toFixed(2)}%)</span>}
                            </div>
                          ) : <Badge variant="secondary">All Rules</Badge>}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-bold">{row.gl_account_number}</span>
                          <div className="text-xs text-muted-foreground">{row.gl_account_name}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={row.is_active ? 'default' : 'secondary'}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditAcctDet(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this mapping?')) deleteAcctDet.mutate(row.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {acctDetList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No account determination mappings found. Click "Add Mapping" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILE DIALOG */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? "Edit Tax Profile" : "Create Tax Profile"}
              </DialogTitle>
              <DialogDescription>
                {editingProfile ? "Update the tax profile details" : "Create a new tax profile configuration"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingProfile) {
                updateProfile.mutate({ id: editingProfile.id, data: profileFormData });
              } else {
                createProfile.mutate(profileFormData);
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="profileCode">Profile Code</Label>
                  <Input
                    id="profileCode"
                    placeholder="US01"
                    value={profileFormData.profileCode}
                    onChange={(e) => setProfileFormData({ ...profileFormData, profileCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="United States Standard"
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Standard tax profile for US"
                    value={profileFormData.description}
                    onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={profileFormData.country || ""}
                    onValueChange={(value) => setProfileFormData({ ...profileFormData, country: value === "__none__" ? "" : value })}
                    disabled={countriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countriesLoading ? (
                        <SelectItem value="__loading__" disabled>Loading countries...</SelectItem>
                      ) : countries.length > 0 ? (
                        <>
                          {countries.map((country: any) => (
                            <SelectItem key={country.id} value={country.code}>
                              {country.code} - {country.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__none__">None</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="__none__" disabled>No countries available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={profileFormData.isActive}
                    onChange={(e) => setProfileFormData({ ...profileFormData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProfile ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* RULE DIALOG */}
        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Tax Rule" : "Create Tax Rule"}
              </DialogTitle>
              <DialogDescription>
                {editingRule ? "Update the tax rule details" : "Create a new tax rule for a profile"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingRule) {
                updateRule.mutate({ id: editingRule.id, data: ruleFormData });
              } else {
                createRule.mutate(ruleFormData);
              }
            }}>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="profileId">Profile</Label>
                  <select
                    id="profileId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={ruleFormData.profileId}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, profileId: Number(e.target.value) })}
                    required
                  >
                    <option value="">Select a profile</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.profileCode} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ruleCode">Rule Code</Label>
                  <Input
                    id="ruleCode"
                    placeholder="VAT01"
                    value={ruleFormData.ruleCode}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, ruleCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Standard Value Added Tax"
                    value={ruleFormData.title}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ratePercent">Rate (%)</Label>
                  <Input
                    id="ratePercent"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={ruleFormData.ratePercent}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, ratePercent: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      placeholder="Federal, State"
                      value={ruleFormData.jurisdiction}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, jurisdiction: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="appliesTo">Applies To</Label>
                    <Input
                      id="appliesTo"
                      placeholder="Sales, Services"
                      value={ruleFormData.appliesTo}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, appliesTo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxCategoryId">Tax Category</Label>
                  <Select
                    value={ruleFormData.taxCategoryId?.toString() || "__none__"}
                    onValueChange={(value) => setRuleFormData({ ...ruleFormData, taxCategoryId: value === "__none__" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {taxCategories.map((tc: any) => (
                        <SelectItem key={tc.id} value={tc.id.toString()}>
                          {tc.tax_category_code} - {tc.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={ruleFormData.effectiveFrom}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, effectiveFrom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="effectiveTo">Effective To (optional)</Label>
                    <Input
                      id="effectiveTo"
                      type="date"
                      value={ruleFormData.effectiveTo}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, effectiveTo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActiveRule"
                    checked={ruleFormData.isActive}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isActiveRule">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRule ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* VIEW RULE DIALOG */}
        <Dialog open={!!viewingRule} onOpenChange={(open) => { if (!open) setViewingRule(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tax Rule Details</DialogTitle>
              <DialogDescription>
                Viewing details for rule: {viewingRule?.ruleCode}
              </DialogDescription>
            </DialogHeader>
            {viewingRule && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Profile</Label>
                    <p className="font-medium">{viewingRule.profileCode} - {viewingRule.profileName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rule Code</Label>
                    <p className="font-mono font-medium">{viewingRule.ruleCode}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="font-medium">{viewingRule.title}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate</Label>
                    <p className="font-medium">{parseFloat(viewingRule.ratePercent).toFixed(2)}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Jurisdiction</Label>
                    <p className="font-medium">{viewingRule.jurisdiction || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Applies To</Label>
                    <p className="font-medium">{viewingRule.appliesTo || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax Category</Label>
                    <p className="font-medium">
                      {viewingRule.taxCategoryName
                        ? `${viewingRule.taxCategoryCode} - ${viewingRule.taxCategoryName}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant={viewingRule.isActive ? "default" : "secondary"}>
                        {viewingRule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Effective From</Label>
                    <p className="font-medium">
                      {viewingRule.effectiveFrom
                        ? new Date(viewingRule.effectiveFrom).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Effective To</Label>
                    <p className="font-medium">
                      {viewingRule.effectiveTo
                        ? new Date(viewingRule.effectiveTo).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created At</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewingRule.createdAt
                        ? new Date(viewingRule.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Updated At</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewingRule.updatedAt
                        ? new Date(viewingRule.updatedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingRule(null)}>Close</Button>
              <Button onClick={() => {
                if (viewingRule) {
                  handleEditRule(viewingRule);
                  setViewingRule(null);
                }
              }}>Edit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PROCEDURE DIALOG */}
        <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProcedure ? 'Edit' : 'New'} Tax Procedure</DialogTitle>
              <DialogDescription>Define a tax calculation procedure</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingProcedure) {
                updateProcedure.mutate({ id: editingProcedure.id, data: procedureFormData });
              } else {
                createProcedure.mutate(procedureFormData);
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Procedure Code</Label>
                    <Input
                      value={procedureFormData.procedure_code}
                      onChange={(e) => setProcedureFormData({ ...procedureFormData, procedure_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. TAXINN"
                      disabled={!!editingProcedure}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={procedureFormData.procedure_name}
                      onChange={(e) => setProcedureFormData({ ...procedureFormData, procedure_name: e.target.value })}
                      placeholder="e.g. India GST"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={procedureFormData.description}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isProcedureActive"
                    checked={procedureFormData.is_active}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isProcedureActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProcedureDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingProcedure ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* STEP DIALOG */}
        <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStep ? 'Edit' : 'Add'} Procedure Step</DialogTitle>
              <DialogDescription>Define a step in the tax procedure</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingStep) {
                updateStep.mutate({ stepId: editingStep.id, data: stepFormData });
              } else if (selectedProcedure) {
                createStep.mutate({ procedureId: selectedProcedure.id, data: stepFormData });
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Step Number</Label>
                    <Input
                      type="number"
                      value={stepFormData.step_number}
                      onChange={(e) => setStepFormData({ ...stepFormData, step_number: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>From Step</Label>
                    <Input
                      type="number"
                      value={stepFormData.from_step || ''}
                      onChange={(e) => setStepFormData({ ...stepFormData, from_step: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>To Step</Label>
                    <Input
                      type="number"
                      value={stepFormData.to_step || ''}
                      onChange={(e) => setStepFormData({ ...stepFormData, to_step: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Condition Type</Label>
                    <Select
                      value={stepFormData.condition_type_code || "__none__"}
                      onValueChange={(v) => setStepFormData({ ...stepFormData, condition_type_code: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select condition type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {conditionTypes.map((ct: any) => (
                          <SelectItem key={ct.condition_code} value={ct.condition_code}>
                            {ct.condition_code} — {ct.condition_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax Rule</Label>
                    <Select
                      value={stepFormData.tax_rule_id?.toString() || "__none__"}
                      onValueChange={(v) => setStepFormData({ ...stepFormData, tax_rule_id: v === "__none__" ? undefined : parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select tax rule" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {taxRulesDropdown.map((tr: any) => (
                          <SelectItem key={tr.id} value={tr.id.toString()}>
                            {tr.rule_code} — {tr.title} ({parseFloat(tr.rate_percent).toFixed(2)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={stepFormData.description}
                      onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                      placeholder="Step description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Key</Label>
                    <Select
                      value={stepFormData.account_key || "__none__"}
                      onValueChange={(v) => setStepFormData({ ...stepFormData, account_key: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select account key" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {accountKeysDropdown.map((ak: any) => (
                          <SelectItem key={ak.code} value={ak.code}>
                            {ak.code} — {ak.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isStatistical"
                    checked={stepFormData.is_statistical}
                    onChange={(e) => setStepFormData({ ...stepFormData, is_statistical: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isStatistical">Statistical (informational only, no tax impact)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStepDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingStep ? 'Update' : 'Add Step'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ACCOUNT DETERMINATION DIALOG */}
        <Dialog open={acctDetDialogOpen} onOpenChange={setAcctDetDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAcctDet ? 'Edit' : 'Add'} Account Determination</DialogTitle>
              <DialogDescription>Map an Account Key to a GL Account for tax postings</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingAcctDet) {
                updateAcctDet.mutate({ id: editingAcctDet.id, data: acctDetFormData });
              } else {
                createAcctDet.mutate(acctDetFormData);
              }
            }}>
              <div className="grid gap-4 py-4">
                {/* Chart of Accounts */}
                <div className="grid gap-2">
                  <Label>Chart of Accounts <span className="text-red-500">*</span></Label>
                  <Select
                    value={acctDetFormData.chart_of_accounts_id?.toString() || "__none__"}
                    onValueChange={(v) => setAcctDetFormData({ ...acctDetFormData, chart_of_accounts_id: v === "__none__" ? undefined : Number(v), gl_account_id: undefined })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Chart of Accounts" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {coaList.map((coa: any) => (
                        <SelectItem key={coa.id} value={coa.id.toString()}>
                          {coa.code} — {coa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Account Key */}
                  <div className="grid gap-2">
                    <Label>Account Key <span className="text-red-500">*</span></Label>
                    <Select
                      value={acctDetFormData.account_key || "__none__"}
                      onValueChange={(v) => setAcctDetFormData({ ...acctDetFormData, account_key: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Account Key" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select —</SelectItem>
                        {acctDetAccountKeys.map((ak: any) => (
                          <SelectItem key={ak.code} value={ak.code}>
                            {ak.code} — {ak.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tax Rule (optional) */}
                  <div className="grid gap-2">
                    <Label>Tax Rule <span className="text-muted-foreground text-xs">(Optional — leave blank for all rules)</span></Label>
                    <Select
                      value={acctDetFormData.tax_rule_id?.toString() || "__none__"}
                      onValueChange={(v) => setAcctDetFormData({ ...acctDetFormData, tax_rule_id: v === "__none__" ? undefined : Number(v) })}
                    >
                      <SelectTrigger><SelectValue placeholder="All Tax Rules" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Tax Rules</SelectItem>
                        {acctDetTaxRules.map((tr: any) => (
                          <SelectItem key={tr.id} value={tr.id.toString()}>
                            {tr.profile_code} / {tr.rule_code} — {tr.title} ({parseFloat(tr.rate_percent).toFixed(2)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* GL Account (filtered by CoA) */}
                <div className="grid gap-2">
                  <Label>GL Account <span className="text-red-500">*</span></Label>
                  <Select
                    value={acctDetFormData.gl_account_id?.toString() || "__none__"}
                    onValueChange={(v) => setAcctDetFormData({ ...acctDetFormData, gl_account_id: v === "__none__" ? undefined : Number(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder={acctDetFormData.chart_of_accounts_id ? "Select GL Account" : "Select Chart of Accounts first"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select GL Account —</SelectItem>
                      {acctDetGlAccounts.map((gl: any) => (
                        <SelectItem key={gl.id} value={gl.id.toString()}>
                          {gl.account_number} — {gl.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={acctDetFormData.description}
                    onChange={(e) => setAcctDetFormData({ ...acctDetFormData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAcctDetActive"
                    checked={acctDetFormData.is_active}
                    onChange={(e) => setAcctDetFormData({ ...acctDetFormData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isAcctDetActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAcctDetDialogOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={!acctDetFormData.chart_of_accounts_id || !acctDetFormData.account_key || !acctDetFormData.gl_account_id}
                >
                  {editingAcctDet ? 'Update' : 'Create Mapping'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* TAB 5: CONDITION RECORDS */}
        <TabsContent value="condition-records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Condition Records</CardTitle>
                  <CardDescription>Define tax condition records that map key combinations to Tax Rules</CardDescription>
                </div>
                <Button onClick={() => { setEditingCondRecord(null); resetCondRecordForm(); setCondRecordDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by condition type, country..."
                  value={condRecordSearchTerm}
                  onChange={(e) => setCondRecordSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loadingCondRecords ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition Type</TableHead>
                      <TableHead>Dep. Country</TableHead>
                      <TableHead>Dep. State</TableHead>
                      <TableHead>Dest. Country</TableHead>
                      <TableHead>Dest. State</TableHead>
                      <TableHead>Cust. Class</TableHead>
                      <TableHead>Mat. Class</TableHead>
                      <TableHead>Tax Profile</TableHead>
                      <TableHead>Tax Rule</TableHead>
                      <TableHead>Rate %</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condRecords
                      .filter(r =>
                        r.condition_type_code.toLowerCase().includes(condRecordSearchTerm.toLowerCase()) ||
                        (r.departure_country || "").toLowerCase().includes(condRecordSearchTerm.toLowerCase()) ||
                        (r.destination_country || "").toLowerCase().includes(condRecordSearchTerm.toLowerCase())
                      )
                      .map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell><Badge variant="outline">{rec.condition_type_code}</Badge></TableCell>
                          <TableCell>{rec.departure_country || "—"}</TableCell>
                          <TableCell>{rec.departure_state || "—"}</TableCell>
                          <TableCell>{rec.destination_country || "—"}</TableCell>
                          <TableCell>{rec.destination_state || "—"}</TableCell>
                          <TableCell>{rec.customer_tax_class || "—"}</TableCell>
                          <TableCell>{rec.material_tax_class || "—"}</TableCell>
                          <TableCell>{rec.profile_code || "—"}</TableCell>
                          <TableCell>{rec.tax_rule_code || "—"}</TableCell>
                          <TableCell>{rec.tax_rule_rate ? `${rec.tax_rule_rate}%` : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditCondRecord(rec)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm('Delete this record?')) deleteCondRecord.mutate(rec.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {condRecords.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No condition records yet. Click "New Record" to create one.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* CONDITION RECORDS DIALOG */}
      <Dialog open={condRecordDialogOpen} onOpenChange={(open) => { setCondRecordDialogOpen(open); if (!open) { setEditingCondRecord(null); resetCondRecordForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCondRecord ? "Edit Condition Record" : "New Condition Record"}</DialogTitle>
            <DialogDescription>Map a key combination to a Tax Rule</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              condition_type_code: condRecordFormData.condition_type_code,
              departure_country: condRecordFormData.departure_country || null,
              departure_state: condRecordFormData.departure_state || null,
              destination_country: condRecordFormData.destination_country || null,
              destination_state: condRecordFormData.destination_state || null,
              customer_tax_class: condRecordFormData.customer_tax_class || null,
              material_tax_class: condRecordFormData.material_tax_class || null,
              tax_profile_id: condRecordFormData.tax_profile_id,
              tax_rule_id: condRecordFormData.tax_rule_id,
            };
            if (editingCondRecord) {
              updateCondRecord.mutate({ id: editingCondRecord.id, data: payload });
            } else {
              createCondRecord.mutate(payload);
            }
          }}>
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Condition Type */}
              <div className="space-y-2">
                <Label>Condition Type *</Label>
                <Select value={condRecordFormData.condition_type_code || "__none__"} onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, condition_type_code: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select type —</SelectItem>
                    {(condRecordDropdowns?.conditionTypes || []).map((ct: any) => (
                      <SelectItem key={ct.condition_code} value={ct.condition_code}>{ct.condition_code} - {ct.condition_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Departure Country */}
              <div className="space-y-2">
                <Label>Departure Country (Plant)</Label>
                <Select
                  value={condRecordFormData.departure_country || "__any__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, departure_country: v === "__any__" ? "" : v, departure_state: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any —</SelectItem>
                    {(condRecordDropdowns?.countries || countries).map((c: any) => (
                      <SelectItem key={c.code || c.id} value={c.code}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Departure State - show only when selected country has states */}
              {condRecordFormData.departure_country && (condRecordDropdowns?.states || []).some((s: any) => s.country_code === condRecordFormData.departure_country) && (
                <div className="space-y-2">
                  <Label>Departure State (Plant)</Label>
                  <Select
                    value={condRecordFormData.departure_state || "__any__"}
                    onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, departure_state: v === "__any__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">— Any —</SelectItem>
                      {(condRecordDropdowns?.states || []).filter((s: any) => s.country_code === condRecordFormData.departure_country).map((s: any) => (
                        <SelectItem key={s.state_code} value={s.state_code}>{s.state_code} - {s.state_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Destination Country */}
              <div className="space-y-2">
                <Label>Destination Country (Ship-To)</Label>
                <Select
                  value={condRecordFormData.destination_country || "__any__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, destination_country: v === "__any__" ? "" : v, destination_state: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any —</SelectItem>
                    {(condRecordDropdowns?.countries || countries).map((c: any) => (
                      <SelectItem key={c.code || c.id} value={c.code}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Destination State - show only when selected country has states */}
              {condRecordFormData.destination_country && (condRecordDropdowns?.states || []).some((s: any) => s.country_code === condRecordFormData.destination_country) && (
                <div className="space-y-2">
                  <Label>Destination State (Ship-To)</Label>
                  <Select
                    value={condRecordFormData.destination_state || "__any__"}
                    onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, destination_state: v === "__any__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">— Any —</SelectItem>
                      {(condRecordDropdowns?.states || []).filter((s: any) => s.country_code === condRecordFormData.destination_country).map((s: any) => (
                        <SelectItem key={s.state_code} value={s.state_code}>{s.state_code} - {s.state_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Customer Tax Class */}
              <div className="space-y-2">
                <Label>Customer Tax Class</Label>
                <Select
                  value={condRecordFormData.customer_tax_class || "__any__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, customer_tax_class: v === "__any__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any —</SelectItem>
                    {(condRecordDropdowns?.customerTaxClasses || []).map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Material Tax Class */}
              <div className="space-y-2">
                <Label>Material Tax Class</Label>
                <Select
                  value={condRecordFormData.material_tax_class || "__any__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, material_tax_class: v === "__any__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any —</SelectItem>
                    {(condRecordDropdowns?.materialTaxClasses || []).map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Tax Profile */}
              <div className="space-y-2">
                <Label>Tax Profile *</Label>
                <Select
                  value={condRecordFormData.tax_profile_id?.toString() || "__none__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, tax_profile_id: v === "__none__" ? undefined : Number(v), tax_rule_id: undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Select profile..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select profile —</SelectItem>
                    {(condRecordDropdowns?.taxProfiles || profiles).map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.profileCode || p.profile_code} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Tax Rule */}
              <div className="space-y-2">
                <Label>Tax Rule *</Label>
                <Select
                  value={condRecordFormData.tax_rule_id?.toString() || "__none__"}
                  onValueChange={(v) => setCondRecordFormData({ ...condRecordFormData, tax_rule_id: v === "__none__" ? undefined : Number(v) })}
                  disabled={!condRecordFormData.tax_profile_id}
                >
                  <SelectTrigger><SelectValue placeholder={condRecordFormData.tax_profile_id ? "Select rule..." : "Select profile first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select rule —</SelectItem>
                    {(condRecordDropdowns?.taxRules || rules)
                      .filter((r: any) => !condRecordFormData.tax_profile_id || (r.profileId || r.profile_id) === condRecordFormData.tax_profile_id)
                      .map((r: any) => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.ruleCode || r.rule_code} - {r.title} ({r.ratePercent || r.rate_percent}%)</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCondRecordDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!condRecordFormData.condition_type_code || !condRecordFormData.tax_rule_id}>
                {editingCondRecord ? "Update" : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxManagement;
