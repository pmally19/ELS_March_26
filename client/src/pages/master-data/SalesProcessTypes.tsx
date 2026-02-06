import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';

interface SalesProcessType {
    id: number;
    process_code: string;
    process_name: string;
    description: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export default function SalesProcessTypes() {
    const { toast } = useToast();
    const [items, setItems] = useState<SalesProcessType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SalesProcessType | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [formData, setFormData] = useState({
        processCode: '',
        processName: '',
        description: '',
        isActive: true,
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await apiRequest('/api/master-data/sales-process-types');
            if (!response.ok) throw new Error('Failed to fetch sales process types');
            const data = await response.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Error fetching sales process types:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch sales process types',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchItems();
        setIsRefreshing(false);
        toast({
            title: 'Refreshed',
            description: 'Sales process types list has been updated',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.processCode.trim() || !formData.processName.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Process code and name are required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const payload = {
                processCode: formData.processCode.trim().toUpperCase(),
                processName: formData.processName.trim(),
                description: formData.description.trim(),
                isActive: formData.isActive,
            };

            if (editingItem) {
                const response = await apiRequest(`/api/master-data/sales-process-types/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update sales process type');
                }

                toast({
                    title: 'Success',
                    description: 'Sales process type updated successfully',
                });
            } else {
                const response = await apiRequest('/api/master-data/sales-process-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create sales process type');
                }

                toast({
                    title: 'Success',
                    description: 'Sales process type created successfully',
                });
            }

            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({ processCode: '', processName: '', description: '', isActive: true });
            fetchItems();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    const handleEdit = (item: SalesProcessType) => {
        setEditingItem(item);
        setFormData({
            processCode: item.process_code,
            processName: item.process_name,
            description: item.description || '',
            isActive: item.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const item = items.find(i => i.id === id);
        if (!window.confirm(`Are you sure you want to delete ${item?.process_name}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await apiRequest(`/api/master-data/sales-process-types/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete sales process type');
            }

            toast({
                title: 'Success',
                description: 'Sales process type deleted successfully',
            });
            fetchItems();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete sales process type',
                variant: 'destructive',
            });
        }
    };

    const handleNew = () => {
        setEditingItem(null);
        setFormData({ processCode: '', processName: '', description: '', isActive: true });
        setIsDialogOpen(true);
    };

    const filteredItems = items.filter((item) => {
        const searchLower = search.toLowerCase();
        return (
            item.process_code.toLowerCase().includes(searchLower) ||
            item.process_name.toLowerCase().includes(searchLower) ||
            (item.description && item.description.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Sales Process Types</h1>
                        <p className="text-sm text-muted-foreground">
                            Define process types for sales documents (ORDER, DELIVERY, BILLING)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by code, name, or description..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Process Types</CardTitle>
                    <CardDescription>
                        All sales process types in the system ({filteredItems.length} total)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {search ? 'No sales process types found matching your search' : 'No sales process types found'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Process Code</TableHead>
                                        <TableHead>Process Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium font-mono">{item.process_code}</TableCell>
                                            <TableCell>{item.process_name}</TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {item.description || <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Edit Sales Process Type' : 'Create Sales Process Type'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'Update the sales process type details below'
                                : 'Add a new sales process type to the system'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="processCode">
                                    Process Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="processCode"
                                    value={formData.processCode}
                                    onChange={(e) => setFormData({ ...formData, processCode: e.target.value.toUpperCase() })}
                                    placeholder="e.g., ORDER"
                                    required
                                    disabled={!!editingItem}
                                    maxLength={20}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Unique code (auto-converted to uppercase, max 20 characters)
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="processName">
                                    Process Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="processName"
                                    value={formData.processName}
                                    onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                                    placeholder="e.g., Order Processing"
                                    required
                                    maxLength={100}
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the purpose of this process type"
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isActive: checked as boolean })
                                    }
                                />
                                <Label htmlFor="isActive" className="cursor-pointer">
                                    Active
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setEditingItem(null);
                                    setFormData({ processCode: '', processName: '', description: '', isActive: true });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingItem ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
