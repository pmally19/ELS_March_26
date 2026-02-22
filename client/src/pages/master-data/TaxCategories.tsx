import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function TaxCategories() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [formData, setFormData] = useState({
        tax_category_code: '',
        description: '',
        tax_type: 'INPUT_TAX',
        is_active: true
    });

    // Fetch tax categories
    const { data: taxCategories = [], isLoading } = useQuery({
        queryKey: ['/api/master-data/tax-categories'],
        queryFn: async () => {
            const res = await fetch('/api/master-data/tax-categories');
            if (!res.ok) throw new Error('Failed to fetch tax categories');
            return res.json();
        }
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/master-data/tax-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create tax category');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/tax-categories'] });
            setIsDialogOpen(false);
            resetForm();
            toast({
                title: 'Success',
                description: 'Tax category created successfully'
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/master-data/tax-categories/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update tax category');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/tax-categories'] });
            setIsDialogOpen(false);
            resetForm();
            toast({
                title: 'Success',
                description: 'Tax category updated successfully'
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/master-data/tax-categories/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete tax category');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/tax-categories'] });
            toast({
                title: 'Success',
                description: 'Tax category deleted successfully'
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const resetForm = () => {
        setFormData({
            tax_category_code: '',
            description: '',
            tax_type: 'INPUT_TAX',
            is_active: true
        });
        setEditingCategory(null);
    };

    const handleOpenDialog = (category?: any) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                tax_category_code: category.tax_category_code,
                description: category.description,
                tax_type: category.tax_type,
                is_active: category.is_active
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = () => {
        if (editingCategory) {
            updateMutation.mutate({ ...formData, id: editingCategory.id });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this tax category?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => setLocation('/master-data')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Master Data
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Tax Categories</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage tax categories for GL account assignment
                        </p>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Tax Category
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tax Categories</CardTitle>
                    <CardDescription>
                        {taxCategories.length} tax {taxCategories.length === 1 ? 'category' : 'categories'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : taxCategories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No tax categories found. Create one to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {taxCategories.map((category: any) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-mono font-semibold">
                                            {category.tax_category_code}
                                        </TableCell>
                                        <TableCell>{category.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {category.tax_type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {category.is_active ? (
                                                <Badge className="bg-green-500 text-white">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenDialog(category)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(category.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Tax Category' : 'Create Tax Category'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Tax Category Code (2 chars) *</Label>
                            <Input
                                id="code"
                                maxLength={2}
                                placeholder="A1, V1, 01"
                                value={formData.tax_category_code}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    tax_category_code: e.target.value.toUpperCase()
                                })}
                                disabled={!!editingCategory}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Input
                                id="description"
                                maxLength={50}
                                placeholder="Enter description"
                                value={formData.description}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    description: e.target.value
                                })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tax_type">Tax Type *</Label>
                            <Select
                                value={formData.tax_type}
                                onValueChange={(value) => setFormData({
                                    ...formData,
                                    tax_type: value
                                })}
                            >
                                <SelectTrigger id="tax_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INPUT_TAX">Input Tax</SelectItem>
                                    <SelectItem value="OUTPUT_TAX">Output Tax</SelectItem>
                                    <SelectItem value="BOTH">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    is_active: e.target.checked
                                })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
