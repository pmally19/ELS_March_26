import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Search, Plus, Edit, RefreshCw, Save, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";

// Schema for  Condition Record
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
    is_active: z.boolean().default(true)
});

type ConditionRecordFormValues = z.infer<typeof conditionRecordSchema>;

export default function ConditionRecords() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [keyCombination, setKeyCombination] = useState<string>("customer_material");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch existing records
    const { data: records = [], isLoading } = useQuery({
        queryKey: ["/api/condition-records"],
    });

    // Fetch master data for dropdowns
    const { data: conditionTypes = [] } = useQuery({ queryKey: ["/api/condition-types"] });
    const { data: salesOrgs = [] } = useQuery({ queryKey: ["/api/master-data/sales-organization"] });
    const { data: distChannels = [] } = useQuery({ queryKey: ["/api/master-data/distribution-channels"] });
    const { data: customers = [] } = useQuery({ queryKey: ["/api/master-data/customer"] });
    const { data: materials = [] } = useQuery({ queryKey: ["/api/master-data/material"] });
    const { data: currencies = [] } = useQuery({ queryKey: ["/api/master-data/currency"] });
    const { data: units = [] } = useQuery({ queryKey: ["/api/master-data/units-of-measure"] });

    // Form setup
    const form = useForm<ConditionRecordFormValues>({
        resolver: zodResolver(conditionRecordSchema),
        defaultValues: {
            condition_type: "PR00",
            amount: 0,
            currency: "USD",
            per: 1,
            unit: "PC",
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: "2099-12-31",
            is_active: true
        }
    });

    // Create mutation
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
            toast({ title: "Condition Record Created " });
            setShowDialog(false);
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // Update mutation
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
            toast({ title: "Condition Record Updated " });
            setShowDialog(false);
            setEditingRecord(null);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

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
            valid_from: record.valid_from ? new Date(record.valid_from).toISOString().split('T')[0] : "",
            valid_to: record.valid_to ? new Date(record.valid_to).toISOString().split('T')[0] : "",
            is_active: record.is_active
        });
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
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: "2099-12-31",
            is_active: true
        });
        setShowDialog(true);
    };

    // Filter records
    const filteredRecords = records.filter((r: any) => {
        const searchStr = searchQuery.toLowerCase();
        return (
            r.condition_type?.toLowerCase().includes(searchStr) ||
            r.material_id?.toString().includes(searchStr) ||
            r.customer_id?.toString().includes(searchStr) ||
            r.sales_organization?.toLowerCase().includes(searchStr)
        );
    });

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="icon" className="h-9 w-9 bg-white hover:bg-slate-50 border-slate-200">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Condition Records </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage Pricing Condition Records</p>
                    </div>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search condition records..."
                                    className="pl-8 w-[250px] bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="bg-white" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/condition-records"] })}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openNewDialog}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Record
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-600">Type</TableHead>
                                <TableHead className="font-semibold text-slate-600">Sales Org</TableHead>
                                <TableHead className="font-semibold text-slate-600">Dist. Channel</TableHead>
                                <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                                <TableHead className="font-semibold text-slate-600">Material</TableHead>
                                <TableHead className="font-semibold text-slate-600">Amount</TableHead>
                                <TableHead className="font-semibold text-slate-600">Valid From</TableHead>
                                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">Loading records...</TableCell></TableRow>
                            ) : filteredRecords.length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">No condition records found</TableCell></TableRow>
                            ) : (
                                filteredRecords.map((record: any) => (
                                    <TableRow key={record.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{record.condition_type}</Badge>
                                        </TableCell>
                                        <TableCell>{record.sales_organization || "-"}</TableCell>
                                        <TableCell>{record.distribution_channel || "-"}</TableCell>
                                        <TableCell>{record.customer_id || "-"}</TableCell>
                                        <TableCell>{record.material_id || "-"}</TableCell>
                                        <TableCell className="font-medium text-slate-900">
                                            {Number(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {record.currency}
                                            <span className="text-slate-500 text-xs ml-1">/ {record.per} {record.unit}</span>
                                        </TableCell>
                                        <TableCell>{new Date(record.valid_from).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={record.is_active ? "default" : "secondary"}>
                                                {record.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                                                <Edit className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>{editingRecord ? "Edit Condition Record " : "Create Condition Record : Fast Entry"}</DialogTitle>
                        <DialogDescription>
                            Define pricing, discounts, and surcharges based on combinations of Sales Org, Customer, and Material.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Key Combination Selector */}
                            {!editingRecord && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <FormLabel className="text-sm font-semibold text-slate-700 mb-3 block">Access Sequence (Key Combination)</FormLabel>
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
                                        <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select key combination..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer_material">Customer / Material</SelectItem>
                                            <SelectItem value="material">Material (Standard Price)</SelectItem>
                                            <SelectItem value="customer">Customer (Specific Price)</SelectItem>
                                            <SelectItem value="base">Base Price (Sales Org / Dist. Channel only)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Key Combination Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <FormField control={form.control} name="condition_type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condition Type</FormLabel>
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
                                        <FormLabel>Sales Org</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select sales org..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.isArray(salesOrgs) && salesOrgs.map((o: any) => (
                                                    <SelectItem key={o.id} value={o.code}>
                                                        {o.code} - {o.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="distribution_channel" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dist. Channel</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select dist. channel..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.isArray(distChannels) && distChannels.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.code}>
                                                        {c.code} - {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(keyCombination === "customer_material" || keyCombination === "customer") && (
                                    <FormField control={form.control} name="customer_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select customer... (required)" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">None (Select Customer)</SelectItem>
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
                                                // Autofill Unit based on material's base unit
                                                if (newVal) {
                                                    const material = materials.find((m: any) => m.id.toString() === newVal);
                                                    if (material && (material.base_unit_of_measure || material.baseUnit)) {
                                                        const unit = material.base_unit_of_measure || material.baseUnit;
                                                        form.setValue("unit", unit);
                                                    }
                                                }
                                            }} value={field.value || "none"}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select material... (required)" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">None (Select Material)</SelectItem>
                                                    {Array.isArray(materials) && materials.map((m: any) => (
                                                        <SelectItem key={m.id} value={m.id.toString()}>
                                                            {m.code || m.materialCode || m.id} - {m.name || m.description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
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
                                <FormField control={form.control} name="unit" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.isArray(units) && units.map((u: any) => (
                                                    <SelectItem key={u.id} value={u.code}>
                                                        {u.code} - {u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="per" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Per (Quantity)</FormLabel>
                                        <FormControl><Input {...field} type="number" min="1" /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="valid_from" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valid From</FormLabel>
                                        <FormControl><Input {...field} type="date" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="valid_to" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valid To</FormLabel>
                                        <FormControl><Input {...field} type="date" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="is_active" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Active Status</FormLabel>
                                        <FormDescription>Make this condition record active for new sales orders</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {editingRecord ? "Update Record" : "Save Record"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
