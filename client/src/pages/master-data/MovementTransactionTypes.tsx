import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

interface MovementTransactionType {
    id: number;
    code: string;
    name: string;
    description?: string;
    category?: string;
    affects_inventory: boolean;
    direction: string;
    requires_reference: boolean;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

const schema = z.object({
    code: z.string().min(1, "Code is required").max(50, "Code must be 50 characters or less"),
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    description: z.string().optional(),
    category: z.string().optional(),
    direction: z.string().min(1, "Direction is required"),
    affects_inventory: z.boolean(),
    requires_reference: z.boolean(),
    sort_order: z.number().min(0),
    is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function MovementTransactionTypes() {
    const [open, setOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MovementTransactionType | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: types = [], isLoading, refetch } = useQuery<MovementTransactionType[]>({
        queryKey: ["/api/master-data-crud/movement-transaction-types"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data-crud/movement-transaction-types");
            return await response.json();
        },
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            category: "",
            direction: "NEUTRAL",
            affects_inventory: true,
            requires_reference: false,
            sort_order: 0,
            is_active: true,
        },
    });

    useEffect(() => {
        if (editing) {
            form.reset({
                code: editing.code,
                name: editing.name,
                description: editing.description || "",
                category: editing.category || "",
                direction: editing.direction,
                affects_inventory: editing.affects_inventory,
                requires_reference: editing.requires_reference,
                sort_order: editing.sort_order,
                is_active: editing.is_active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                category: "",
                direction: "NEUTRAL",
                affects_inventory: true,
                requires_reference: false,
                sort_order: 0,
                is_active: true,
            });
        }
    }, [editing, form]);

    const createMutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const response = await apiRequest("/api/master-data-crud/movement-transaction-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data-crud/movement-transaction-types"] });
            toast({ title: "Success", description: "Movement transaction type created successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
            const response = await apiRequest(`/api/master-data-crud/movement-transaction-types/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data-crud/movement-transaction-types"] });
            toast({ title: "Success", description: "Movement transaction type updated successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data-crud/movement-transaction-types/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data-crud/movement-transaction-types"] });
            toast({ title: "Success", description: "Movement transaction type deleted successfully" });
            setDeleteDialogOpen(false);
            setDeletingId(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (values: FormValues) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleEdit = (type: MovementTransactionType) => {
        setEditing(type);
        setOpen(true);
    };

    const handleDelete = (id: number) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteMutation.mutate(deletingId);
        }
    };

    const filtered = types.filter(
        (t) =>
            t.code.toLowerCase().includes(search.toLowerCase()) ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.description?.toLowerCase() || "").includes(search.toLowerCase())
    );

    useEffect(() => {
        document.title = "Movement Transaction Types | MallyERP";
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/master-data" className="p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Movement Transaction Types</h1>
                        <p className="text-sm text-muted-foreground">
                            Configure transaction types for inventory movements
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Type
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search transaction types by code, name, or description..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction Types ({filtered.length})</CardTitle>
                    <CardDescription>
                        Transaction types for movement types (101, 102, 201, etc.) - following ERP standards
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Category</TableHead>
                                    <TableHead className="hidden lg:table-cell">Direction</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {search
                                                ? "No transaction types match your search"
                                                : "No transaction types found. Create your first one to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-mono font-semibold">{type.code}</TableCell>
                                            <TableCell>{type.name}</TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {type.category ? (
                                                    <Badge variant="outline">{type.category.replace('_', ' ')}</Badge>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell capitalize">{type.direction.toLowerCase()}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={type.is_active ? "default" : "secondary"}>
                                                    {type.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit" : "Create"} Movement Transaction Type</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., PURCHASE" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., Purchase Receipt" />
                                            </FormControl>
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
                                            <Textarea {...field} rows={2} placeholder="Optional description" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="GOODS_RECEIPT">Goods Receipt</SelectItem>
                                                    <SelectItem value="GOODS_ISSUE">Goods Issue</SelectItem>
                                                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                                                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="direction"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Direction *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="INCREASE">Increase</SelectItem>
                                                    <SelectItem value="DECREASE">Decrease</SelectItem>
                                                    <SelectItem value="NEUTRAL">Neutral</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Inventory quantity impact</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="sort_order"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <FormItem>
                                        <FormLabel>Sort Order</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={value}
                                                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>Display order in dropdowns</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-3 border rounded-md p-4">
                                <FormField
                                    control={form.control}
                                    name="affects_inventory"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="!mt-0">Affects Inventory</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="requires_reference"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="!mt-0">Requires Reference Document</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="!mt-0">Active</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending
                                        ? editing
                                            ? "Updating..."
                                            : "Creating..."
                                        : editing
                                            ? "Update"
                                            : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction Type</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transaction type? This action cannot be undone.
                            {deletingId && types.find((t) => t.id === deletingId)?.is_active && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    Warning: This transaction type is currently active and may be in use.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
