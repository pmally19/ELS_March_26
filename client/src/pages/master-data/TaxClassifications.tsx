import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface TaxClassification {
    id: number;
    code: string;
    description: string;
    tax_applicable: boolean;
    applies_to: 'CUSTOMER' | 'MATERIAL' | 'BOTH';
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

const TaxClassifications = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TaxClassification | null>(null);
    const [formData, setFormData] = useState<Partial<TaxClassification>>({
        code: '',
        description: '',
        tax_applicable: true,
        applies_to: 'BOTH',
        is_active: true
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch Data
    const { data: classifications = [], isLoading } = useQuery({
        queryKey: ['tax-classifications'],
        queryFn: async () => {
            const res = await fetch('/api/master-data/tax-classifications');
            if (!res.ok) throw new Error('Failed to fetch tax classifications');
            return res.json() as Promise<TaxClassification[]>;
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (newItem: Partial<TaxClassification>) => {
            const res = await fetch('/api/master-data/tax-classifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || err.error || 'Failed to create');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-classifications'] });
            toast({ title: 'Success', description: 'Tax classification created successfully' });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TaxClassification> }) => {
            const res = await fetch(`/api/master-data/tax-classifications/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-classifications'] });
            toast({ title: 'Success', description: 'Updated successfully' });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/master-data/tax-classifications/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || err.error || 'Failed to delete');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-classifications'] });
            toast({ title: 'Success', description: 'Deleted successfully' });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            tax_applicable: true,
            applies_to: 'BOTH',
            is_active: true
        });
        setEditingItem(null);
    };

    const handleEdit = (item: TaxClassification) => {
        setEditingItem(item);
        setFormData(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this classification? This cannot be undone if it is in use.')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredData = classifications.filter((item: TaxClassification) =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 w-fit"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tax Classifications</h1>
                        <p className="text-muted-foreground">
                            Define tax relevance indicators for customers and materials (e.g., 0 = Exempt, 1 = Liable)
                        </p>
                    </div>
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Classification
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Classifications</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search classifications..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-[300px]"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Code</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-[150px]">Applies To</TableHead>
                                        <TableHead className="w-[150px]">Tax Applicable</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No classifications found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((item: TaxClassification) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-mono font-medium">{item.code}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        item.applies_to === 'BOTH' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            item.applies_to === 'CUSTOMER' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                'bg-orange-50 text-orange-700 border-orange-200'
                                                    }>
                                                        {item.applies_to}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.tax_applicable ? (
                                                        <Badge className="bg-green-600">Yes</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">No</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {item.is_active ? (
                                                        <span className="flex items-center gap-2 text-green-600 text-sm">
                                                            <span className="h-2 w-2 rounded-full bg-green-600" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-gray-400 text-sm">
                                                            <span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
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
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Classification' : 'Add Classification'}</DialogTitle>
                        <DialogDescription>
                            Define a tax indicator code (e.g. 0, 1) and its meaning.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. 1"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    disabled={!!editingItem} // Code usually shouldn't change
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="applies_to">Applies To</Label>
                                <Select
                                    value={formData.applies_to}
                                    onValueChange={(val: any) => setFormData({ ...formData, applies_to: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BOTH">Both</SelectItem>
                                        <SelectItem value="CUSTOMER">Customer Only</SelectItem>
                                        <SelectItem value="MATERIAL">Material Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="e.g. Full Tax - Standard Rate"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Tax Applicable</Label>
                                <div className="text-xs text-muted-foreground">
                                    Does this code mean tax should be calculated?
                                </div>
                            </div>
                            <Switch
                                checked={formData.tax_applicable}
                                onCheckedChange={(checked) => setFormData({ ...formData, tax_applicable: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <div className="text-xs text-muted-foreground">
                                    Is this classification currently in use?
                                </div>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingItem ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaxClassifications;
