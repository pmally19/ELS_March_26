import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
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
  DialogTrigger
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Settings, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Item Category Schema
const itemCategorySchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  category_type: z.enum(["BALANCE_SHEET", "CUSTOMER", "VENDOR", "EXPENSE", "REVENUE", "TAX", "ASSET", "LIABILITY", "EQUITY"]),
});

// Business Transaction Schema
const businessTransactionSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  transaction_type: z.enum(["VENDOR_INVOICE", "CUSTOMER_INVOICE", "PAYMENT", "GL_POSTING", "GOODS_RECEIPT", "GOODS_ISSUE"]),
});

// Splitting Rule Schema
const splittingRuleSchema = z.object({
  business_transaction_id: z.number().int().min(1, "Business transaction is required"),
  business_transaction_variant_id: z.number().int().positive().optional().nullable(),
  splitting_method_id: z.number().int().min(1, "Splitting method is required"),
  rule_name: z.string().min(1, "Rule name is required").max(100),
  description: z.string().optional(),
  source_item_category_id: z.number().int().min(1, "Source item category is required"),
  target_item_category_id: z.number().int().positive().optional().nullable(),
  priority: z.number().int().min(0).default(0),
});

// Characteristic Schema
const characteristicSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  characteristic_type: z.enum(["PROFIT_CENTER", "BUSINESS_AREA", "SEGMENT", "COST_CENTER"]),
  field_name: z.string().min(1, "Field name is required").max(50),
  requires_zero_balance: z.boolean().default(false),
  is_mandatory: z.boolean().default(false),
});

// Splitting Method Schema
const splittingMethodSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  method_type: z.enum(["ACTIVE", "PASSIVE", "ZERO_BALANCE"]),
});

// Document Type Mapping Schema
const documentTypeMappingSchema = z.object({
  document_type: z.string().min(1, "Document type is required").max(10),
  business_transaction_id: z.number().int().positive("Business transaction is required"),
  business_transaction_variant_id: z.number().int().positive().optional().nullable(),
  company_code_id: z.number().int().positive().optional().nullable(),
});

// Zero Balance Account Schema
const zeroBalanceAccountSchema = z.object({
  ledger_id: z.number().int().positive("Ledger is required"),
  company_code_id: z.number().int().positive().optional().nullable(),
  gl_account_number: z.string().min(1, "GL account number is required").max(20),
  description: z.string().optional(),
});

// Activation Schema
const activationSchema = z.object({
  ledger_id: z.number().int().min(1, "Ledger is required"),
  company_code_id: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
  enable_inheritance: z.boolean().default(true),
  enable_standard_assignment: z.boolean().default(true),
  splitting_method_id: z.number().int().positive().optional().nullable(),
});

export default function DocumentSplitting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("item-categories");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Edit state for each entity type
  const [editingItemCategory, setEditingItemCategory] = useState<any | null>(null);
  const [editingBusinessTransaction, setEditingBusinessTransaction] = useState<any | null>(null);
  const [editingSplittingRule, setEditingSplittingRule] = useState<any | null>(null);
  const [editingCharacteristic, setEditingCharacteristic] = useState<any | null>(null);
  const [editingZeroBalance, setEditingZeroBalance] = useState<any | null>(null);
  const [editingActivation, setEditingActivation] = useState<any | null>(null);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [editingDocumentTypeMapping, setEditingDocumentTypeMapping] = useState<any | null>(null);

  // Dialog open state
  const [itemCategoryDialogOpen, setItemCategoryDialogOpen] = useState(false);
  const [businessTransactionDialogOpen, setBusinessTransactionDialogOpen] = useState(false);
  const [splittingRuleDialogOpen, setSplittingRuleDialogOpen] = useState(false);
  const [characteristicDialogOpen, setCharacteristicDialogOpen] = useState(false);
  const [zeroBalanceDialogOpen, setZeroBalanceDialogOpen] = useState(false);
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [documentTypeMappingDialogOpen, setDocumentTypeMappingDialogOpen] = useState(false);

  // Item Categories
  const { data: itemCategories = [], refetch: refetchItemCategories } = useQuery({
    queryKey: ["/api/master-data/document-splitting/item-categories"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/item-categories?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching item categories:", error);
        return [];
      }
    },
  });

  // Business Transactions
  const { data: businessTransactions = [], refetch: refetchBusinessTransactions } = useQuery({
    queryKey: ["/api/master-data/document-splitting/business-transactions"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/business-transactions?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching business transactions:", error);
        return [];
      }
    },
  });

  // Splitting Rules
  const { data: splittingRules = [], refetch: refetchSplittingRules } = useQuery({
    queryKey: ["/api/master-data/document-splitting/rules"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/rules?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching splitting rules:", error);
        return [];
      }
    },
  });

  // Characteristics
  const { data: characteristics = [], refetch: refetchCharacteristics } = useQuery({
    queryKey: ["/api/master-data/document-splitting/characteristics"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/characteristics?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching characteristics:", error);
        return [];
      }
    },
  });

  // Splitting Methods
  const { data: splittingMethods = [], refetch: refetchMethods } = useQuery({
    queryKey: ["/api/master-data/document-splitting/methods"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/methods");
        return response || [];
      } catch (error) {
        console.error("Error fetching splitting methods:", error);
        return [];
      }
    },
  });

  // Document Type Mappings
  const { data: documentTypeMappings = [], refetch: refetchDocumentTypeMappings } = useQuery({
    queryKey: ["/api/master-data/document-splitting/document-type-mappings"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/document-type-mappings");
        return response || [];
      } catch (error) {
        console.error("Error fetching document type mappings:", error);
        return [];
      }
    },
  });

  // Company Codes for document type mapping
  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/company-code");
        return response || [];
      } catch (error) {
        console.error("Error fetching company codes:", error);
        return [];
      }
    },
  });

  // Ledgers for activation
  const { data: ledgers = [] } = useQuery({
    queryKey: ["/api/master-data/ledgers"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/ledgers?active=true");
        return response || [];
      } catch (error) {
        console.error("Error fetching ledgers:", error);
        return [];
      }
    },
  });

  // Activation Settings
  const { data: activationSettings = [], refetch: refetchActivation } = useQuery({
    queryKey: ["/api/master-data/document-splitting/activation"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/activation");
        return response || [];
      } catch (error) {
        console.error("Error fetching activation settings:", error);
        return [];
      }
    },
  });

  // Zero Balance Accounts
  const { data: zeroBalanceAccounts = [], refetch: refetchZeroBalance } = useQuery({
    queryKey: ["/api/master-data/document-splitting/zero-balance-accounts"],
    queryFn: async () => {
      try {
        const response = await apiGet<any[]>("/api/master-data/document-splitting/zero-balance-accounts");
        return response || [];
      } catch (error) {
        console.error("Error fetching zero balance accounts:", error);
        return [];
      }
    },
  });

  // Item Category Form
  const itemCategoryForm = useForm({
    resolver: zodResolver(itemCategorySchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category_type: "BALANCE_SHEET" as const,
    },
  });

  const createItemCategory = useMutation({
    mutationFn: async (data: z.infer<typeof itemCategorySchema>) => {
      return apiPost("/api/master-data/document-splitting/item-categories", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item category created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/item-categories"] });
      itemCategoryForm.reset();
      setEditingItemCategory(null);
      setItemCategoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item category",
        variant: "destructive"
      });
    },
  });

  const updateItemCategory = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof itemCategorySchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/item-categories/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item category updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/item-categories"] });
      itemCategoryForm.reset();
      setEditingItemCategory(null);
      setItemCategoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item category",
        variant: "destructive"
      });
    },
  });

  const deleteItemCategory = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/item-categories/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/item-categories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item category",
        variant: "destructive"
      });
    },
  });

  // Business Transaction Form
  const businessTransactionForm = useForm({
    resolver: zodResolver(businessTransactionSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      transaction_type: "VENDOR_INVOICE" as const,
    },
  });

  const createBusinessTransaction = useMutation({
    mutationFn: async (data: z.infer<typeof businessTransactionSchema>) => {
      return apiPost("/api/master-data/document-splitting/business-transactions", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business transaction created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/business-transactions"] });
      businessTransactionForm.reset();
      setEditingBusinessTransaction(null);
      setBusinessTransactionDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create business transaction",
        variant: "destructive"
      });
    },
  });

  const updateBusinessTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof businessTransactionSchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/business-transactions/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business transaction updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/business-transactions"] });
      businessTransactionForm.reset();
      setEditingBusinessTransaction(null);
      setBusinessTransactionDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business transaction",
        variant: "destructive"
      });
    },
  });

  const deleteBusinessTransaction = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/business-transactions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business transaction deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/business-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete business transaction",
        variant: "destructive"
      });
    },
  });

  // Splitting Rule Form
  const splittingRuleForm = useForm({
    resolver: zodResolver(splittingRuleSchema),
    defaultValues: {
      business_transaction_id: 0,
      business_transaction_variant_id: undefined,
      splitting_method_id: 0,
      rule_name: "",
      description: "",
      source_item_category_id: 0,
      target_item_category_id: undefined,
      priority: 0,
    },
  });

  const createSplittingRule = useMutation({
    mutationFn: async (data: z.infer<typeof splittingRuleSchema>) => {
      return apiPost("/api/master-data/document-splitting/rules", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting rule created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/rules"] });
      splittingRuleForm.reset();
      setEditingSplittingRule(null);
      setSplittingRuleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create splitting rule",
        variant: "destructive"
      });
    },
  });

  const updateSplittingRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof splittingRuleSchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/rules/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting rule updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/rules"] });
      splittingRuleForm.reset();
      setEditingSplittingRule(null);
      setSplittingRuleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update splitting rule",
        variant: "destructive"
      });
    },
  });

  const deleteSplittingRule = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/rules/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting rule deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete splitting rule",
        variant: "destructive"
      });
    },
  });

  // Characteristic Form
  const characteristicForm = useForm({
    resolver: zodResolver(characteristicSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      characteristic_type: "PROFIT_CENTER" as const,
      field_name: "",
      requires_zero_balance: false,
      is_mandatory: false,
    },
  });

  const createCharacteristic = useMutation({
    mutationFn: async (data: z.infer<typeof characteristicSchema>) => {
      return apiPost("/api/master-data/document-splitting/characteristics", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Characteristic created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/characteristics"] });
      characteristicForm.reset();
      setEditingCharacteristic(null);
      setCharacteristicDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create characteristic",
        variant: "destructive"
      });
    },
  });

  const updateCharacteristic = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof characteristicSchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/characteristics/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Characteristic updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/characteristics"] });
      characteristicForm.reset();
      setEditingCharacteristic(null);
      setCharacteristicDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update characteristic",
        variant: "destructive"
      });
    },
  });

  const deleteCharacteristic = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/characteristics/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Characteristic deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/characteristics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete characteristic",
        variant: "destructive"
      });
    },
  });

  // Zero Balance Account Form
  const zeroBalanceForm = useForm({
    resolver: zodResolver(zeroBalanceAccountSchema),
    defaultValues: {
      ledger_id: 0,
      company_code_id: undefined,
      gl_account_number: "",
      description: "",
    },
  });

  const createZeroBalanceAccount = useMutation({
    mutationFn: async (data: z.infer<typeof zeroBalanceAccountSchema>) => {
      return apiPost("/api/master-data/document-splitting/zero-balance-accounts", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zero balance account created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/zero-balance-accounts"] });
      zeroBalanceForm.reset();
      setEditingZeroBalance(null);
      setZeroBalanceDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create zero balance account",
        variant: "destructive"
      });
    },
  });

  const updateZeroBalanceAccount = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof zeroBalanceAccountSchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/zero-balance-accounts/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zero balance account updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/zero-balance-accounts"] });
      zeroBalanceForm.reset();
      setEditingZeroBalance(null);
      setZeroBalanceDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update zero balance account",
        variant: "destructive"
      });
    },
  });

  const deleteZeroBalanceAccount = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/zero-balance-accounts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zero balance account deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/zero-balance-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete zero balance account",
        variant: "destructive"
      });
    },
  });

  // Activation Form
  const activationForm = useForm({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      ledger_id: 0,
      company_code_id: undefined,
      is_active: true,
      enable_inheritance: true,
      enable_standard_assignment: true,
      splitting_method_id: undefined,
    },
  });

  const createActivation = useMutation({
    mutationFn: async (data: z.infer<typeof activationSchema>) => {
      return apiPost("/api/master-data/document-splitting/activation", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Activation setting created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/activation"] });
      activationForm.reset();
      setEditingActivation(null);
      setActivationDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activation setting",
        variant: "destructive"
      });
    },
  });

  const updateActivation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof activationSchema> }) => {
      return apiPut(`/api/master-data/document-splitting/activation/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Activation setting updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/activation"] });
      activationForm.reset();
      setEditingActivation(null);
      setActivationDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update activation setting",
        variant: "destructive"
      });
    },
  });

  const deleteActivation = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/activation/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Activation setting deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/activation"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activation setting",
        variant: "destructive"
      });
    },
  });

  // Handlers for Activation
  const handleEditActivation = (activation: any) => {
    setEditingActivation(activation);
    activationForm.reset({
      ledger_id: activation.ledger_id || activation.ledgerId || 0,
      company_code_id: activation.company_code_id || activation.companyCodeId || undefined,
      is_active: activation.is_active !== undefined ? activation.is_active : activation.isActive !== undefined ? activation.isActive : true,
      enable_inheritance: activation.enable_inheritance !== undefined ? activation.enable_inheritance : activation.enableInheritance !== undefined ? activation.enableInheritance : true,
      enable_standard_assignment: activation.enable_standard_assignment !== undefined ? activation.enable_standard_assignment : activation.enableStandardAssignment !== undefined ? activation.enableStandardAssignment : true,
      splitting_method_id: activation.splitting_method_id || activation.splittingMethodId || undefined,
    });
    setActivationDialogOpen(true);
  };

  const handleDeleteActivation = (id: number) => {
    if (window.confirm("Are you sure you want to delete this activation setting?")) {
      deleteActivation.mutate(id);
    }
  };

  // Splitting Method Form
  const methodForm = useForm({
    resolver: zodResolver(splittingMethodSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      method_type: "ACTIVE" as const,
    },
  });

  const createMethod = useMutation({
    mutationFn: async (data: z.infer<typeof splittingMethodSchema>) => {
      return apiPost("/api/master-data/document-splitting/methods", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting method created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/methods"] });
      methodForm.reset();
      setEditingMethod(null);
      setMethodDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create splitting method",
        variant: "destructive"
      });
    },
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof splittingMethodSchema> & { is_active?: boolean } }) => {
      return apiPut(`/api/master-data/document-splitting/methods/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting method updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/methods"] });
      methodForm.reset();
      setEditingMethod(null);
      setMethodDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update splitting method",
        variant: "destructive"
      });
    },
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/methods/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Splitting method deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/methods"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete splitting method",
        variant: "destructive"
      });
    },
  });

  // Document Type Mapping Form
  const documentTypeMappingForm = useForm({
    resolver: zodResolver(documentTypeMappingSchema),
    defaultValues: {
      document_type: "",
      business_transaction_id: 0,
      business_transaction_variant_id: undefined,
      company_code_id: undefined,
    },
  });

  const createDocumentTypeMapping = useMutation({
    mutationFn: async (data: z.infer<typeof documentTypeMappingSchema>) => {
      return apiPost("/api/master-data/document-splitting/document-type-mappings", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document type mapping created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/document-type-mappings"] });
      documentTypeMappingForm.reset();
      setEditingDocumentTypeMapping(null);
      setDocumentTypeMappingDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create document type mapping",
        variant: "destructive"
      });
    },
  });

  const updateDocumentTypeMapping = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof documentTypeMappingSchema> }) => {
      return apiPut(`/api/master-data/document-splitting/document-type-mappings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document type mapping updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/document-type-mappings"] });
      documentTypeMappingForm.reset();
      setEditingDocumentTypeMapping(null);
      setDocumentTypeMappingDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update document type mapping",
        variant: "destructive"
      });
    },
  });

  const deleteDocumentTypeMapping = useMutation({
    mutationFn: async (id: number) => {
      return apiDelete(`/api/master-data/document-splitting/document-type-mappings/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document type mapping deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-splitting/document-type-mappings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document type mapping",
        variant: "destructive"
      });
    },
  });

  // Handlers for Item Categories
  const handleEditItemCategory = (category: any) => {
    setEditingItemCategory(category);
    itemCategoryForm.reset({
      code: category.code,
      name: category.name,
      description: category.description || "",
      category_type: category.category_type,
    });
    setItemCategoryDialogOpen(true);
  };

  const handleDeleteItemCategory = (id: number) => {
    if (window.confirm("Are you sure you want to delete this item category?")) {
      deleteItemCategory.mutate(id);
    }
  };

  // Handlers for Business Transactions
  const handleEditBusinessTransaction = (transaction: any) => {
    setEditingBusinessTransaction(transaction);
    businessTransactionForm.reset({
      code: transaction.code,
      name: transaction.name,
      description: transaction.description || "",
      transaction_type: transaction.transaction_type,
    });
    setBusinessTransactionDialogOpen(true);
  };

  const handleDeleteBusinessTransaction = (id: number) => {
    if (window.confirm("Are you sure you want to delete this business transaction?")) {
      deleteBusinessTransaction.mutate(id);
    }
  };

  // Handlers for Splitting Methods
  const handleEditMethod = (method: any) => {
    setEditingMethod(method);
    methodForm.reset({
      code: method.code,
      name: method.name,
      description: method.description || "",
      method_type: method.method_type,
    });
    setMethodDialogOpen(true);
  };

  const handleDeleteMethod = (id: number) => {
    if (window.confirm("Are you sure you want to delete this splitting method?")) {
      deleteMethod.mutate(id);
    }
  };

  // Handlers for Document Type Mappings
  const handleEditDocumentTypeMapping = (mapping: any) => {
    setEditingDocumentTypeMapping(mapping);
    documentTypeMappingForm.reset({
      document_type: mapping.document_type,
      business_transaction_id: mapping.business_transaction_id,
      business_transaction_variant_id: mapping.business_transaction_variant_id || undefined,
      company_code_id: mapping.company_code_id || undefined,
    });
    setDocumentTypeMappingDialogOpen(true);
  };

  const handleDeleteDocumentTypeMapping = (id: number) => {
    if (window.confirm("Are you sure you want to delete this document type mapping?")) {
      deleteDocumentTypeMapping.mutate(id);
    }
  };

  // Handlers for Splitting Rules
  const handleEditSplittingRule = (rule: any) => {
    setEditingSplittingRule(rule);
    splittingRuleForm.reset({
      business_transaction_id: rule.business_transaction_id,
      business_transaction_variant_id: rule.business_transaction_variant_id,
      splitting_method_id: rule.splitting_method_id,
      rule_name: rule.rule_name,
      description: rule.description || "",
      source_item_category_id: rule.source_item_category_id,
      target_item_category_id: rule.target_item_category_id,
      priority: rule.priority || 0,
    });
    setSplittingRuleDialogOpen(true);
  };

  const handleDeleteSplittingRule = (id: number) => {
    if (window.confirm("Are you sure you want to delete this splitting rule?")) {
      deleteSplittingRule.mutate(id);
    }
  };

  // Handlers for Characteristics
  const handleEditCharacteristic = (char: any) => {
    setEditingCharacteristic(char);
    characteristicForm.reset({
      code: char.code,
      name: char.name,
      description: char.description || "",
      characteristic_type: char.characteristic_type,
      field_name: char.field_name,
      requires_zero_balance: char.requires_zero_balance || false,
      is_mandatory: char.is_mandatory || false,
    });
    setCharacteristicDialogOpen(true);
  };

  const handleDeleteCharacteristic = (id: number) => {
    if (window.confirm("Are you sure you want to delete this characteristic?")) {
      deleteCharacteristic.mutate(id);
    }
  };

  // Handlers for Zero Balance Accounts
  const handleEditZeroBalance = (account: any) => {
    setEditingZeroBalance(account);
    zeroBalanceForm.reset({
      ledger_id: account.ledger_id,
      company_code_id: account.company_code_id || undefined,
      gl_account_number: account.gl_account_number || account.account_number || "",
      description: account.description || "",
    });
    setZeroBalanceDialogOpen(true);
  };

  const handleDeleteZeroBalance = (id: number) => {
    if (window.confirm("Are you sure you want to delete this zero balance account?")) {
      deleteZeroBalanceAccount.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Document Splitting Configuration</h1>
            <p className="text-muted-foreground">
              Configure document splitting rules, item categories, and characteristics
            </p>
          </div>
        </div>
        <Button onClick={() => {
          refetchItemCategories();
          refetchBusinessTransactions();
          refetchSplittingRules();
          refetchCharacteristics();
          refetchActivation();
          refetchZeroBalance();
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="item-categories">Item Categories</TabsTrigger>
          <TabsTrigger value="business-transactions">Business Transactions</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="document-type-mappings">Doc Type Mapping</TabsTrigger>
          <TabsTrigger value="rules">Splitting Rules</TabsTrigger>
          <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
          <TabsTrigger value="zero-balance">Zero Balance</TabsTrigger>
          <TabsTrigger value="activation">Activation</TabsTrigger>
        </TabsList>

        {/* Item Categories Tab */}
        <TabsContent value="item-categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Item Categories</CardTitle>
                  <CardDescription>
                    Classify GL accounts for document splitting
                  </CardDescription>
                </div>
                <Dialog open={itemCategoryDialogOpen} onOpenChange={(open) => {
                  setItemCategoryDialogOpen(open);
                  if (!open) {
                    setEditingItemCategory(null);
                    itemCategoryForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingItemCategory(null);
                      itemCategoryForm.reset();
                      setItemCategoryDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingItemCategory ? "Edit Item Category" : "Create Item Category"}</DialogTitle>
                      <DialogDescription>
                        {editingItemCategory ? "Update the item category details" : "Define a new item category for classifying GL accounts"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...itemCategoryForm}>
                      <form onSubmit={itemCategoryForm.handleSubmit((data) => {
                        if (editingItemCategory) {
                          updateItemCategory.mutate({ id: editingItemCategory.id, data: { ...data, is_active: editingItemCategory.is_active } });
                        } else {
                          createItemCategory.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={itemCategoryForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="01000" />
                              </FormControl>
                              <FormDescription>Unique code for this item category</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemCategoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Balance Sheet Account" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemCategoryForm.control}
                          name="category_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="BALANCE_SHEET">Balance Sheet</SelectItem>
                                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                                  <SelectItem value="VENDOR">Vendor</SelectItem>
                                  <SelectItem value="EXPENSE">Expense</SelectItem>
                                  <SelectItem value="REVENUE">Revenue</SelectItem>
                                  <SelectItem value="TAX">Tax</SelectItem>
                                  <SelectItem value="ASSET">Asset</SelectItem>
                                  <SelectItem value="LIABILITY">Liability</SelectItem>
                                  <SelectItem value="EQUITY">Equity</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemCategoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createItemCategory.isPending || updateItemCategory.isPending}>
                            {createItemCategory.isPending || updateItemCategory.isPending
                              ? (editingItemCategory ? "Updating..." : "Creating...")
                              : (editingItemCategory ? "Update" : "Create")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemCategories.map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono">{category.code}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.category_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditItemCategory(category)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteItemCategory(category.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Splitting Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Splitting Methods</CardTitle>
                  <CardDescription>
                    Define splitting methods (ACTIVE, PASSIVE, ZERO_BALANCE)
                  </CardDescription>
                </div>
                <Dialog open={methodDialogOpen} onOpenChange={(open) => {
                  setMethodDialogOpen(open);
                  if (!open) {
                    setEditingMethod(null);
                    methodForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingMethod(null);
                      methodForm.reset();
                      setMethodDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingMethod ? "Edit Splitting Method" : "Create Splitting Method"}</DialogTitle>
                      <DialogDescription>
                        {editingMethod ? "Update the splitting method details" : "Define a new splitting method"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...methodForm}>
                      <form onSubmit={methodForm.handleSubmit((data) => {
                        if (editingMethod) {
                          updateMethod.mutate({ id: editingMethod.id, data: { ...data, is_active: editingMethod.is_active } });
                        } else {
                          createMethod.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={methodForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input placeholder="ACTIVE" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={methodForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Active Splitting" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={methodForm.control}
                          name="method_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Method Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select method type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ACTIVE">ACTIVE - Active Splitting</SelectItem>
                                  <SelectItem value="PASSIVE">PASSIVE - Passive Splitting</SelectItem>
                                  <SelectItem value="ZERO_BALANCE">ZERO_BALANCE - Zero Balance Splitting</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={methodForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Description of the splitting method" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setMethodDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingMethod ? "Update" : "Create"} Method
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Method Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splittingMethods.map((method: any) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.code}</TableCell>
                      <TableCell>{method.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{method.method_type}</Badge>
                      </TableCell>
                      <TableCell>{method.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditMethod(method)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteMethod(method.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Type Mapping Tab */}
        <TabsContent value="document-type-mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Type Mappings</CardTitle>
                  <CardDescription>
                    Map document types (KR, SA, etc.) to business transactions
                  </CardDescription>
                </div>
                <Dialog open={documentTypeMappingDialogOpen} onOpenChange={(open) => {
                  setDocumentTypeMappingDialogOpen(open);
                  if (!open) {
                    setEditingDocumentTypeMapping(null);
                    documentTypeMappingForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingDocumentTypeMapping(null);
                      documentTypeMappingForm.reset();
                      setDocumentTypeMappingDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingDocumentTypeMapping ? "Edit Document Type Mapping" : "Create Document Type Mapping"}</DialogTitle>
                      <DialogDescription>
                        {editingDocumentTypeMapping ? "Update the document type mapping" : "Map a document type to a business transaction"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...documentTypeMappingForm}>
                      <form onSubmit={documentTypeMappingForm.handleSubmit((data) => {
                        if (editingDocumentTypeMapping) {
                          updateDocumentTypeMapping.mutate({ id: editingDocumentTypeMapping.id, data });
                        } else {
                          createDocumentTypeMapping.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={documentTypeMappingForm.control}
                          name="document_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Document Type</FormLabel>
                              <FormControl>
                                <Input placeholder="KR" {...field} />
                              </FormControl>
                              <FormDescription>Document type code (e.g., KR for vendor invoice, SA for customer invoice)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={documentTypeMappingForm.control}
                          name="business_transaction_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Transaction</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select business transaction" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {businessTransactions.map((bt: any) => (
                                    <SelectItem key={bt.id} value={bt.id.toString()}>
                                      {bt.code} - {bt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={documentTypeMappingForm.control}
                          name="company_code_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Code (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company code (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">All Company Codes</SelectItem>
                                  {companyCodes.map((cc: any) => (
                                    <SelectItem key={cc.id} value={cc.id.toString()}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Leave as "All Company Codes" for global mapping</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setDocumentTypeMappingDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingDocumentTypeMapping ? "Update" : "Create"} Mapping
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Business Transaction</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentTypeMappings.map((mapping: any) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.document_type}</TableCell>
                      <TableCell>
                        {mapping.business_transaction_code} - {mapping.business_transaction_name}
                      </TableCell>
                      <TableCell>{mapping.company_code_id ? `${mapping.company_code_id}` : "All"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditDocumentTypeMapping(mapping)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocumentTypeMapping(mapping.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Transactions Tab */}
        <TabsContent value="business-transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Business Transactions</CardTitle>
                  <CardDescription>
                    Define business transaction types for document splitting
                  </CardDescription>
                </div>
                <Dialog open={businessTransactionDialogOpen} onOpenChange={(open) => {
                  setBusinessTransactionDialogOpen(open);
                  if (!open) {
                    setEditingBusinessTransaction(null);
                    businessTransactionForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingBusinessTransaction(null);
                      businessTransactionForm.reset();
                      setBusinessTransactionDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Business Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingBusinessTransaction ? "Edit Business Transaction" : "Create Business Transaction"}</DialogTitle>
                      <DialogDescription>
                        {editingBusinessTransaction ? "Update the business transaction details" : "Define a new business transaction type"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...businessTransactionForm}>
                      <form onSubmit={businessTransactionForm.handleSubmit((data) => {
                        if (editingBusinessTransaction) {
                          updateBusinessTransaction.mutate({ id: editingBusinessTransaction.id, data: { ...data, is_active: editingBusinessTransaction.is_active } });
                        } else {
                          createBusinessTransaction.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={businessTransactionForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="VENDOR_INV" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={businessTransactionForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Vendor Invoice" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={businessTransactionForm.control}
                          name="transaction_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transaction Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select transaction type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="VENDOR_INVOICE">Vendor Invoice</SelectItem>
                                  <SelectItem value="CUSTOMER_INVOICE">Customer Invoice</SelectItem>
                                  <SelectItem value="PAYMENT">Payment</SelectItem>
                                  <SelectItem value="GL_POSTING">GL Posting</SelectItem>
                                  <SelectItem value="GOODS_RECEIPT">Goods Receipt</SelectItem>
                                  <SelectItem value="GOODS_ISSUE">Goods Issue</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={businessTransactionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createBusinessTransaction.isPending || updateBusinessTransaction.isPending}>
                            {createBusinessTransaction.isPending || updateBusinessTransaction.isPending
                              ? (editingBusinessTransaction ? "Updating..." : "Creating...")
                              : (editingBusinessTransaction ? "Update" : "Create")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessTransactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono">{transaction.code}</TableCell>
                      <TableCell>{transaction.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.transaction_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.is_active ? "default" : "secondary"}>
                          {transaction.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditBusinessTransaction(transaction)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteBusinessTransaction(transaction.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Splitting Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Splitting Rules</CardTitle>
                  <CardDescription>
                    Define rules that determine how documents are split
                  </CardDescription>
                </div>
                <Dialog open={splittingRuleDialogOpen} onOpenChange={(open) => {
                  setSplittingRuleDialogOpen(open);
                  if (!open) {
                    setEditingSplittingRule(null);
                    splittingRuleForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingSplittingRule(null);
                      splittingRuleForm.reset();
                      setSplittingRuleDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Splitting Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingSplittingRule ? "Edit Splitting Rule" : "Create Splitting Rule"}</DialogTitle>
                      <DialogDescription>
                        {editingSplittingRule ? "Update the splitting rule details" : "Define a rule for splitting documents"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...splittingRuleForm}>
                      <form onSubmit={splittingRuleForm.handleSubmit(
                        (data) => {
                          console.log('Form submitted with data:', data);
                          if (editingSplittingRule) {
                            updateSplittingRule.mutate({ id: editingSplittingRule.id, data: { ...data, is_active: editingSplittingRule.is_active } });
                          } else {
                            createSplittingRule.mutate(data);
                          }
                        },
                        (errors) => {
                          console.error('Form validation errors:', errors);
                        }
                      )} className="space-y-4">
                        <FormField
                          control={splittingRuleForm.control}
                          name="business_transaction_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Transaction</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value && field.value > 0 ? field.value.toString() : ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select business transaction" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {businessTransactions.map((bt: any) => (
                                    <SelectItem key={bt.id} value={bt.id.toString()}>
                                      {bt.code} - {bt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="splitting_method_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Splitting Method</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value && field.value > 0 ? field.value.toString() : ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select splitting method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {splittingMethods.map((method: any) => (
                                    <SelectItem key={method.id} value={method.id.toString()}>
                                      {method.code} - {method.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="rule_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rule Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Split Vendor Balance by Profit Center" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="source_item_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source Item Category</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value && field.value > 0 ? field.value.toString() : ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source item category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {itemCategories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                      {cat.code} - {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Item category that will be split
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="target_item_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Item Category (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  if (value === "none") {
                                    field.onChange(undefined);
                                  } else {
                                    field.onChange(parseInt(value));
                                  }
                                }}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select target item category (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None - Derive from all assigned items</SelectItem>
                                  {itemCategories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                      {cat.code} - {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Item category from which to derive account assignment (leave empty to derive from all items)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  value={field.value}
                                />
                              </FormControl>
                              <FormDescription>
                                Higher priority rules are evaluated first
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={splittingRuleForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createSplittingRule.isPending || updateSplittingRule.isPending}>
                            {createSplittingRule.isPending || updateSplittingRule.isPending
                              ? (editingSplittingRule ? "Updating..." : "Creating...")
                              : (editingSplittingRule ? "Update" : "Create")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Business Transaction</TableHead>
                    <TableHead>Source Category</TableHead>
                    <TableHead>Target Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splittingRules.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.rule_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.business_transaction_code}</Badge>
                      </TableCell>
                      <TableCell>{rule.source_item_category_code}</TableCell>
                      <TableCell>{rule.target_item_category_code || "All"}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditSplittingRule(rule)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSplittingRule(rule.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Characteristics Tab */}
        <TabsContent value="characteristics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Characteristics</CardTitle>
                  <CardDescription>
                    Define characteristics used for document splitting (Profit Center, Business Area, Segment, etc.)
                  </CardDescription>
                </div>
                <Dialog open={characteristicDialogOpen} onOpenChange={(open) => {
                  setCharacteristicDialogOpen(open);
                  if (!open) {
                    setEditingCharacteristic(null);
                    characteristicForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCharacteristic(null);
                      characteristicForm.reset();
                      setCharacteristicDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Characteristic
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingCharacteristic ? "Edit Characteristic" : "Create Characteristic"}</DialogTitle>
                      <DialogDescription>
                        {editingCharacteristic ? "Update the characteristic details" : "Define a new splitting characteristic"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...characteristicForm}>
                      <form onSubmit={characteristicForm.handleSubmit((data) => {
                        if (editingCharacteristic) {
                          updateCharacteristic.mutate({ id: editingCharacteristic.id, data: { ...data, is_active: editingCharacteristic.is_active } });
                        } else {
                          createCharacteristic.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={characteristicForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="PROFIT_CENTER" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={characteristicForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Profit Center" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={characteristicForm.control}
                          name="characteristic_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Characteristic Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select characteristic type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="PROFIT_CENTER">Profit Center</SelectItem>
                                  <SelectItem value="BUSINESS_AREA">Business Area</SelectItem>
                                  <SelectItem value="SEGMENT">Segment</SelectItem>
                                  <SelectItem value="COST_CENTER">Cost Center</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={characteristicForm.control}
                          name="field_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="profit_center" />
                              </FormControl>
                              <FormDescription>
                                Database field name (e.g., profit_center, business_area, segment)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-4">
                          <FormField
                            control={characteristicForm.control}
                            name="requires_zero_balance"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Requires Zero Balance</FormLabel>
                                  <FormDescription>Enable zero balancing for this characteristic</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={characteristicForm.control}
                            name="is_mandatory"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Mandatory</FormLabel>
                                  <FormDescription>This characteristic is mandatory</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={characteristicForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createCharacteristic.isPending || updateCharacteristic.isPending}>
                            {createCharacteristic.isPending || updateCharacteristic.isPending
                              ? (editingCharacteristic ? "Updating..." : "Creating...")
                              : (editingCharacteristic ? "Update" : "Create")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Zero Balance</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {characteristics.map((char: any) => (
                    <TableRow key={char.id}>
                      <TableCell className="font-mono">{char.code}</TableCell>
                      <TableCell>{char.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{char.characteristic_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{char.field_name}</TableCell>
                      <TableCell>
                        <Badge variant={char.requires_zero_balance ? "default" : "secondary"}>
                          {char.requires_zero_balance ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={char.is_mandatory ? "default" : "secondary"}>
                          {char.is_mandatory ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditCharacteristic(char)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCharacteristic(char.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zero Balance Accounts Tab */}
        <TabsContent value="zero-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zero Balance Clearing Accounts</CardTitle>
                  <CardDescription>
                    Configure zero balance clearing accounts for each ledger
                  </CardDescription>
                </div>
                <Dialog open={zeroBalanceDialogOpen} onOpenChange={(open) => {
                  setZeroBalanceDialogOpen(open);
                  if (!open) {
                    setEditingZeroBalance(null);
                    zeroBalanceForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingZeroBalance(null);
                      zeroBalanceForm.reset();
                      setZeroBalanceDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Zero Balance Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingZeroBalance ? "Edit Zero Balance Account" : "Configure Zero Balance Account"}</DialogTitle>
                      <DialogDescription>
                        Set the GL account to use for zero balancing when documents need automatic balancing
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...zeroBalanceForm}>
                      <form onSubmit={zeroBalanceForm.handleSubmit((data) => {
                        if (editingZeroBalance) {
                          updateZeroBalanceAccount.mutate({ id: editingZeroBalance.id, data: { ...data, is_active: editingZeroBalance.is_active } });
                        } else {
                          createZeroBalanceAccount.mutate(data);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={zeroBalanceForm.control}
                          name="ledger_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ledger</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value ? field.value.toString() : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select ledger" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ledgers.map((ledger: any) => (
                                    <SelectItem key={ledger.id} value={ledger.id.toString()}>
                                      {ledger.code} - {ledger.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={zeroBalanceForm.control}
                          name="company_code_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Code (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company code (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">All Company Codes</SelectItem>
                                  {companyCodes.map((cc: any) => (
                                    <SelectItem key={cc.id} value={cc.id.toString()}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Leave as "All Company Codes" for global configuration</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={zeroBalanceForm.control}
                          name="gl_account_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GL Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="999999" {...field} maxLength={20} />
                              </FormControl>
                              <FormDescription>Enter the GL account number to use for zero balancing</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={zeroBalanceForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Zero balance clearing account" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setZeroBalanceDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createZeroBalanceAccount.isPending || updateZeroBalanceAccount.isPending}>
                            {createZeroBalanceAccount.isPending || updateZeroBalanceAccount.isPending
                              ? (editingZeroBalance ? "Updating..." : "Creating...")
                              : (editingZeroBalance ? "Update" : "Create")} Account
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zeroBalanceAccounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.ledger_code}</TableCell>
                      <TableCell>{account.company_code_id || "All"}</TableCell>
                      <TableCell className="font-mono">{account.gl_account_number}</TableCell>
                      <TableCell>{account.account_name}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditZeroBalance(account)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteZeroBalance(account.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activation Tab */}
        <TabsContent value="activation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activation Settings</CardTitle>
                  <CardDescription>
                    Activate document splitting for ledgers and configure settings
                  </CardDescription>
                </div>
                <Dialog open={activationDialogOpen} onOpenChange={(open) => {
                  setActivationDialogOpen(open);
                  if (!open) {
                    setEditingActivation(null);
                    activationForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingActivation(null);
                      activationForm.reset();
                      setActivationDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Configure Activation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingActivation ? "Edit Activation Setting" : "Configure Document Splitting Activation"}</DialogTitle>
                      <DialogDescription>
                        Enable document splitting for a ledger and configure options
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...activationForm}>
                      <form onSubmit={activationForm.handleSubmit(
                        (data) => {
                          console.log('Activation form submitted with data:', data);
                          if (editingActivation) {
                            updateActivation.mutate({ id: editingActivation.id, data });
                          } else {
                            createActivation.mutate(data);
                          }
                        },
                        (errors) => {
                          console.error('Activation form validation errors:', errors);
                        }
                      )} className="space-y-4">
                        <FormField
                          control={activationForm.control}
                          name="ledger_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ledger</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value && field.value > 0 ? field.value.toString() : ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select ledger" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ledgers.map((ledger: any) => (
                                    <SelectItem key={ledger.id} value={ledger.id.toString()}>
                                      {ledger.code} - {ledger.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={activationForm.control}
                          name="company_code_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Code (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company code (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">All Company Codes</SelectItem>
                                  {companyCodes.map((cc: any) => (
                                    <SelectItem key={cc.id} value={cc.id.toString()}>
                                      {cc.code} - {cc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Leave as "All Company Codes" for global activation</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={activationForm.control}
                          name="splitting_method_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Splitting Method (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                                value={field.value ? field.value.toString() : "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select splitting method (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">Default Method</SelectItem>
                                  {splittingMethods.map((method: any) => (
                                    <SelectItem key={method.id} value={method.id.toString()}>
                                      {method.code} - {method.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Optional: Select a default splitting method for this ledger</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={activationForm.control}
                            name="is_active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Active</FormLabel>
                                  <FormDescription>
                                    Enable document splitting
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={activationForm.control}
                            name="enable_inheritance"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Inheritance</FormLabel>
                                  <FormDescription>
                                    Enable inheritance
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={activationForm.control}
                            name="enable_standard_assignment"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Standard Assignment</FormLabel>
                                  <FormDescription>
                                    Enable standard assignment
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setActivationDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createActivation.isPending || updateActivation.isPending}>
                            {createActivation.isPending || updateActivation.isPending
                              ? (editingActivation ? "Updating..." : "Creating...")
                              : (editingActivation ? "Update" : "Create")} Activation
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Inheritance</TableHead>
                    <TableHead>Standard Assignment</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activationSettings.map((activation: any) => (
                    <TableRow key={activation.id}>
                      <TableCell>{activation.ledger_code}</TableCell>
                      <TableCell>{activation.company_code || "All"}</TableCell>
                      <TableCell>
                        <Badge variant={activation.is_active ? "default" : "secondary"}>
                          {activation.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={activation.enable_inheritance ? "default" : "secondary"}>
                          {activation.enable_inheritance ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={activation.enable_standard_assignment ? "default" : "secondary"}>
                          {activation.enable_standard_assignment ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>{activation.method_code || "N/A"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditActivation(activation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteActivation(activation.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

