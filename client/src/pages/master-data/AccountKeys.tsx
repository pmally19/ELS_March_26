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
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Eye, Search, MoreHorizontal, Key } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface AccountKey {
    id: number;
    code: string;
    name: string;
    description?: string;
    account_type: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

const accountKeySchema = z.object({
    code: z.string()
        .min(1, "Code is required")
        .max(10, "Code must be 10 characters or less")
        .transform(val => val.toUpperCase()),
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    description: z.string().optional(),
    account_type: z.enum(['Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'], {
        required_error: "Account type is required",
    }),
    is_active: z.boolean(),
});

type AccountKeyFormValues = z.infer<typeof accountKeySchema>;

const accountTypeColors: Record<string, string> = {
    Revenue: "bg-green-100 text-green-800",
    Expense: "bg-red-100 text-red-800",
    Tax: "bg-blue-100 text-blue-800",
    Liability: "bg-orange-100 text-orange-800",
    Asset: "bg-purple-100 text-purple-800",
    Discount: "bg-yellow-100 text-yellow-800",
};

export default function AccountKeys() {
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<AccountKey | null>(null);
    const [viewingKey, setViewingKey] = useState<AccountKey | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterActive, setFilterActive] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: keys = [], isLoading, refetch } = useQuery<AccountKey[]>({
        queryKey: ["/api/master-data/account-keys", filterActive, filterType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterActive !== "all") {
                params.append("is_active", filterActive);
            }
            if (filterType !== "all") {
                params.append("account_type", filterType);
            }
            const response = await apiRequest(`/api/master-data/account-keys?${params.toString()}`);
            return await response.json();
        },
    });

    // Fetch account types from API
    const { data: accountTypes = [] } = useQuery<string[]>({
        queryKey: ["/api/master-data/account-keys/account-types"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/account-keys/account-types");
            return await response.json();
        },
    });

    const form = useForm<AccountKeyFormValues>({
        resolver: zodResolver(accountKeySchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            account_type: "Revenue",
            is_active: true,
        },
    });

    useEffect(() => {
        if (editingKey) {
            form.reset({
                code: editingKey.code,
                name: editingKey.name,
                description: editingKey.description || "",
                account_type: editingKey.account_type as any,
                is_active: editingKey.is_active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                account_type: "Revenue",
                is_active: true,
            });
        }
    }, [editingKey, form]);

    const createMutation = useMutation({
        mutationFn: async (data: AccountKeyFormValues) => {
            const response = await apiRequest("/api/master-data/account-keys", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create account key");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-keys"] });
            toast({
                title: "Success",
                description: "Account key created successfully",
            });
            setOpen(false);
            setEditingKey(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create account key",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: AccountKeyFormValues }) => {
            const response = await apiRequest(`/api/master-data/account-keys/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update account key");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-keys"] });
            toast({
                title: "Success",
                description: "Account key updated successfully",
            });
            setOpen(false);
            setEditingKey(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update account key",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/account-keys/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete account key");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-keys"] });
            toast({
                title: "Success",
                description: "Account key deleted successfully",
            });
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete account key",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: AccountKeyFormValues) => {
        if (editingKey) {
            updateMutation.mutate({ id: editingKey.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const filteredKeys = keys.filter((key) => {
        const matchesSearch =
            key.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (key.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesSearch;
    });

    const handleEdit = (key: AccountKey) => {
        setEditingKey(key);
        setOpen(true);
    };

    const handleView = (key: AccountKey) => {
        setViewingKey(key);
        setViewOpen(true);
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest account keys...",
        });
        await refetch();
        toast({
            title: "Data Refreshed",
            description: "Account keys have been updated successfully.",
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
                        <h1 className="text-2xl font-bold">Account Keys</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage GL account determination keys for pricing procedure steps (ERP style)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Account Key
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search account keys..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {accountTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <CardTitle>Account Keys</CardTitle>
                    <CardDescription>
                        All account key configurations for pricing procedure GL postings
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
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                        <TableHead className="hidden md:table-cell">Account Type</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredKeys.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                No account keys found. {searchQuery ? "Try a different search." : "Create your first account key."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredKeys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-medium font-mono">{key.code}</TableCell>
                                                <TableCell>{key.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{key.description || "-"}</TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Badge className={accountTypeColors[key.account_type] || "bg-gray-100 text-gray-800"}>
                                                        {key.account_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={key.is_active ? "default" : "secondary"}
                                                        className={key.is_active ? "bg-green-500" : ""}
                                                    >
                                                        {key.is_active ? "Active" : "Inactive"}
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
                                                            <DropdownMenuItem onClick={() => handleView(key)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(key)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteId(key.id)}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingKey ? "Edit Account Key" : "Create Account Key"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingKey
                                ? "Update the account key details below"
                                : "Add a new account key for pricing procedure GL determination"}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., ERL, MWS"
                                                    {...field}
                                                    disabled={!!editingKey}
                                                    className="font-mono uppercase"
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Unique code (max 10 characters, auto-uppercase)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="account_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {accountTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Type of GL account posting
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Sales Revenue" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Display name for the account key (max 100 characters)
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
                                                placeholder="Description of the account key's purpose and usage"
                                                {...field}
                                                rows={3}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Optional description explaining when to use this account key
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
                                                Is this account key active and available for use in pricing procedures?
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => {
                                    setOpen(false);
                                    setEditingKey(null);
                                    form.reset();
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingKey ? "Update" : "Create")}
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
                        <DialogTitle>Account Key Details</DialogTitle>
                        <DialogDescription>View account key information</DialogDescription>
                    </DialogHeader>
                    {viewingKey && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Code</label>
                                <p className="text-sm font-medium font-mono">{viewingKey.code}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p className="text-sm">{viewingKey.name}</p>
                            </div>
                            {viewingKey.description && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="text-sm">{viewingKey.description}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                                <div className="mt-1">
                                    <Badge className={accountTypeColors[viewingKey.account_type] || "bg-gray-100 text-gray-800"}>
                                        {viewingKey.account_type}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <Badge variant={viewingKey.is_active ? "default" : "secondary"} className={viewingKey.is_active ? "bg-green-500" : ""}>
                                        {viewingKey.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            {viewingKey.created_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                    <p className="text-sm">{new Date(viewingKey.created_at).toLocaleString()}</p>
                                </div>
                            )}
                            {viewingKey.updated_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                                    <p className="text-sm">{new Date(viewingKey.updated_at).toLocaleString()}</p>
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
                            This action cannot be undone. This will permanently delete the account key.
                            {deleteId && keys.find(k => k.id === deleteId)?.code && (
                                <span className="block mt-2 font-medium">
                                    Key: {keys.find(k => k.id === deleteId)?.code}
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
