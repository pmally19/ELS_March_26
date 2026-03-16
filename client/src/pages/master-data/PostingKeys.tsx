import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, Eye, Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// ─── Types ────────────────────────────────────────────────────────────────────
type AccountType = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    category: string | null;
    is_active: boolean;
};

type PostingKey = {
    id: number;
    posting_key: string;
    description: string | null;
    debit_credit: "D" | "C";
    account_type: string;
    special_gl_indicator: string | null;
    active: boolean;
};

// ─── Category badge colors ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    asset: "bg-blue-100 text-blue-800",
    liability: "bg-orange-100 text-orange-800",
    equity: "bg-purple-100 text-purple-800",
    revenue: "bg-green-100 text-green-800",
    expense: "bg-red-100 text-red-800",
    general: "bg-gray-100 text-gray-800",
};

// ─── Schema (account_type is a free string from DB, validated at submit) ──────
const postingKeySchema = z.object({
    posting_key: z
        .string()
        .min(1, "Posting key is required")
        .max(2, "Max 2 digits")
        .regex(/^\d{1,2}$/, "Must be numeric (e.g. 01, 40)"),
    description: z.string().max(200).optional(),
    debit_credit: z.enum(["D", "C"], { required_error: "Select Debit or Credit" }),
    account_type: z.string().min(1, "Account type is required"),
    special_gl_indicator: z.string().max(10).optional(),
    active: z.boolean().default(true),
});

type FormValues = z.infer<typeof postingKeySchema>;

// ─── Component ────────────────────────────────────────────────────────────────
export default function PostingKeysPage() {
    const { toast } = useToast();
    const permissions = useAgentPermissions();

    // ── State ──────────────────────────────────────────────────────────────────
    const [postingKeys, setPostingKeys] = useState<PostingKey[]>([]);
    const [filtered, setFiltered] = useState<PostingKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Real-time account types from DB
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [accountTypesLoading, setAccountTypesLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterDC, setFilterDC] = useState<string>("all");
    const [filterAccountType, setFilterAccountType] = useState<string>("all");

    const [showDialog, setShowDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [editingKey, setEditingKey] = useState<PostingKey | null>(null);
    const [viewingKey, setViewingKey] = useState<PostingKey | null>(null);

    // ── Fetch account types from DB ────────────────────────────────────────────
    const fetchAccountTypes = async () => {
        try {
            setAccountTypesLoading(true);
            const res = await fetch("/api/master-data/account-types");
            if (!res.ok) throw new Error("Failed to load account types");
            const data: AccountType[] = await res.json();
            setAccountTypes(data.filter(at => at.is_active));
        } catch (err: any) {
            console.error("Error fetching account types:", err);
            // Don't block the main page from loading
            setAccountTypes([]);
        } finally {
            setAccountTypesLoading(false);
        }
    };

    // ── Helper: find account type info ────────────────────────────────────────
    const getAccountTypeInfo = (code: string): AccountType | undefined =>
        accountTypes.find(at => at.code === code);

    // ── Fetch posting keys ─────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/master-data/posting-keys");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            const data: PostingKey[] = result.data || [];
            setPostingKeys(data);
            setFiltered(data);
        } catch (err: any) {
            setError(err.message || "Failed to load posting keys");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccountTypes();
        fetchData();
    }, []);

    // ── Filter logic ───────────────────────────────────────────────────────────
    useEffect(() => {
        let data = postingKeys;
        if (filterDC !== "all") data = data.filter(k => k.debit_credit === filterDC);
        if (filterAccountType !== "all") data = data.filter(k => k.account_type === filterAccountType);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(k =>
                k.posting_key.toLowerCase().includes(q) ||
                (k.description && k.description.toLowerCase().includes(q)) ||
                k.account_type.toLowerCase().includes(q)
            );
        }
        setFiltered(data);
    }, [searchQuery, filterDC, filterAccountType, postingKeys]);

    // ── Form ───────────────────────────────────────────────────────────────────
    const form = useForm<FormValues>({
        resolver: zodResolver(postingKeySchema),
        defaultValues: {
            posting_key: "",
            description: "",
            debit_credit: "D",
            account_type: "",
            special_gl_indicator: "",
            active: true,
        },
    });

    useEffect(() => {
        if (editingKey) {
            form.reset({
                posting_key: editingKey.posting_key,
                description: editingKey.description || "",
                debit_credit: editingKey.debit_credit,
                account_type: editingKey.account_type,
                special_gl_indicator: editingKey.special_gl_indicator || "",
                active: editingKey.active,
            });
        } else {
            form.reset({
                posting_key: "", description: "", debit_credit: "D",
                account_type: "", special_gl_indicator: "", active: true,
            });
        }
    }, [editingKey, form]);

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (values: FormValues) =>
            apiRequest("/api/master-data/posting-keys", {
                method: "POST",
                body: JSON.stringify(values),
            }).then(r => r.json()),
        onSuccess: () => {
            toast({ title: "Success", description: "Posting key created successfully" });
            fetchData(); setShowDialog(false); form.reset();
        },
        onError: (err: any) =>
            toast({ title: "Error", description: err.message || "Failed to create posting key", variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: number; values: FormValues }) =>
            apiRequest(`/api/master-data/posting-keys/${id}`, {
                method: "PUT",
                body: JSON.stringify(values),
            }).then(r => r.json()),
        onSuccess: () => {
            toast({ title: "Success", description: "Posting key updated successfully" });
            fetchData(); setShowDialog(false); setEditingKey(null);
        },
        onError: (err: any) =>
            toast({ title: "Error", description: err.message || "Failed to update posting key", variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            apiRequest(`/api/master-data/posting-keys/${id}`, { method: "DELETE" }).then(r => r.json()),
        onSuccess: () => {
            toast({ title: "Success", description: "Posting key deleted" });
            fetchData();
        },
        onError: (err: any) =>
            toast({ title: "Error", description: err.message || "Failed to delete posting key", variant: "destructive" }),
    });

    const onSubmit = (values: FormValues) => {
        if (editingKey) {
            updateMutation.mutate({ id: editingKey.id, values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleEdit = (key: PostingKey) => { setEditingKey(key); setShowDialog(true); };
    const handleView = (key: PostingKey) => { setViewingKey(key); setShowViewDialog(true); };
    const handleDelete = (key: PostingKey) => {
        if (window.confirm(`Delete posting key "${key.posting_key}"?`)) deleteMutation.mutate(key.id);
    };
    const closeDialog = () => { setShowDialog(false); setEditingKey(null); form.reset(); };

    // ── Export ─────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const headers = ["Posting Key", "Description", "D/C Indicator", "Account Type", "Special GL", "Status"];
        const rows = filtered.map(k => {
            const at = getAccountTypeInfo(k.account_type);
            return [
                k.posting_key,
                k.description || "",
                k.debit_credit === "D" ? "Debit" : "Credit",
                at ? at.name : k.account_type,
                k.special_gl_indicator || "",
                k.active ? "Active" : "Inactive",
            ];
        });
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `posting-keys-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        toast({ title: "Exported", description: `${filtered.length} posting keys exported` });
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Key className="h-6 w-6 text-blue-600" />
                            Posting Keys
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Define posting keys for automatic account determination and debit/credit rules
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                            <Button onClick={() => { setEditingKey(null); setShowDialog(true); }}>
                                <Plus className="mr-2 h-4 w-4" /> New Posting Key
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="text-2xl font-bold text-blue-600">{postingKeys.length}</div>
                        <div className="text-xs text-gray-500">Total Keys</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="text-2xl font-bold text-red-600">{postingKeys.filter(k => k.debit_credit === "D").length}</div>
                        <div className="text-xs text-gray-500">Debit Keys</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="text-2xl font-bold text-green-600">{postingKeys.filter(k => k.debit_credit === "C").length}</div>
                        <div className="text-xs text-gray-500">Credit Keys</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="text-2xl font-bold text-gray-600">{accountTypes.length}</div>
                        <div className="text-xs text-gray-500">Account Types Available</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={filterDC} onValueChange={setFilterDC}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="D/C Indicator" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All D/C</SelectItem>
                        <SelectItem value="D">Debit (D)</SelectItem>
                        <SelectItem value="C">Credit (C)</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Account Types</SelectItem>
                        {accountTypes.map(at => (
                            <SelectItem key={at.id} value={at.code}>{at.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search posting keys..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <Button variant="outline" size="icon" onClick={() => { fetchAccountTypes(); fetchData(); }} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Posting Keys</CardTitle>
                    <CardDescription>
                        posting key configuration — account types loaded from master data
                        {accountTypesLoading && <span className="ml-2 text-xs text-gray-400">(loading account types...)</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : (
                        <div className="rounded-md border">
                            <div className="max-h-[550px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10">
                                        <TableRow>
                                            <TableHead className="w-[110px]">Posting Key</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-[130px]">D/C Indicator</TableHead>
                                            <TableHead className="w-[200px]">Account Type</TableHead>
                                            <TableHead className="w-[100px]">Special GL</TableHead>
                                            <TableHead className="w-[90px] text-center">Status</TableHead>
                                            <TableHead className="w-[120px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center h-24">
                                                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                                    No posting keys found.{" "}
                                                    {searchQuery ? "Try a different search." : "Create your first posting key."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map(key => {
                                                const at = getAccountTypeInfo(key.account_type);
                                                const catColor = CATEGORY_COLORS[at?.category || ""] || "bg-gray-100 text-gray-700";
                                                return (
                                                    <TableRow key={key.id} className="hover:bg-gray-50">
                                                        <TableCell>
                                                            <span className="font-mono font-bold text-blue-700 text-lg">{key.posting_key}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{key.description || "—"}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={key.debit_credit === "D"
                                                                    ? "bg-red-100 text-red-800 border-red-200"
                                                                    : "bg-green-100 text-green-800 border-green-200"}
                                                                variant="outline"
                                                            >
                                                                {key.debit_credit === "D" ? "🔴 Debit" : "🟢 Credit"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-sm">
                                                                    {at ? at.name : key.account_type}
                                                                </span>
                                                                {at?.category && (
                                                                    <span className={`inline-flex w-fit px-1.5 py-0.5 rounded text-xs font-medium ${catColor}`}>
                                                                        {at.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-500">
                                                            {key.special_gl_indicator || "—"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${key.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                                                }`}>
                                                                {key.active ? "Active" : "Inactive"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button variant="ghost" size="sm" onClick={() => handleView(key)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                {permissions.hasDataModificationRights && (
                                                                    <>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(key)}>
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(key)}>
                                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Create / Edit Dialog ───────────────────────────────────────────── */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingKey ? "Edit Posting Key" : "Create Posting Key"}</DialogTitle>
                        <DialogDescription>
                            {editingKey
                                ? "Update the posting key configuration."
                                : "Define a new posting key for account determination."}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Posting Key Code */}
                                <FormField control={form.control} name="posting_key" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Posting Key Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                maxLength={2}
                                                placeholder="e.g. 01, 40, 50"
                                                disabled={!!editingKey}
                                                className="font-mono text-lg"
                                            />
                                        </FormControl>
                                        <FormDescription>2-digit numeric key</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Account Type — from DB */}
                                <FormField control={form.control} name="account_type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Type *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={accountTypesLoading ? "Loading..." : "Select account type"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-60">
                                                {accountTypes.map(at => (
                                                    <SelectItem key={at.id} value={at.code}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{at.name}</span>
                                                            {at.category && (
                                                                <span className="text-xs text-gray-500 capitalize">{at.category}</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {accountTypes.length} types loaded from master data
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* Description */}
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. Customer Invoice, GL Debit Entry" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Debit / Credit Indicator */}
                            <FormField control={form.control} name="debit_credit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Debit/Credit Indicator *</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex gap-6 pt-1"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="D" id="dc-debit" />
                                                <Label htmlFor="dc-debit" className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-red-600 font-semibold">D – Debit</span>
                                                    <span className="text-xs text-gray-400">(increases balance)</span>
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="C" id="dc-credit" />
                                                <Label htmlFor="dc-credit" className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-green-600 font-semibold">C – Credit</span>
                                                    <span className="text-xs text-gray-400">(decreases balance)</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                {/* Special GL Indicator */}
                                <FormField control={form.control} name="special_gl_indicator" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Special GL Indicator</FormLabel>
                                        <FormControl>
                                            <Input {...field} maxLength={10} placeholder="e.g. A (Down Payment)" />
                                        </FormControl>
                                        <FormDescription>Optional — for noted items, down payments</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Active Toggle */}
                                <FormField control={form.control} name="active" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-1">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Active</FormLabel>
                                            <FormDescription>Enable this posting key for use</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingKey ? "Update" : "Create"} Posting Key
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ── View Dialog ───────────────────────────────────────────────────── */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Posting Key Details</DialogTitle>
                    </DialogHeader>
                    {viewingKey && (() => {
                        const at = getAccountTypeInfo(viewingKey.account_type);
                        const catColor = CATEGORY_COLORS[at?.category || ""] || "bg-gray-100 text-gray-700";
                        return (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-mono text-4xl font-bold text-blue-700">{viewingKey.posting_key}</span>
                                    <Badge
                                        className={viewingKey.debit_credit === "D"
                                            ? "bg-red-100 text-red-800 border-red-200"
                                            : "bg-green-100 text-green-800 border-green-200"}
                                        variant="outline"
                                    >
                                        {viewingKey.debit_credit === "D" ? "Debit (D)" : "Credit (C)"}
                                    </Badge>
                                    {at && (
                                        <Badge className={catColor} variant="outline">
                                            {at.name}
                                        </Badge>
                                    )}
                                </div>

                                <dl className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Description</dt>
                                        <dd className="font-medium">{viewingKey.description || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Account Type</dt>
                                        <dd className="font-medium">
                                            {at ? (
                                                <div className="flex flex-col">
                                                    <span>{at.name}</span>
                                                    <span className={`inline-flex w-fit mt-1 px-1.5 py-0.5 rounded text-xs ${catColor}`}>
                                                        {at.category}
                                                    </span>
                                                    {at.description && (
                                                        <span className="text-xs text-gray-400 mt-0.5">{at.description}</span>
                                                    )}
                                                </div>
                                            ) : viewingKey.account_type}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Special GL Indicator</dt>
                                        <dd className="font-medium">{viewingKey.special_gl_indicator || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Status</dt>
                                        <dd>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingKey.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                                }`}>
                                                {viewingKey.active ? "Active" : "Inactive"}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                {/* How it works */}
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                                    <p className="font-semibold text-blue-700 mb-1">How this key works in a journal entry:</p>
                                    <p className="text-blue-600">
                                        Posting key <strong>{viewingKey.posting_key}</strong> posts a{" "}
                                        <strong>{viewingKey.debit_credit === "D" ? "DEBIT" : "CREDIT"}</strong> to a{" "}
                                        <strong>{at ? at.name : viewingKey.account_type}</strong>{" "}
                                        {at?.category && <span>({at.category})</span>} account.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
                        {permissions.hasDataModificationRights && viewingKey && (
                            <Button onClick={() => { setShowViewDialog(false); handleEdit(viewingKey); }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
