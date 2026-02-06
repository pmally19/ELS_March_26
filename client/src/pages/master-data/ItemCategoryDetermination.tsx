import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Textarea } from "@/components/ui/textarea";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, RefreshCw, MoreHorizontal, Download, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

// Define Item Category Determination type
type ItemCategoryDetermination = {
    id: number;
    sales_document_type: string;
    item_category_group: string;
    usage?: string;
    higher_level_item_category?: string;
    item_category: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

// Validation schema
const itemCategoryDeterminationSchema = z.object({
    sales_document_type: z.string().min(1, "Sales Document Type is required"),
    item_category_group: z.string().min(1, "Item Category Group is required"),
    usage: z.string().optional(),
    higher_level_item_category: z.string().optional(),
    item_category: z.string().min(1, "Item Category is required"),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

type ItemCategoryDeterminationFormData = z.infer<typeof itemCategoryDeterminationSchema>;

export default function ItemCategoryDetermination() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedDetermination, setSelectedDetermination] = useState<ItemCategoryDetermination | null>(null);

    // Fetch all item category determination records
    const { data: determinations = [], isLoading, refetch } = useQuery<ItemCategoryDetermination[]>({
        queryKey: ["/api/master-data/item-category-determination"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/item-category-determination");
            return response.json();
        },
    });

    // Fetch sales document types for dropdown
    const { data: salesDocTypes = [] } = useQuery<any[]>({
        queryKey: ["/api/master-data/sd-document-types"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/sd-document-types");
            return response.json();
        },
    });

    // Fetch item category groups for dropdown
    const { data: itemCategoryGroups = [] } = useQuery<any[]>({
        queryKey: ["/api/master-data/item-category-groups"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/item-category-groups");
            return response.json();
        },
    });

    // Fetch item categories for dropdown
    const { data: itemCategories = [] } = useQuery<any[]>({
        queryKey: ["/api/master-data/item-categories"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/item-categories");
            return response.json();
        },
    });

    // Create form
    const createForm = useForm<ItemCategoryDeterminationFormData>({
        resolver: zodResolver(itemCategoryDeterminationSchema),
        defaultValues: {
            sales_document_type: "",
            item_category_group: "",
            usage: "",
            higher_level_item_category: "",
            item_category: "",
            description: "",
            is_active: true,
        },
    });

    // Edit form
    const editForm = useForm<ItemCategoryDeterminationFormData>({
        resolver: zodResolver(itemCategoryDeterminationSchema),
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: ItemCategoryDeterminationFormData) =>
            fetch("/api/master-data/item-category-determination", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to create");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category determination created successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-determination"] });
            setIsCreateDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: ItemCategoryDeterminationFormData & { id: number }) =>
            fetch(`/api/master-data/item-category-determination/${data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to update");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category determination updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-determination"] });
            setIsEditDialogOpen(false);
            setSelectedDetermination(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/master-data/item-category-determination/${id}`, {
                method: "DELETE",
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to delete");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category determination deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-determination"] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Filtered determinations
    const filteredDeterminations = determinations.filter((det) => {
        const query = searchQuery.toLowerCase();
        return (
            det.sales_document_type.toLowerCase().includes(query) ||
            det.item_category_group.toLowerCase().includes(query) ||
            det.item_category.toLowerCase().includes(query) ||
            (det.usage && det.usage.toLowerCase().includes(query)) ||
            (det.description && det.description.toLowerCase().includes(query))
        );
    });

    // Handlers
    const handleCreate = () => {
        createForm.reset();
        setIsCreateDialogOpen(true);
    };

    const handleEdit = (determination: ItemCategoryDetermination) => {
        setSelectedDetermination(determination);
        editForm.reset({
            sales_document_type: determination.sales_document_type,
            item_category_group: determination.item_category_group,
            usage: determination.usage || "",
            higher_level_item_category: determination.higher_level_item_category || "",
            item_category: determination.item_category,
            description: determination.description || "",
            is_active: determination.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const handleView = (determination: ItemCategoryDetermination) => {
        setSelectedDetermination(determination);
        setIsViewDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this item category determination?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExportCSV = () => {
        const headers = ["Sales Doc Type", "Item Cat Group", "Usage", "Higher-Level Cat", "Item Category", "Description", "Active", "Created At"];
        const rows = filteredDeterminations.map((d) => [
            d.sales_document_type,
            d.item_category_group,
            d.usage || "",
            d.higher_level_item_category || "",
            d.item_category,
            d.description || "",
            d.is_active ? "Yes" : "No",
            new Date(d.created_at).toLocaleDateString(),
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `item-category-determination-${new Date().toISOString()}.csv`;
        a.click();
    };

    const onCreateSubmit = (data: ItemCategoryDeterminationFormData) => {
        createMutation.mutate(data);
    };

    const onEditSubmit = (data: ItemCategoryDeterminationFormData) => {
        if (selectedDetermination) {
            updateMutation.mutate({ ...data, id: selectedDetermination.id });
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/master-data")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Item Category Determination</h1>
                        <p className="text-muted-foreground">Configure item category determination rules for sales document processing</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Determination
                    </Button>
                </div>
            </div>

            {/* Search and Actions */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by sales doc type, item category group, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetch()}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Category Determination Rules ({filteredDeterminations.length})</CardTitle>
                    <CardDescription>Determines item categories based on sales document type and material item category group</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sales Doc Type</TableHead>
                                <TableHead>Item Cat Group</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Higher-Level Cat</TableHead>
                                <TableHead>Item Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredDeterminations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No item category determination rules found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDeterminations.map((det) => (
                                    <TableRow key={det.id}>
                                        <TableCell className="font-mono font-medium">{det.sales_document_type}</TableCell>
                                        <TableCell className="font-mono">{det.item_category_group}</TableCell>
                                        <TableCell className="font-mono">{det.usage || "-"}</TableCell>
                                        <TableCell className="font-mono">{det.higher_level_item_category || "-"}</TableCell>
                                        <TableCell className="font-mono font-semibold text-primary">{det.item_category}</TableCell>
                                        <TableCell className="max-w-xs truncate">{det.description || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={det.is_active ? "default" : "secondary"}>
                                                {det.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleView(det)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(det)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(det.id)}
                                                        className="text-red-600"
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

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create Item Category Determination</DialogTitle>
                        <DialogDescription>Add a new determination rule for item category assignment</DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={createForm.control}
                                    name="sales_document_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sales Document Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select sales document type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {salesDocTypes.map((type) => (
                                                        <SelectItem key={type.id} value={type.code}>
                                                            {type.code} - {type.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="item_category_group"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Category Group *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select item category group" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {itemCategoryGroups.map((group) => (
                                                        <SelectItem key={group.id} value={group.group_code}>
                                                            {group.group_code} - {group.group_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={createForm.control}
                                    name="usage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Usage (Optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., CHSP" maxLength={4} className="uppercase"
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="higher_level_item_category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Higher-Level Item Cat (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select higher-level category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {itemCategories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.code}>
                                                            {cat.code} - {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={createForm.control}
                                name="item_category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Category (Result) *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select item category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {itemCategories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.code}>
                                                        {cat.code} - {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Describe this determination rule..." rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div>
                                            <FormLabel>Active Status</FormLabel>
                                            <FormControl className="ml-4">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Item Category Determination</DialogTitle>
                        <DialogDescription>Update determination rule information</DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name="sales_document_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sales Document Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select sales document type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {salesDocTypes.map((type) => (
                                                        <SelectItem key={type.id} value={type.code}>
                                                            {type.code} - {type.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="item_category_group"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Category Group *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select item category group" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {itemCategoryGroups.map((group) => (
                                                        <SelectItem key={group.id} value={group.group_code}>
                                                            {group.group_code} - {group.group_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name="usage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Usage (Optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., CHSP" maxLength={4} className="uppercase"
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="higher_level_item_category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Higher-Level Item Cat (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select higher-level category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {itemCategories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.code}>
                                                            {cat.code} - {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={editForm.control}
                                name="item_category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Category (Result) *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select item category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {itemCategories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.code}>
                                                        {cat.code} - {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Describe this determination rule..." rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div>
                                            <FormLabel>Active Status</FormLabel>
                                            <FormControl className="ml-4">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Updating..." : "Update"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Item Category Determination Details</DialogTitle>
                    </DialogHeader>
                    {selectedDetermination && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Sales Document Type</label>
                                    <p className="text-lg font-mono font-semibold">{selectedDetermination.sales_document_type}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Item Category Group</label>
                                    <p className="text-lg font-mono font-semibold">{selectedDetermination.item_category_group}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Usage</label>
                                    <p className="text-lg font-mono">{selectedDetermination.usage || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Higher-Level Item Category</label>
                                    <p className="text-lg font-mono">{selectedDetermination.higher_level_item_category || "-"}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <label className="text-sm font-medium text-muted-foreground">Determined Item Category (Result)</label>
                                <p className="text-2xl font-mono font-bold text-primary">{selectedDetermination.item_category}</p>
                            </div>
                            {selectedDetermination.description && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="text-sm">{selectedDetermination.description}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <Badge variant={selectedDetermination.is_active ? "default" : "secondary"}>
                                        {selectedDetermination.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                                    <p className="text-sm">{new Date(selectedDetermination.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                                    <p className="text-sm">{new Date(selectedDetermination.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
