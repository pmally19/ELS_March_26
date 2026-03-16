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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import CostCenterCategoriesExcelImport from "@/components/master-data/CostCenterCategoriesExcelImport";

// Define the type (matches database schema)
type CostCenterCategory = {
    id: number;
    code: string;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
};

// Form Schema
const categorySchema = z.object({
    code: z.string().min(1, "Code is required").max(2, "Code must be 1-2 characters"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export default function CostCenterCategoriesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CostCenterCategory | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();

    // Fetch categories
    const { data: categories = [], isLoading, error, refetch } = useQuery<CostCenterCategory[]>({
        queryKey: ["/api/master-data/cost-center-categories"],
        queryFn: async () => {
            const res = await apiRequest("/api/master-data/cost-center-categories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
        }
    });

    const filteredCategories = categories.filter(item =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form setup
    const form = useForm<z.infer<typeof categorySchema>>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        if (editingCategory) {
            form.reset({
                code: editingCategory.code,
                name: editingCategory.name,
                description: editingCategory.description || "",
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
            });
        }
    }, [editingCategory, form]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: z.infer<typeof categorySchema>) => {
            // Uppercase code
            return apiRequest("/api/master-data/cost-center-categories", {
                method: "POST",
                body: JSON.stringify({ ...data, code: data.code.toUpperCase() })
            });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Category created successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center-categories"] });
            setShowDialog(false);
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: z.infer<typeof categorySchema>) => {
            if (!editingCategory) throw new Error("No category selected");
            return apiRequest(`/api/master-data/cost-center-categories/${editingCategory.id}`, {
                method: "PUT",
                body: JSON.stringify({ ...data, code: data.code.toUpperCase() })
            });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Category updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center-categories"] });
            setShowDialog(false);
            setEditingCategory(null);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/cost-center-categories/${id}`, {
                method: "DELETE"
            });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Category deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/cost-center-categories"] });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const onSubmit = (values: z.infer<typeof categorySchema>) => {
        if (editingCategory) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    const handleEdit = (category: CostCenterCategory) => {
        setEditingCategory(category);
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this category?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExport = () => {
        if (filteredCategories.length === 0) {
            toast({ title: "Info", description: "No data to export" });
            return;
        }
        const headers = ["Code", "Name", "Description"];
        const csvContent = [
            headers.join(","),
            ...filteredCategories.map(c => `"${c.code}","${c.name}","${c.description || ""}"`)
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cost_center_categories_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="text-lg font-medium">Error</h3>
                    <p>{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Cost Center Categories</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage categories for cost centers (e.g. Administration, Production)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                                <FileUp className="mr-2 h-4 w-4" />
                                Import
                            </Button>
                            <Button onClick={() => { setEditingCategory(null); setShowDialog(true); }}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Category
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
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
                    onClick={() => refetch()}
                    title="Refresh Data"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Content */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                        List of all active cost center categories
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No categories found. Create a new one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.code}</TableCell>
                                            <TableCell>{cat.name}</TableCell>
                                            <TableCell>{cat.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(cat.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowDialog(false);
                    setEditingCategory(null);
                    form.reset();
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? "Update details for this cost center category." : "Create a new cost center category."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. W" {...field} maxLength={2} disabled={!!editingCategory} />
                                        </FormControl>
                                        <FormDescription>Unique 1-2 character code.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Administration" {...field} />
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
                                            <Input placeholder="Optional description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                                <Button type="submit">{editingCategory ? "Update" : "Create"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Excel Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Import Categories</DialogTitle>
                        <DialogDescription>
                            Upload an Excel file to bulk import cost center categories.
                        </DialogDescription>
                    </DialogHeader>
                    <CostCenterCategoriesExcelImport />
                </DialogContent>
            </Dialog>
        </div>
    );
}

