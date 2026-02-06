import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Eye, Search, MoreHorizontal, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface AccountDeterminationMapping {
    id: number;
    account_key_code: string;
    account_key_name?: string;
    account_type?: string;
    business_scenario: string;
    sales_area_id: number | null;
    sales_org_code?: string;
    distribution_channel_code?: string;
    division_code?: string;
    customer_assignment_group_id?: number | null;
    customer_assignment_group_code?: string;
    customer_assignment_group_name?: string;
    material_assignment_group_id?: number | null;
    material_assignment_group_code?: string;
    material_assignment_group_name?: string;
    condition_type_id?: number | null;
    condition_type_code?: string;
    condition_type_name?: string;
    gl_account_id: number;
    account_number?: string;
    account_name?: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface AssignmentGroup {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
}

interface AccountKey {
    id: number;
    code: string;
    name: string;
    account_type: string;
}

interface SalesArea {
    id: number;
    sales_org_code: string;
    distribution_channel_code: string;
    division_code: string;
    sales_org_name?: string;
    distribution_channel_name?: string;
    division_name?: string;
}

interface GLAccount {
    id: number;
    account_number: string;
    account_name: string;
}

interface ConditionType {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
}

const mappingSchema = z.object({
    account_key_code: z.string().min(1, "Account key is required"),
    business_scenario: z.string().min(1, "Business scenario is required").max(100),
    sales_area_id: z.number().nullable().optional(),
    customer_assignment_group_id: z.number().nullable().optional(),
    material_assignment_group_id: z.number().nullable().optional(),
    condition_type_id: z.number().nullable().optional(),
    gl_account_id: z.number().min(1, "GL account is required"),
    description: z.string().optional(),
    is_active: z.boolean(),
});

type MappingFormValues = z.infer<typeof mappingSchema>;

const accountTypeColors: Record<string, string> = {
    Revenue: "bg-green-100 text-green-800",
    Expense: "bg-red-100 text-red-800",
    Tax: "bg-blue-100 text-blue-800",
    Liability: "bg-orange-100 text-orange-800",
    Asset: "bg-purple-100 text-purple-800",
    Discount: "bg-yellow-100 text-yellow-800",
};

export default function AccountDeterminationMapping() {
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<AccountDeterminationMapping | null>(null);
    const [viewingMapping, setViewingMapping] = useState<AccountDeterminationMapping | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterActive, setFilterActive] = useState<string>("all");
    const [filterSalesArea, setFilterSalesArea] = useState<string>("all");
    const [selectedSalesAreaId, setSelectedSalesAreaId] = useState<number | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch mappings
    const { data: mappings = [], isLoading, refetch } = useQuery<AccountDeterminationMapping[]>({
        queryKey: ["/api/master-data/account-determination-mapping", filterActive, filterSalesArea],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterActive !== "all") {
                params.append("is_active", filterActive);
            }
            if (filterSalesArea !== "all") {
                params.append("sales_area_id", filterSalesArea);
            }
            const response = await apiRequest(`/api/master-data/account-determination-mapping?${params.toString()}`);
            return await response.json();
        },
    });

    // Fetch account keys
    const { data: accountKeys = [] } = useQuery<AccountKey[]>({
        queryKey: ["/api/master-data/account-keys-active"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/account-keys?is_active=true");
            return await response.json();
        },
    });

    // Fetch sales areas
    const { data: salesAreas = [] } = useQuery<SalesArea[]>({
        queryKey: ["/api/master-data/sales-areas"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/sales-areas?is_active=true");
            return await response.json();
        },
    });

    // Fetch customer assignment groups
    const { data: customerAssignmentGroups = [] } = useQuery<AssignmentGroup[]>({
        queryKey: ["/api/master-data/customer-account-assignment-groups"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/customer-account-assignment-groups?active=true");
            return await response.json();
        },
    });

    // Fetch material assignment groups
    const { data: materialAssignmentGroups = [] } = useQuery<AssignmentGroup[]>({
        queryKey: ["/api/master-data/material-account-assignment-groups"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/material-account-assignment-groups?active=true");
            return await response.json();
        },
    });

    // Fetch GL accounts filtered by selected sales area's chart of accounts
    const { data: glAccounts = [] } = useQuery<GLAccount[]>({
        queryKey: ["/api/master-data/gl-accounts-by-sales-area", selectedSalesAreaId],
        queryFn: async () => {
            if (!selectedSalesAreaId) {
                // Return all GL accounts if no sales area selected
                const response = await apiRequest("/api/master-data/gl-accounts?is_active=true");
                return await response.json();
            }
            const response = await apiRequest(`/api/master-data/sales-areas/gl-accounts/${selectedSalesAreaId}`);
            return await response.json();
        },
        enabled: true,
    });

    // Fetch condition types from SD
    const { data: conditionTypes = [] } = useQuery<ConditionType[]>({
        queryKey: ["/api/sales-distribution/condition-types"],
        queryFn: async () => {
            const response = await apiRequest("/api/sales-distribution/condition-types");
            const data = await response.json();
            console.log("Condition types API response:", data); // Debug log
            // Handle both snake_case and camelCase from API
            const filtered = Array.isArray(data)
                ? data.filter((ct: any) => ct.is_active !== false && ct.isActive !== false)
                : [];
            console.log("Filtered condition types:", filtered); // Debug log
            return filtered;
        },
    });

    const form = useForm<MappingFormValues>({
        resolver: zodResolver(mappingSchema),
        defaultValues: {
            account_key_code: "",
            business_scenario: "",
            sales_area_id: null,
            customer_assignment_group_id: null,
            material_assignment_group_id: null,
            gl_account_id: 0,
            description: "",
            is_active: true,
        },
    });

    useEffect(() => {
        if (editingMapping) {
            form.reset({
                account_key_code: editingMapping.account_key_code,
                business_scenario: editingMapping.business_scenario,
                sales_area_id: editingMapping.sales_area_id,
                customer_assignment_group_id: editingMapping.customer_assignment_group_id,
                material_assignment_group_id: editingMapping.material_assignment_group_id,
                gl_account_id: editingMapping.gl_account_id,
                description: editingMapping.description || "",
                is_active: editingMapping.is_active,
            });
            setSelectedSalesAreaId(editingMapping.sales_area_id);
        } else {
            form.reset({
                account_key_code: "",
                business_scenario: "",
                sales_area_id: null,
                customer_assignment_group_id: null,
                material_assignment_group_id: null,
                gl_account_id: 0,
                description: "",
                is_active: true,
            });
            setSelectedSalesAreaId(null);
        }
    }, [editingMapping, form]);

    const createMutation = useMutation({
        mutationFn: async (data: MappingFormValues) => {
            const response = await apiRequest("/api/master-data/account-determination-mapping", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create mapping");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-determination-mapping"] });
            toast({
                title: "Success",
                description: "Account determination mapping created successfully",
            });
            setOpen(false);
            setEditingMapping(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create mapping",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: MappingFormValues }) => {
            const response = await apiRequest(`/api/master-data/account-determination-mapping/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update mapping");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-determination-mapping"] });
            toast({
                title: "Success",
                description: "Account determination mapping updated successfully",
            });
            setOpen(false);
            setEditingMapping(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update mapping",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/account-determination-mapping/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete mapping");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-determination-mapping"] });
            toast({
                title: "Success",
                description: "Account determination mapping deleted successfully",
            });
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete mapping",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: MappingFormValues) => {
        if (editingMapping) {
            updateMutation.mutate({ id: editingMapping.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const filteredMappings = mappings.filter((mapping) => {
        const salesOrgInfo = mapping.sales_org_code && mapping.distribution_channel_code && mapping.division_code
            ? `${mapping.sales_org_code}-${mapping.distribution_channel_code}-${mapping.division_code}`
            : "";
        const matchesSearch =
            mapping.account_key_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mapping.business_scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
            salesOrgInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mapping.account_key_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (mapping.account_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesSearch;
    });

    const handleEdit = (mapping: AccountDeterminationMapping) => {
        setEditingMapping(mapping);
        setOpen(true);
    };

    const handleView = (mapping: AccountDeterminationMapping) => {
        setViewingMapping(mapping);
        setViewOpen(true);
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest mappings...",
        });
        await refetch();
        toast({
            title: "Data Refreshed",
            description: "Account determination mappings have been updated successfully.",
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
                        <h1 className="text-2xl font-bold">Account Determination Mapping</h1>
                        <p className="text-sm text-muted-foreground">
                            Map account keys to GL accounts based on business scenarios and company codes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Mapping
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search mappings..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterSalesArea} onValueChange={setFilterSalesArea}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Filter by sales area" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sales Areas</SelectItem>
                        {salesAreas.map((salesArea) => (
                            <SelectItem key={salesArea.id} value={salesArea.id.toString()}>
                                {salesArea.sales_org_code}-{salesArea.distribution_channel_code}-{salesArea.division_code}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterActive} onValueChange={setFilterActive}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="true">Active Only</SelectItem>
                        <SelectItem value="false">Inactive Only</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} title="Refresh data">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Determination Mappings</CardTitle>
                    <CardDescription>
                        GL account assignment rules for automatic account posting
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Acc. Key</TableHead>
                                        <TableHead className="hidden lg:table-cell">Key Name</TableHead>
                                        <TableHead>Business Scenario</TableHead>
                                        <TableHead className="hidden md:table-cell">Sales Area</TableHead>
                                        <TableHead className="hidden xl:table-cell">Cust. Group</TableHead>
                                        <TableHead className="hidden xl:table-cell">Mat. Group</TableHead>
                                        <TableHead>GL Account</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMappings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24">
                                                No mappings found. {searchQuery ? "Try a different search." : "Create your first mapping."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMappings.map((mapping) => (
                                            <TableRow key={mapping.id}>
                                                <TableCell className="font-medium font-mono">{mapping.account_key_code}</TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div>
                                                        <div className="font-medium">{mapping.account_key_name}</div>
                                                        {mapping.account_type && (
                                                            <Badge className={`text-xs ${accountTypeColors[mapping.account_type]}`}>
                                                                {mapping.account_type}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{mapping.business_scenario}</TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div>
                                                        {mapping.sales_area_id ? (
                                                            <div className="font-medium font-mono">
                                                                {mapping.sales_org_code}-{mapping.distribution_channel_code}-{mapping.division_code}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground">N/A</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell">
                                                    <div>
                                                        {mapping.customer_assignment_group_id ? (
                                                            <div className="font-medium font-mono">
                                                                {mapping.customer_assignment_group_code}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground">-</div>
                                                        )}
                                                        {mapping.customer_assignment_group_name && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={mapping.customer_assignment_group_name}>
                                                                {mapping.customer_assignment_group_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell">
                                                    <div>
                                                        {mapping.material_assignment_group_id ? (
                                                            <div className="font-medium font-mono">
                                                                {mapping.material_assignment_group_code}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground">-</div>
                                                        )}
                                                        {mapping.material_assignment_group_name && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={mapping.material_assignment_group_name}>
                                                                {mapping.material_assignment_group_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium font-mono">{mapping.account_number}</div>
                                                        <div className="text-sm text-muted-foreground">{mapping.account_name}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={mapping.is_active ? "default" : "secondary"}
                                                        className={mapping.is_active ? "bg-green-500" : ""}
                                                    >
                                                        {mapping.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="More actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleView(mapping)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(mapping)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteId(mapping.id)}
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
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMapping ? "Edit Account Determination Mapping" : "Create Account Determination Mapping"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingMapping
                                ? "Update the mapping details below"
                                : "Create a new GL account assignment rule"}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 px-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="account_key_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Key *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!!editingMapping}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account key" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {accountKeys.map((key) => (
                                                        <SelectItem key={key.id} value={key.code}>
                                                            {key.code} - {key.name} ({key.account_type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Account key for GL posting (e.g., ERL, MWS)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="sales_area_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sales Area</FormLabel>
                                            <Select
                                                onValueChange={(value) => {
                                                    const numValue = (value === "null" || !value) ? null : parseInt(value);
                                                    field.onChange(numValue);
                                                    setSelectedSalesAreaId(numValue);
                                                }}
                                                value={field.value?.toString() ?? "null"}
                                                disabled={!!editingMapping}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select sales area (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">None</SelectItem>
                                                    {salesAreas.map((salesArea) => (
                                                        <SelectItem key={salesArea.id} value={salesArea.id.toString()}>
                                                            {salesArea.sales_org_code}-{salesArea.distribution_channel_code}-{salesArea.division_code}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Select a sales area to filter GL accounts by chart of accounts
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="customer_assignment_group_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer Assignment Group</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                                                value={field.value?.toString() ?? "null"}
                                                disabled={!!editingMapping}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select customer group (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">None</SelectItem>
                                                    {customerAssignmentGroups.map((group) => (
                                                        <SelectItem key={group.id} value={group.id.toString()}>
                                                            {group.code} - {group.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                For specific customer assignment groups
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="material_assignment_group_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Material Assignment Group</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                                                value={field.value?.toString() ?? "null"}
                                                disabled={!!editingMapping}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select material group (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">None</SelectItem>
                                                    {materialAssignmentGroups.map((group) => (
                                                        <SelectItem key={group.id} value={group.id.toString()}>
                                                            {group.code} - {group.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                For specific material assignment groups
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="condition_type_id"
                                render={({ field }) => {
                                    console.log("Rendering condition type dropdown, available types:", conditionTypes.length);
                                    return (
                                        <FormItem>
                                            <FormLabel>Condition Type</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                                                value={field.value?.toString() ?? "null"}
                                                disabled={!!editingMapping}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={`Select condition type (${conditionTypes.length} available)`} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">None</SelectItem>
                                                    {conditionTypes.length === 0 && (
                                                        <SelectItem value="empty" disabled>
                                                            No condition types available
                                                        </SelectItem>
                                                    )}
                                                    {conditionTypes.map((type) => (
                                                        <SelectItem key={type.id} value={type.id.toString()}>
                                                            {type.code} - {type.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                For specific pricing condition types
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />

                            <FormField
                                control={form.control}
                                name="business_scenario"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Business Scenario *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Domestic Sales, Export Sales, Returns"
                                                {...field}
                                                disabled={!!editingMapping}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Scenario for which this mapping applies (free text for now)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="gl_account_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GL Account *</FormLabel>
                                        <Select
                                            onValueChange={(value) => field.onChange(parseInt(value))}
                                            value={field.value ? field.value.toString() : ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select GL account" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {glAccounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id.toString()}>
                                                        {account.account_number} - {account.account_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            GL account to post to for this mapping
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
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Optional description explaining this mapping rule"
                                                {...field}
                                                rows={3}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Explain when and why this mapping is used
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active</FormLabel>
                                            <FormDescription>
                                                Is this mapping active and available for use?
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => {
                                    setOpen(false);
                                    setEditingMapping(null);
                                    form.reset();
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingMapping ? "Update" : "Create")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mapping Details</DialogTitle>
                        <DialogDescription>View account determination mapping information</DialogDescription>
                    </DialogHeader>
                    {viewingMapping && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Account Key</label>
                                <p className="text-sm font-medium font-mono">
                                    {viewingMapping.account_key_code} - {viewingMapping.account_key_name}
                                </p>
                                {viewingMapping.account_type && (
                                    <Badge className={`mt-1 ${accountTypeColors[viewingMapping.account_type]}`}>
                                        {viewingMapping.account_type}
                                    </Badge>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Business Scenario</label>
                                <p className="text-sm">{viewingMapping.business_scenario}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Sales Area</label>
                                <p className="text-sm font-mono">
                                    {viewingMapping.sales_area_id ? (
                                        `${viewingMapping.sales_org_code}-${viewingMapping.distribution_channel_code}-${viewingMapping.division_code}`
                                    ) : (
                                        "N/A"
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Customer Assignment Group</label>
                                <p className="text-sm font-mono">
                                    {viewingMapping.customer_assignment_group_id ? (
                                        `${viewingMapping.customer_assignment_group_code} - ${viewingMapping.customer_assignment_group_name}`
                                    ) : (
                                        "N/A"
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Material Assignment Group</label>
                                <p className="text-sm font-mono">
                                    {viewingMapping.material_assignment_group_id ? (
                                        `${viewingMapping.material_assignment_group_code} - ${viewingMapping.material_assignment_group_name}`
                                    ) : (
                                        "N/A"
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">GL Account</label>
                                <p className="text-sm font-mono">
                                    {viewingMapping.account_number} - {viewingMapping.account_name}
                                </p>
                            </div>
                            {viewingMapping.description && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="text-sm">{viewingMapping.description}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <Badge variant={viewingMapping.is_active ? "default" : "secondary"} className={viewingMapping.is_active ? "bg-green-500" : ""}>
                                        {viewingMapping.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            {viewingMapping.created_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                    <p className="text-sm">{new Date(viewingMapping.created_at).toLocaleString()}</p>
                                </div>
                            )}
                            {viewingMapping.updated_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                                    <p className="text-sm">{new Date(viewingMapping.updated_at).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account determination mapping.
                            {deleteId && mappings.find(m => m.id === deleteId) && (
                                <span className="block mt-2 font-medium">
                                    Mapping: {mappings.find(m => m.id === deleteId)?.account_key_code} / {mappings.find(m => m.id === deleteId)?.business_scenario}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteId) {
                                    handleDelete(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
