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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Search, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface PODocumentType {
    id: number;
    code: string;
    name: string;
    description?: string;
    numberRangeId?: number;
    numberRangeCode?: string;
    numberRangeName?: string;
    itemInterval: number;
    fieldSelectionKey: string;
    itemCategoriesAllowed: string[];
    accountAssignmentCategories: string[];
    partnerDeterminationSchema: string;
    messageSchema: string;
    releaseProcedureRequired: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface NumberRange {
    id: number;
    code: string;
    name: string;
    description?: string;
}

// Available options for selects
const ITEM_CATEGORIES = ['Standard', 'Service', 'Subcontracting', 'Consignment'];
const ACCOUNT_ASSIGNMENT_CATEGORIES = [
    { value: 'K', label: 'K - Cost Center' },
    { value: 'A', label: 'A - Asset' },
    { value: 'F', label: 'F - Order' },
    { value: 'P', label: 'P - Project' },
];
const PARTNER_SCHEMAS = ['VENDOR', 'SUPPLIER', 'CONTRACTOR'];

const schema = z.object({
    code: z.string().length(3, "Code must be exactly 3 characters").toUpperCase(),
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    description: z.string().optional(),
    numberRangeId: z.number().min(1, "Number range is required"),
    itemInterval: z.number().min(1, "Must be at least 1").max(1000, "Must not exceed 1000"),
    fieldSelectionKey: z.string().min(1, "Required").max(3, "Max 3 characters"),
    itemCategoriesAllowed: z.array(z.string()).min(1, "Select at least one item category"),
    accountAssignmentCategories: z.array(z.string()).min(1, "Select at least one account category"),
    partnerDeterminationSchema: z.string().min(1, "Partner schema is required"),
    messageSchema: z.string().min(1, "Message schema is required").max(10, "Max 10 characters"),
    releaseProcedureRequired: z.boolean(),
    isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function PODocumentTypes() {
    const [open, setOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<PODocumentType | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch PO document types
    const { data: types = [], isLoading, refetch } = useQuery<PODocumentType[]>({
        queryKey: ["/api/master-data/po-document-types"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/po-document-types");
            return await response.json();
        },
    });

    // Fetch number ranges for dropdown
    const { data: numberRanges = [], isLoading: numberRangesLoading } = useQuery<NumberRange[]>({
        queryKey: ["/api/master-data/po-document-types/number-ranges"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/po-document-types/number-ranges");
            return await response.json();
        },
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            numberRangeId: undefined,
            itemInterval: 10,
            fieldSelectionKey: "",
            itemCategoriesAllowed: [],
            accountAssignmentCategories: [],
            partnerDeterminationSchema: "VENDOR",
            messageSchema: "NEU",
            releaseProcedureRequired: false,
            isActive: true,
        },
    });

    useEffect(() => {
        if (editing) {
            form.reset({
                code: editing.code,
                name: editing.name,
                description: editing.description || "",
                numberRangeId: editing.numberRangeId,
                itemInterval: editing.itemInterval,
                fieldSelectionKey: editing.fieldSelectionKey,
                itemCategoriesAllowed: editing.itemCategoriesAllowed || [],
                accountAssignmentCategories: editing.accountAssignmentCategories || [],
                partnerDeterminationSchema: editing.partnerDeterminationSchema,
                messageSchema: editing.messageSchema,
                releaseProcedureRequired: editing.releaseProcedureRequired,
                isActive: editing.isActive,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                numberRangeId: undefined,
                itemInterval: 10,
                fieldSelectionKey: "",
                itemCategoriesAllowed: [],
                accountAssignmentCategories: [],
                partnerDeterminationSchema: "VENDOR",
                messageSchema: "NEU",
                releaseProcedureRequired: false,
                isActive: true,
            });
        }
    }, [editing, form]);

    const createMutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const response = await apiRequest("/api/master-data/po-document-types", {
                method: "POST",
                body: data,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/po-document-types"] });
            toast({ title: "Success", description: "PO document type created successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
            const response = await apiRequest(`/api/master-data/po-document-types/${id}`, {
                method: "PUT",
                body: data,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/po-document-types"] });
            toast({ title: "Success", description: "PO document type updated successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/po-document-types/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/po-document-types"] });
            toast({ title: "Success", description: "PO document type deleted successfully" });
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

    const handleEdit = (type: PODocumentType) => {
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
        document.title = "PO Document Types | MallyERP";
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/master-data" className="p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Purchase Order Document Types</h1>
                        <p className="text-sm text-muted-foreground">
                            Comprehensive procurement document type configuration with all ERP fields
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
                    placeholder="Search document types by code, name, or description..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Document Types ({filtered.length})</CardTitle>
                    <CardDescription>
                        ERP-compliant PO document types with comprehensive field configuration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden lg:table-cell">Number Range</TableHead>
                                    <TableHead className="hidden md:table-cell">Item Interval</TableHead>
                                    <TableHead className="hidden xl:table-cell">Item Categories</TableHead>
                                    <TableHead className="text-center">Release Required</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {search
                                                ? "No document types match your search"
                                                : "No document types found. Create your first one to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-mono font-semibold">{type.code}</TableCell>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                {type.numberRangeCode ? (
                                                    <Badge variant="outline">{type.numberRangeCode}</Badge>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{type.itemInterval}</TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                <div className="flex gap-1 flex-wrap">
                                                    {type.itemCategoriesAllowed?.slice(0, 2).map((cat) => (
                                                        <Badge key={cat} variant="secondary" className="text-xs">
                                                            {cat}
                                                        </Badge>
                                                    ))}
                                                    {(type.itemCategoriesAllowed?.length || 0) > 2 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{type.itemCategoriesAllowed.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {type.releaseProcedureRequired ? (
                                                    <Badge variant="default">Yes</Badge>
                                                ) : (
                                                    <Badge variant="secondary">No</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={type.isActive ? "default" : "secondary"}>
                                                    {type.isActive ? "Active" : "Inactive"}
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {editing ? "Edit" : "Create"} PO Document Type
                        </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Document Type Code *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., NBF" maxLength={3} className="uppercase" />
                                                </FormControl>
                                                <FormDescription>3 characters (e.g., NBF, KU1, ZNB)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., Standard Purchase Order" />
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
                                            <FormLabel>Detailed Description</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} rows={2} placeholder="Optional detailed description" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Number Range & Item Control */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Number Range & Item Control</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="numberRangeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Number Range *</FormLabel>
                                                <Select
                                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                                    value={field.value?.toString()}
                                                    disabled={numberRangesLoading}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={numberRangesLoading ? "Loading..." : "Select range"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {numberRanges.map((range) => (
                                                            <SelectItem key={range.id} value={range.id.toString()}>
                                                                {range.code} - {range.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>PO number generation</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="itemInterval"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Item Interval *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                                                    />
                                                </FormControl>
                                                <FormDescription>Item numbering (10, 20, 30...)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fieldSelectionKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Field Selection Key *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., NB" maxLength={3} />
                                                </FormControl>
                                                <FormDescription>Screen layout control</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Item Categories */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Allowed Item Categories *</h3>
                                <FormField
                                    control={form.control}
                                    name="itemCategoriesAllowed"
                                    render={() => (
                                        <FormItem>
                                            <div className="grid grid-cols-2 gap-3">
                                                {ITEM_CATEGORIES.map((category) => (
                                                    <FormField
                                                        key={category}
                                                        control={form.control}
                                                        name="itemCategoriesAllowed"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center space-x-2 space-y-0 border rounded-md p-3">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(category)}
                                                                        onCheckedChange={(checked) => {
                                                                            const newValue = checked
                                                                                ? [...(field.value || []), category]
                                                                                : (field.value || []).filter((v) => v !== category);
                                                                            field.onChange(newValue);
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="!mt-0 cursor-pointer">{category}</FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <FormDescription>Select which item types can be used in this PO type</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Account Assignment Categories */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Account Assignment Categories *</h3>
                                <FormField
                                    control={form.control}
                                    name="accountAssignmentCategories"
                                    render={() => (
                                        <FormItem>
                                            <div className="grid grid-cols-2 gap-3">
                                                {ACCOUNT_ASSIGNMENT_CATEGORIES.map((category) => (
                                                    <FormField
                                                        key={category.value}
                                                        control={form.control}
                                                        name="accountAssignmentCategories"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center space-x-2 space-y-0 border rounded-md p-3">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(category.value)}
                                                                        onCheckedChange={(checked) => {
                                                                            const newValue = checked
                                                                                ? [...(field.value || []), category.value]
                                                                                : (field.value || []).filter((v) => v !== category.value);
                                                                            field.onChange(newValue);
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="!mt-0 cursor-pointer">{category.label}</FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <FormDescription>Financial posting account assignment types</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Partner & Message Schemas */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Partner & Message Control</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="partnerDeterminationSchema"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Partner Determination Schema *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select schema" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {PARTNER_SCHEMAS.map((schema) => (
                                                            <SelectItem key={schema} value={schema}>
                                                                {schema}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>Business partner determination</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="messageSchema"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message Schema *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., NEU" maxLength={10} />
                                                </FormControl>
                                                <FormDescription>Output type (print, email, EDI)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Flags */}
                            <div className="space-y-3 border rounded-md p-4">
                                <FormField
                                    control={form.control}
                                    name="releaseProcedureRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div>
                                                <FormLabel className="!mt-0">Release Procedure Required</FormLabel>
                                                <FormDescription>Activate approval workflow for this PO type</FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isActive"
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
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {editing ? "Updating..." : "Creating..."}
                                        </>
                                    ) : (
                                        <>{editing ? "Update" : "Create"}</>
                                    )}
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
                        <AlertDialogTitle>Delete Document Type</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this document type? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
