import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowLeft, Search, Plus, Edit, Trash2, RefreshCw, Download,
    FileUp, MoreHorizontal, Info, Tag, DollarSign, Calendar, Building
} from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

// ─── Schema ────────────────────────────────────────────────────────────────────
const conditionRecordSchema = z.object({
    condition_type: z.string().min(1, "Condition Type is required").max(4),
    material_id: z.string().optional(),
    customer_id: z.string().optional(),
    sales_organization: z.string().optional(),
    distribution_channel: z.string().max(2).optional(),
    amount: z.coerce.number().min(0.01, "Amount must be > 0"),
    currency: z.string().max(3).default("USD"),
    per: z.coerce.number().min(1).default(1),
    unit: z.string().max(3).optional(),
    valid_from: z.string().min(1, "Valid From is required"),
    valid_to: z.string().default("2099-12-31"),
    is_active: z.boolean().default(true),
});

type ConditionRecordFormValues = z.infer<typeof conditionRecordSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ConditionRecords() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [keyCombination, setKeyCombination] = useState<string>("customer_material");
    const [activeTab, setActiveTab] = useState("key");

    // Detail view state
    const [viewingRecord, setViewingRecord] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: records = [], isLoading, refetch } = useQuery({
        queryKey: ["/api/condition-records"],
    });

    const { data: conditionTypes = [] } = useQuery({ queryKey: ["/api/condition-types"] });
    const { data: salesOrgs = [] } = useQuery({ queryKey: ["/api/master-data/sales-organization"] });
    const { data: distChannels = [] } = useQuery({ queryKey: ["/api/master-data/distribution-channels"] });
    const { data: customers = [] } = useQuery({ queryKey: ["/api/master-data/customer"] });
    const { data: materials = [] } = useQuery({ queryKey: ["/api/master-data/material"] });
    const { data: currencies = [] } = useQuery({ queryKey: ["/api/master-data/currency"] });
    const { data: units = [] } = useQuery({ queryKey: ["/api/master-data/units-of-measure"] });

    // ─── Form ─────────────────────────────────────────────────────────────────
    const form = useForm<ConditionRecordFormValues>({
        resolver: zodResolver(conditionRecordSchema),
        defaultValues: {
            condition_type: "PR00",
            amount: 0,
            currency: "USD",
            per: 1,
            unit: "PC",
            valid_from: new Date().toISOString().split("T")[0],
            valid_to: "2099-12-31",
            is_active: true,
        },
    });

    // ─── Mutations ────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: async (data: ConditionRecordFormValues) => {
            const res = await apiRequest("/api/condition-records", {
                method: "POST",
                body: JSON.stringify({
                    ...data,
                    material_id: data.material_id ? parseInt(data.material_id) : null,
                    customer_id: data.customer_id ? parseInt(data.customer_id) : null,
                }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/condition-records"] });
            toast({ title: "Condition Record Created" });
            setShowDialog(false);
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: ConditionRecordFormValues }) => {
            const res = await apiRequest(`/api/condition-records/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...data,
                    material_id: data.material_id ? parseInt(data.material_id) : null,
                    customer_id: data.customer_id ? parseInt(data.customer_id) : null,
                }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/condition-records"] });
            toast({ title: "Condition Record Updated" });
            setShowDialog(false);
            setEditingRecord(null);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/condition-records/${id}`, { method: "DELETE" });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/condition-records"] });
            toast({ title: "Condition Record Deleted" });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const onSubmit = (data: ConditionRecordFormValues) => {
        if (editingRecord) {
            updateMutation.mutate({ id: editingRecord.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (record: any) => {
        setEditingRecord(record);
        let detectedCombo = "base";
        if (record.customer_id && record.material_id) detectedCombo = "customer_material";
        else if (record.customer_id) detectedCombo = "customer";
        else if (record.material_id) detectedCombo = "material";
        setKeyCombination(detectedCombo);

        form.reset({
            condition_type: record.condition_type,
            material_id: record.material_id?.toString() || "",
            customer_id: record.customer_id?.toString() || "",
            sales_organization: record.sales_organization || "",
            distribution_channel: record.distribution_channel || "",
            amount: Number(record.amount),
            currency: record.currency || "USD",
            per: record.per || 1,
            unit: record.unit || "",
            valid_from: record.valid_from ? new Date(record.valid_from).toISOString().split("T")[0] : "",
            valid_to: record.valid_to ? new Date(record.valid_to).toISOString().split("T")[0] : "",
            is_active: record.is_active,
        });
        setActiveTab("key");
        setShowDialog(true);
    };

    const openNewDialog = () => {
        setEditingRecord(null);
        setKeyCombination("customer_material");
        form.reset({
            condition_type: "PR00",
            amount: 0,
            currency: "USD",
            per: 1,
            unit: "PC",
            valid_from: new Date().toISOString().split("T")[0],
            valid_to: "2099-12-31",
            is_active: true,
        });
        setActiveTab("key");
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this Condition Record?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleRefresh = async () => {
        toast({ title: "Refreshing Data", description: "Loading latest condition records..." });
        await refetch();
        toast({ title: "Data Refreshed", description: "Condition records updated successfully." });
    };

    const handleExport = () => {
        if (filteredRecords.length === 0) {
            toast({ title: "No Data to Export", description: "No condition records to export.", variant: "destructive" });
            return;
        }

        const exportData = filteredRecords.map((r: any) => ({
            "Condition Type": r.condition_type || "",
            "Sales Organization": r.sales_organization || "",
            "Distribution Channel": r.distribution_channel || "",
            "Customer ID": r.customer_id || "",
            "Material ID": r.material_id || "",
            "Amount": Number(r.amount).toFixed(2),
            "Currency": r.currency || "",
            "Per": r.per || 1,
            "Unit": r.unit || "",
            "Valid From": r.valid_from ? new Date(r.valid_from).toLocaleDateString() : "",
            "Valid To": r.valid_to ? new Date(r.valid_to).toLocaleDateString() : "",
            "Status": r.is_active ? "Active" : "Inactive",
        }));

        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(","),
            ...exportData.map((row: any) => headers.map((h) => `"${row[h]}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `condition-records-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export Successful", description: `Exported ${filteredRecords.length} condition records.` });
    };

    // ─── Filter ───────────────────────────────────────────────────────────────
    const filteredRecords = (records as any[]).filter((r: any) => {
        const s = searchQuery.toLowerCase();
        return (
            r.condition_type?.toLowerCase().includes(s) ||
            r.sales_organization?.toLowerCase().includes(s) ||
            r.distribution_channel?.toLowerCase().includes(s) ||
            r.customer_id?.toString().includes(s) ||
            r.material_id?.toString().includes(s)
        );
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getCustomerName = (id: any) => {
        if (!id) return "-";
        const c = (customers as any[]).find((x: any) => x.id === parseInt(id));
        return c ? `${c.customerNumber || c.id} - ${c.name}` : id;
    };

    const getMaterialName = (id: any) => {
        if (!id) return "-";
        const m = (materials as any[]).find((x: any) => x.id === parseInt(id));
        return m ? `${m.code || m.id} - ${m.name || m.description}` : id;
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Condition Records</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage pricing, discounts, and surcharges for sales conditions
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button size="sm" onClick={openNewDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Record
                    </Button>
                </div>
            </div>

            {/* ── Table Card ── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search condition records..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Badge variant="outline" className="ml-auto">
                            {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Condition Type</TableHead>
                                <TableHead>Sales Org</TableHead>
                                <TableHead>Dist. Channel</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Material</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Valid From</TableHead>
                                <TableHead>Valid To</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                                        Loading records...
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="font-medium">No condition records found</p>
                                        <p className="text-sm mt-1">Create your first condition record to get started</p>
                                        <Button size="sm" className="mt-4" onClick={openNewDialog}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Record
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecords.map((record: any) => (
                                    <TableRow key={record.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                                {record.condition_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{record.sales_organization || "-"}</TableCell>
                                        <TableCell>{record.distribution_channel || "-"}</TableCell>
                                        <TableCell className="max-w-[140px] truncate">{getCustomerName(record.customer_id)}</TableCell>
                                        <TableCell className="max-w-[140px] truncate">{getMaterialName(record.material_id)}</TableCell>
                                        <TableCell className="font-medium">
                                            {Number(record.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} {record.currency}
                                            <span className="text-muted-foreground text-xs ml-1">/ {record.per} {record.unit}</span>
                                        </TableCell>
                                        <TableCell>{record.valid_from ? new Date(record.valid_from).toLocaleDateString() : "-"}</TableCell>
                                        <TableCell>{record.valid_to ? new Date(record.valid_to).toLocaleDateString() : "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={record.is_active ? "default" : "secondary"}>
                                                {record.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setViewingRecord(record); setIsDetailOpen(true); }}>
                                                        <Info className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(record)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(record.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
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
                </CardContent>
            </Card>

            {/* ── Detail View Dialog ── */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-blue-600" />
                            Condition Record Details
                        </DialogTitle>
                        <DialogDescription>
                            {viewingRecord?.condition_type} — Full details for this pricing condition
                        </DialogDescription>
                    </DialogHeader>
                    {viewingRecord && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> Condition Type</p>
                                    <p className="font-semibold">{viewingRecord.condition_type}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Amount</p>
                                    <p className="font-semibold">{Number(viewingRecord.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} {viewingRecord.currency}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Building className="h-3 w-3" /> Sales Organization</p>
                                    <p className="font-semibold">{viewingRecord.sales_organization || "—"}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1">Distribution Channel</p>
                                    <p className="font-semibold">{viewingRecord.distribution_channel || "—"}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1">Customer</p>
                                    <p className="font-semibold">{getCustomerName(viewingRecord.customer_id)}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1">Material</p>
                                    <p className="font-semibold">{getMaterialName(viewingRecord.material_id)}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Valid From</p>
                                    <p className="font-semibold">{viewingRecord.valid_from ? new Date(viewingRecord.valid_from).toLocaleDateString() : "—"}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Valid To</p>
                                    <p className="font-semibold">{viewingRecord.valid_to ? new Date(viewingRecord.valid_to).toLocaleDateString() : "—"}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1">Per / Unit</p>
                                    <p className="font-semibold">{viewingRecord.per} {viewingRecord.unit}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs mb-1">Status</p>
                                    <Badge variant={viewingRecord.is_active ? "default" : "secondary"}>
                                        {viewingRecord.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                        <Button onClick={() => { setIsDetailOpen(false); handleEdit(viewingRecord); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Create / Edit Dialog ── */}
            <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setEditingRecord(null); }}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRecord ? "Edit Condition Record" : "Create Condition Record"}
                        </DialogTitle>
                        <DialogDescription>
                            Define pricing, discounts, and surcharges based on combinations of Sales Org, Customer, and Material.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="key">Key Combination</TabsTrigger>
                                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                                    <TabsTrigger value="validity">Validity</TabsTrigger>
                                </TabsList>

                                {/* ── Tab 1: Key Combination ── */}
                                <TabsContent value="key" className="space-y-4 min-h-[280px]">
                                    {!editingRecord && (
                                        <div className="p-4 bg-muted/40 rounded-lg border">
                                            <FormLabel className="text-sm font-semibold mb-2 block">Access Sequence (Key Combination)</FormLabel>
                                            <Select
                                                value={keyCombination}
                                                onValueChange={(val) => {
                                                    setKeyCombination(val);
                                                    if (val === "material") form.setValue("customer_id", "");
                                                    if (val === "customer") form.setValue("material_id", "");
                                                    if (val === "base") {
                                                        form.setValue("customer_id", "");
                                                        form.setValue("material_id", "");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full bg-white">
                                                    <SelectValue placeholder="Select key combination..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="customer_material">Customer / Material</SelectItem>
                                                    <SelectItem value="material">Material (Standard Price)</SelectItem>
                                                    <SelectItem value="customer">Customer (Specific Price)</SelectItem>
                                                    <SelectItem value="base">Base Price (Sales Org / Dist. Channel only)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="condition_type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Condition Type *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Array.isArray(conditionTypes) && conditionTypes.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.condition_code}>
                                                                {t.condition_code} - {t.condition_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="sales_organization" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sales Organization</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select sales org..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">None</SelectItem>
                                                        {Array.isArray(salesOrgs) && salesOrgs.map((o: any) => (
                                                            <SelectItem key={o.id} value={o.code}>{o.code} - {o.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="distribution_channel" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Distribution Channel</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select dist. channel..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">None</SelectItem>
                                                        {Array.isArray(distChannels) && distChannels.map((c: any) => (
                                                            <SelectItem key={c.id} value={c.code}>{c.code} - {c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        {(keyCombination === "customer_material" || keyCombination === "customer") && (
                                            <FormField control={form.control} name="customer_id" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer</FormLabel>
                                                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">— None —</SelectItem>
                                                            {Array.isArray(customers) && customers.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                                    {c.customerNumber || c.id} - {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        )}

                                        {(keyCombination === "customer_material" || keyCombination === "material") && (
                                            <FormField control={form.control} name="material_id" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Material</FormLabel>
                                                    <Select onValueChange={(val) => {
                                                        const newVal = val === "none" ? "" : val;
                                                        field.onChange(newVal);
                                                        if (newVal) {
                                                            const mat = (materials as any[]).find((m: any) => m.id.toString() === newVal);
                                                            if (mat?.base_unit_of_measure || mat?.baseUnit) {
                                                                form.setValue("unit", mat.base_unit_of_measure || mat.baseUnit);
                                                            }
                                                        }
                                                    }} value={field.value || "none"}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">— None —</SelectItem>
                                                            {Array.isArray(materials) && materials.map((m: any) => (
                                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                                    {m.code || m.id} - {m.name || m.description}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        )}
                                    </div>
                                </TabsContent>

                                {/* ── Tab 2: Pricing ── */}
                                <TabsContent value="pricing" className="space-y-4 min-h-[280px]">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="amount" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Amount *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="currency" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Array.isArray(currencies) && currencies.map((c: any) => (
                                                            <SelectItem key={c.id || c.code} value={c.code || c.currency_code}>
                                                                {c.code || c.currency_code} - {c.name || c.currency_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="per" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Per (Quantity)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="number" min="1" placeholder="1" />
                                                </FormControl>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="unit" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Unit of Measure</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Array.isArray(units) && units.map((u: any) => (
                                                            <SelectItem key={u.id} value={u.code}>{u.code} - {u.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                {/* ── Tab 3: Validity ── */}
                                <TabsContent value="validity" className="space-y-4 min-h-[280px]">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="valid_from" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid From *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="valid_to" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid To</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="is_active" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Active Status</FormLabel>
                                                <FormDescription>
                                                    Make this condition record active for new sales orders
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </TabsContent>
                            </Tabs>

                            <DialogFooter className="mt-6 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowDialog(false); setEditingRecord(null); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? "Saving..."
                                        : editingRecord ? "Update Record" : "Save Record"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
