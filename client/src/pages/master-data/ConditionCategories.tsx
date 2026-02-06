import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, MoreHorizontal, Download, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ConditionCategory {
    id: number;
    category_code: string;
    category_name: string;
    category_type: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export default function ConditionCategories() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ConditionCategory | null>(null);
    const [viewingCategory, setViewingCategory] = useState<ConditionCategory | null>(null);
    const [formData, setFormData] = useState({
        category_code: "",
        category_name: "",
        category_type: "",
        description: "",
        sort_order: 1,
        is_active: true,
    });

    // Fetch categories
    const { data: categories = [], isLoading, error } = useQuery({
        queryKey: ['/api/master-data/condition-categories'],
        queryFn: async () => {
            const res = await apiRequest('/api/master-data/condition-categories');
            if (!res.ok) throw new Error('Failed to fetch condition categories');
            return res.json();
        }
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const url = editingCategory
                ? `/api/master-data/condition-categories/${editingCategory.id}`
                : '/api/master-data/condition-categories';
            const method = editingCategory ? 'PUT' : 'POST';

            const res = await apiRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save category');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-categories'] });
            toast({
                title: "Success",
                description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
            });
            handleCloseDialog();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/master-data/condition-categories/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete category');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-categories'] });
            toast({
                title: "Success",
                description: "Category deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleCreate = () => {
        setEditingCategory(null);
        setFormData({
            category_code: "",
            category_name: "",
            category_type: "",
            description: "",
            sort_order: 1,
            is_active: true,
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (category: ConditionCategory) => {
        setEditingCategory(category);
        setFormData({
            category_code: category.category_code,
            category_name: category.category_name,
            category_type: category.category_type,
            description: category.description || "",
            sort_order: category.sort_order,
            is_active: category.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleViewDetails = (category: ConditionCategory) => {
        setViewingCategory(category);
        setIsViewDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleExport = () => {
        const csv = [
            ['Code', 'Name', 'Type', 'Description', 'Sort Order', 'Status'],
            ...filteredCategories.map(cat => [
                cat.category_code,
                cat.category_name,
                cat.category_type,
                cat.description || '',
                cat.sort_order.toString(),
                cat.is_active ? 'Active' : 'Inactive'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `condition-categories-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredCategories = categories.filter((cat: ConditionCategory) =>
        cat.category_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/master-data">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Condition Categories</h1>
                        <p className="text-muted-foreground">Manage pricing condition categories</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export to CSV
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code, name, or description..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-categories'] })}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Categories ({filteredCategories.length})</CardTitle>
                    <CardDescription>All condition categories in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600">Error loading categories</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Sort Order</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? 'No matching categories found' : 'No categories found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map((category: ConditionCategory) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-mono">{category.category_code}</TableCell>
                                            <TableCell className="font-medium">{category.category_name}</TableCell>
                                            <TableCell>{category.category_type}</TableCell>
                                            <TableCell className="max-w-xs truncate">{category.description || '-'}</TableCell>
                                            <TableCell>{category.sort_order}</TableCell>
                                            <TableCell>
                                                <Badge variant={category.is_active ? "default" : "secondary"}>
                                                    {category.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetails(category)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => deleteMutation.mutate(category.id)}
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
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? 'Update' : 'Add a new'} condition category
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category_code">Code *</Label>
                                <Input
                                    id="category_code"
                                    value={formData.category_code}
                                    onChange={(e) => setFormData({ ...formData, category_code: e.target.value.toUpperCase() })}
                                    placeholder="REV"
                                    required
                                    maxLength={20}
                                />
                            </div>
                            <div>
                                <Label htmlFor="sort_order">Sort Order *</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                    required
                                    min={1}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="category_name">Name *</Label>
                            <Input
                                id="category_name"
                                value={formData.category_name}
                                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                                placeholder="Revenue"
                                required
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <Label htmlFor="category_type">Type *</Label>
                            <Input
                                id="category_type"
                                value={formData.category_type}
                                onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                                placeholder="Revenue"
                                required
                                maxLength={50}
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Description of the category"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Category Details</DialogTitle>
                        <DialogDescription>
                            Detailed information for {viewingCategory?.category_code}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingCategory && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Code</Label>
                                    <p className="font-mono font-semibold">{viewingCategory.category_code}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Sort Order</Label>
                                    <p className="font-semibold">{viewingCategory.sort_order}</p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Name</Label>
                                <p className="font-semibold">{viewingCategory.category_name}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Type</Label>
                                <p>{viewingCategory.category_type}</p>
                            </div>
                            {viewingCategory.description && (
                                <div>
                                    <Label className="text-muted-foreground">Description</Label>
                                    <p>{viewingCategory.description}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground">Status</Label>
                                <div className="mt-1">
                                    <Badge variant={viewingCategory.is_active ? "default" : "secondary"}>
                                        {viewingCategory.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            {viewingCategory.created_at && (
                                <div className="text-sm text-muted-foreground">
                                    Created: {new Date(viewingCategory.created_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
