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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Download, ArrowLeft, RefreshCw, MoreHorizontal, Tag, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define Item Category type
type ItemCategory = {
    id: number;
    code: string;
    name: string;
    itemType: string;
    deliveryRelevant: boolean;
    billingRelevant: boolean;
    pricingRelevant: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: number;
    updatedBy?: number;
    tenantId?: string;
    deletedAt?: string | null;
};

// Item Category Form Schema
const itemCategorySchema = z.object({
    code: z.string().min(1, "Code is required").max(4, "Code must be at most 4 characters"),
    name: z.string().min(1, "Name is required").max(50, "Name must be at most 50 characters"),
    itemType: z.string().min(1, "Item type is required"),
    deliveryRelevant: z.boolean().default(true),
    billingRelevant: z.boolean().default(true),
    pricingRelevant: z.boolean().default(true),
});

export default function ItemCategories() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
    const [activeTab, setActiveTab] = useState("basic");
    const [viewingCategoryDetails, setViewingCategoryDetails] = useState<ItemCategory | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [adminDataOpen, setAdminDataOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch item categories
    const { data: categories = [], isLoading } = useQuery<ItemCategory[]>({
        queryKey: ['/api/master-data/item-categories'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/item-categories');
            if (!response.ok) throw new Error('Failed to fetch item categories');
            return response.json();
        },
    });

    // Filter categories based on search
    const filteredCategories = categories.filter(
        (category) =>
            category.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.itemType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form setup
    const form = useForm<z.infer<typeof itemCategorySchema>>({
        resolver: zodResolver(itemCategorySchema),
        defaultValues: {
            code: "",
            name: "",
            itemType: "",
            deliveryRelevant: true,
            billingRelevant: true,
            pricingRelevant: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingCategory) {
            form.reset({
                code: editingCategory.code,
                name: editingCategory.name,
                itemType: editingCategory.itemType,
                deliveryRelevant: editingCategory.deliveryRelevant,
                billingRelevant: editingCategory.billingRelevant,
                pricingRelevant: editingCategory.pricingRelevant,
            });
        } else {
            form.reset();
        }
    }, [editingCategory, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (category: z.infer<typeof itemCategorySchema>) => {
            return apiRequest(`/api/master-data/item-categories`, {
                method: "POST",
                body: JSON.stringify(category)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/item-categories'] });
            setShowDialog(false);
            setActiveTab("basic");
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
        mutationFn: (data: { id: number; category: z.infer<typeof itemCategorySchema> }) => {
            return apiRequest(`/api/master-data/item-categories/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.category),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category updated successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/item-categories'] });
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
            return apiRequest(`/api/master-data/item-categories/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Item category deleted successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/item-categories'] });
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
    const onSubmit = (values: z.infer<typeof itemCategorySchema>) => {
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
    const handleEdit = (category: ItemCategory) => {
        setEditingCategory(category);
        form.reset({
            code: category.code,
            name: category.name,
            itemType: category.itemType,
            deliveryRelevant: category.deliveryRelevant,
            billingRelevant: category.billingRelevant,
            pricingRelevant: category.pricingRelevant,
        });
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
            'Item Type': category.itemType,
            'Delivery Relevant': category.deliveryRelevant ? 'Yes' : 'No',
            'Billing Relevant': category.billingRelevant ? 'Yes' : 'No',
            'Pricing Relevant': category.pricingRelevant ? 'Yes' : 'No',
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
        link.setAttribute('download', `item-categories-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredCategories.length} item categories to CSV file.`,
        });
    };

    // Handle delete
    const handleDelete = (category: ItemCategory) => {
        if (window.confirm(`Are you sure you want to delete item category ${category.code}?`)) {
            deleteMutation.mutate(category.id);
        }
    };

    // Open details dialog
    const openDetails = (category: ItemCategory) => {
        setViewingCategoryDetails(category);
        setIsDetailsOpen(true);
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
                        <h1 className="text-2xl font-bold">Item Categories</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage sales & distribution item categories
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
                        placeholder="Search item categories..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/item-categories'] })}
                    disabled={isLoading}
                    title="Refresh item categories data"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Item Categories Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Categories</CardTitle>
                    <CardDescription>
                        All sales & distribution item categories for order processing
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
                                        <TableHead className="hidden md:table-cell">Item Type</TableHead>
                                        <TableHead className="hidden lg:table-cell text-center">Relevance</TableHead>
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
                                    ) : filteredCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                No item categories found. {searchQuery ? "Try a different search." : "Create your first item category."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCategories.map((category) => (
                                            <TableRow
                                                key={category.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() => openDetails(category)}
                                            >
                                                <TableCell className="font-medium">{category.code}</TableCell>
                                                <TableCell>{category.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{category.itemType}</TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div className="flex gap-1 justify-center">
                                                        {category.deliveryRelevant && (
                                                            <Badge variant="outline" className="text-xs">D</Badge>
                                                        )}
                                                        {category.billingRelevant && (
                                                            <Badge variant="outline" className="text-xs">B</Badge>
                                                        )}
                                                        {category.pricingRelevant && (
                                                            <Badge variant="outline" className="text-xs">P</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                                                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
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
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? "Edit Item Category" : "Create Item Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update the item category details"
                                : "Add a new sales & distribution item category"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                    <TabsTrigger value="settings">Relevance Settings</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Code*</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="NORM" {...field} disabled={!!editingCategory} maxLength={4} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">Max 4 characters, uppercase</FormDescription>
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
                                                        <Input placeholder="Normal Item" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="itemType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Item Type*</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select item type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="NORM">NORM - Normal Item</SelectItem>
                                                        <SelectItem value="SERV">SERV - Service Item</SelectItem>
                                                        <SelectItem value="TEXT">TEXT - Text Item</SelectItem>
                                                        <SelectItem value="FREE">FREE - Free of Charge</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4">
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="deliveryRelevant"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Delivery Relevant</FormLabel>
                                                        <FormDescription>
                                                            Item category triggers delivery processing
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="billingRelevant"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Billing Relevant</FormLabel>
                                                        <FormDescription>
                                                            Item category triggers billing/invoicing
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="pricingRelevant"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Pricing Relevant</FormLabel>
                                                        <FormDescription>
                                                            Item category affects pricing calculation
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

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

            {/* Details Dialog - View Only */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
                    {viewingCategoryDetails && (
                        <>
                            <DialogHeader className="flex-shrink-0">
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsDetailsOpen(false)}
                                        className="flex items-center space-x-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>Back</span>
                                    </Button>
                                    <div className="flex-1">
                                        <DialogTitle>Item Category Details</DialogTitle>
                                        <DialogDescription>
                                            Comprehensive information about {viewingCategoryDetails.name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto space-y-6 px-1">
                                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{viewingCategoryDetails.name}</h3>
                                        <div className="flex items-center mt-1 gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                                                {viewingCategoryDetails.code}
                                            </span>
                                            <Badge variant="outline">{viewingCategoryDetails.itemType}</Badge>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setIsDetailsOpen(false); handleEdit(viewingCategoryDetails); }}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="shadow-sm border-gray-100">
                                        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
                                            <CardTitle className="text-sm font-semibold flex items-center text-gray-700">
                                                <Tag className="mr-2 h-4 w-4 text-gray-500" />
                                                Basic Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Code</p>
                                                    <p className="text-sm font-mono">{viewingCategoryDetails.code}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Name</p>
                                                    <p className="text-sm">{viewingCategoryDetails.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500 mb-1">Item Type</p>
                                                    <p className="text-sm">{viewingCategoryDetails.itemType}</p>
                                                </div>
                                            </div>
                                            <div className="border-t pt-3">
                                                <p className="text-sm font-medium text-gray-500 mb-2">Relevance Settings</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingCategoryDetails.deliveryRelevant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500 line-through'}`}>
                                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Delivery
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingCategoryDetails.billingRelevant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500 line-through'}`}>
                                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Billing
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingCategoryDetails.pricingRelevant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500 line-through'}`}>
                                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Pricing
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm border-gray-100">
                                        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
                                            <CardTitle className="text-sm font-semibold flex items-center text-gray-700">
                                                <Info className="mr-2 h-4 w-4 text-gray-500" />
                                                Administrative Data
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <dl className="space-y-3">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Created on</dt>
                                                    <dd className="text-sm font-medium">
                                                        {viewingCategoryDetails.createdAt ? new Date(viewingCategoryDetails.createdAt).toLocaleString() : '—'}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Created by</dt>
                                                    <dd className="text-sm font-medium">{viewingCategoryDetails.createdBy ?? '—'}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Last changed on</dt>
                                                    <dd className="text-sm font-medium">
                                                        {viewingCategoryDetails.updatedAt ? new Date(viewingCategoryDetails.updatedAt).toLocaleString() : '—'}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Last changed by</dt>
                                                    <dd className="text-sm font-medium">{viewingCategoryDetails.updatedBy ?? '—'}</dd>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t border-gray-100">
                                                    <dt className="text-sm text-gray-500">Tenant</dt>
                                                    <dd className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                                                        {viewingCategoryDetails.tenantId || '001'}
                                                    </dd>
                                                </div>
                                                {viewingCategoryDetails.deletedAt && (
                                                    <div className="flex justify-between pt-2 border-t border-red-100">
                                                        <dt className="text-sm text-red-500 flex items-center">
                                                            <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                                            Deletion Flag
                                                        </dt>
                                                        <dd className="text-sm text-red-600 font-medium">
                                                            Yes (Soft Deleted on {new Date(viewingCategoryDetails.deletedAt).toLocaleDateString()})
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
