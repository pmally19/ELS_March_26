import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Download, ArrowLeft, RefreshCw, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";

// Define Purchasing Item Category type
type PurchasingItemCategory = {
    id: number;
    code: string;
    name: string;
    description: string;
    is_active: boolean;
};

// Form Schema
const purchasingItemCategorySchema = z.object({
    code: z.string().min(1, "Code is required").max(10, "Code must be at most 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

export default function PurchasingItemCategories() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<PurchasingItemCategory | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch categories
    const { data: categories = [], isLoading } = useQuery<PurchasingItemCategory[]>({
        queryKey: ['/api/master-data/purchasing-item-categories'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/purchasing-item-categories');
            if (!response.ok) throw new Error('Failed to fetch purchasing item categories');
            return response.json();
        },
    });

    // Filter categories based on search
    const filteredCategories = categories.filter(
        (category) =>
            category.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form setup
    const form = useForm<z.infer<typeof purchasingItemCategorySchema>>({
        resolver: zodResolver(purchasingItemCategorySchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            is_active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingCategory) {
            form.reset({
                code: editingCategory.code,
                name: editingCategory.name,
                description: editingCategory.description || "",
                is_active: editingCategory.is_active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                is_active: true,
            });
        }
    }, [editingCategory, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (category: z.infer<typeof purchasingItemCategorySchema>) => {
            return apiRequest(`/api/master-data/purchasing-item-categories`, {
                method: "POST",
                body: JSON.stringify(category)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-item-categories'] });
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create item category",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; category: z.infer<typeof purchasingItemCategorySchema> }) => {
            return apiRequest(`/api/master-data/purchasing-item-categories/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.category),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category updated successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-item-categories'] });
            setShowDialog(false);
            setEditingCategory(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update item category",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/purchasing-item-categories/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category deleted successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-item-categories'] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete item category",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof purchasingItemCategorySchema>) => {
        const updatedValues: any = {
            ...values,
            code: values.code.toUpperCase(),
        };

        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, category: updatedValues });
        } else {
            createMutation.mutate(updatedValues);
        }
    };

    // Close dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingCategory(null);
        form.reset();
    };

    // Handle edit
    const handleEdit = (category: PurchasingItemCategory) => {
        setEditingCategory(category);
        setShowDialog(true);
    };

    // Handle export
    const handleExport = () => {
        if (filteredCategories.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no item categories to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredCategories.map(category => ({
            'Code': category.code,
            'Name': category.name,
            'Description': category.description,
            'Status': category.is_active ? 'Active' : 'Inactive',
        }));

        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(header => `"${row[header]}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `purchasing-item-categories-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredCategories.length} categories to CSV.`,
        });
    };

    // Handle delete
    const handleDelete = (category: PurchasingItemCategory) => {
        if (window.confirm(`Are you sure you want to delete category ${category.code}?`)) {
            deleteMutation.mutate(category.id);
        }
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
                        <h1 className="text-2xl font-bold">Purchasing Item Categories</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage standard and special procurement item categories
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Item Category
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search categories..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-item-categories'] })}
                    disabled={isLoading}
                    title="Refresh data"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Categories</CardTitle>
                    <CardDescription>
                        Configuration of item categories for purchase requisitions and orders
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
                                        <TableHead className="text-center w-[100px]">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No categories found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCategories.map((category) => (
                                            <TableRow key={category.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{category.code}</TableCell>
                                                <TableCell>{category.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{category.description}</TableCell>
                                                <TableCell className="text-center">
                                                    {category.is_active ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(category)} className="text-red-600">
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
            <Dialog open={showDialog} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? "Edit Item Category" : "Create Item Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update the item category details"
                                : "Add a new purchasing item category"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code*</FormLabel>
                                        <FormControl>
                                            <Input placeholder="K" {...field} disabled={!!editingCategory} maxLength={10} />
                                        </FormControl>
                                        <FormDescription className="text-xs">Unique identifier (e.g., K, L)</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name*</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Consignment" {...field} />
                                        </FormControl>
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
                                            <Textarea placeholder="Additional details..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active Status</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {editingCategory ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
