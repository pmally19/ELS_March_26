import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Plus, Search, RefreshCw, Eye, Edit, Trash2, MoreHorizontal,
    Download, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

interface CalculationMethod {
    id: number;
    method_code: string;
    method_name: string;
    calculation_type: string;
    formula_template?: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export default function CalculationMethods() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<CalculationMethod | null>(null);
    const [viewingMethod, setViewingMethod] = useState<CalculationMethod | null>(null);
    const [formData, setFormData] = useState({
        method_code: "",
        method_name: "",
        calculation_type: "",
        formula_template: "",
        description: "",
        is_active: true,
    });

    // Fetch calculation methods
    const { data: methods = [], isLoading, error } = useQuery({
        queryKey: ['/api/master-data/calculation-methods'],
        queryFn: async () => {
            const res = await apiRequest('/api/master-data/calculation-methods');
            if (!res.ok) throw new Error('Failed to fetch calculation methods');
            return res.json();
        }
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const url = editingMethod
                ? `/api/master-data/calculation-methods/${editingMethod.id}`
                : '/api/master-data/calculation-methods';
            const method = editingMethod ? 'PUT' : 'POST';

            const res = await apiRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save calculation method');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/calculation-methods'] });
            toast({
                title: "Success",
                description: `Calculation Method ${editingMethod ? 'updated' : 'created'} successfully`,
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
            const res = await apiRequest(`/api/master-data/calculation-methods/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete calculation method');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/calculation-methods'] });
            toast({
                title: "Success",
                description: "Calculation Method deleted successfully",
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
        setEditingMethod(null);
        setFormData({
            method_code: "",
            method_name: "",
            calculation_type: "",
            formula_template: "",
            description: "",
            is_active: true,
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (method: CalculationMethod) => {
        setEditingMethod(method);
        setFormData({
            method_code: method.method_code,
            method_name: method.method_name,
            calculation_type: method.calculation_type,
            formula_template: method.formula_template || "",
            description: method.description || "",
            is_active: method.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleViewDetails = (method: CalculationMethod) => {
        setViewingMethod(method);
        setIsViewDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingMethod(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleExport = () => {
        const csv = [
            ['Code', 'Name', 'Calculation Type', 'Formula Template', 'Description', 'Status'],
            ...filteredMethods.map(m => [
                m.method_code,
                m.method_name,
                m.calculation_type,
                m.formula_template || '',
                m.description || '',
                m.is_active ? 'Active' : 'Inactive'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calculation-methods-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredMethods = methods.filter((m: CalculationMethod) =>
        m.method_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.method_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.calculation_type && m.calculation_type.toLowerCase().includes(searchQuery.toLowerCase()))
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
                        <h1 className="text-3xl font-bold">Calculation Types</h1>
                        <p className="text-muted-foreground">Manage calculation methods and logic</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export to CSV
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Method
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code, name, or type..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/calculation-methods'] })}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Calculation Methods ({filteredMethods.length})</CardTitle>
                    <CardDescription>Available calculation types for pricing conditions</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600">Error loading methods</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMethods.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? 'No matching methods found' : 'No methods found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMethods.map((method: CalculationMethod) => (
                                        <TableRow key={method.id}>
                                            <TableCell className="font-mono">{method.method_code}</TableCell>
                                            <TableCell className="font-medium">{method.method_name}</TableCell>
                                            <TableCell>{method.calculation_type}</TableCell>
                                            <TableCell className="max-w-xs truncate">{method.description || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={method.is_active ? "default" : "secondary"}>
                                                    {method.is_active ? "Active" : "Inactive"}
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
                                                        <DropdownMenuItem onClick={() => handleViewDetails(method)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(method)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => deleteMutation.mutate(method.id)}
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingMethod ? 'Edit' : 'Create'} Calculation Method</DialogTitle>
                        <DialogDescription>
                            {editingMethod ? 'Update' : 'Add a new'} calculation type configuration
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="method_code">Method Code *</Label>
                                <Input
                                    id="method_code"
                                    value={formData.method_code}
                                    onChange={(e) => setFormData({ ...formData, method_code: e.target.value.toUpperCase() })}
                                    placeholder="PCT"
                                    required
                                    maxLength={20}
                                />
                            </div>
                            <div>
                                <Label htmlFor="calculation_type">Logic Type *</Label>
                                <Input
                                    id="calculation_type"
                                    value={formData.calculation_type}
                                    onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value })}
                                    placeholder="percentage"
                                    required
                                    maxLength={50}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="method_name">Method Name *</Label>
                            <Input
                                id="method_name"
                                value={formData.method_name}
                                onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                                placeholder="Percentage Calculation"
                                required
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <Label htmlFor="formula_template">Formula Template (Optional)</Label>
                            <Input
                                id="formula_template"
                                value={formData.formula_template}
                                onChange={(e) => setFormData({ ...formData, formula_template: e.target.value })}
                                placeholder="amount * percentage / 100"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detailed description of the calculation logic"
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
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Method Details</DialogTitle>
                        <DialogDescription>
                            Algorithm details for {viewingMethod?.method_code}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingMethod && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Code</Label>
                                    <p className="font-mono font-semibold">{viewingMethod.method_code}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Type</Label>
                                    <p className="font-semibold">{viewingMethod.calculation_type}</p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Name</Label>
                                <p className="font-semibold">{viewingMethod.method_name}</p>
                            </div>
                            {viewingMethod.formula_template && (
                                <div>
                                    <Label className="text-muted-foreground">Formula</Label>
                                    <p className="font-mono bg-muted p-2 rounded text-sm">{viewingMethod.formula_template}</p>
                                </div>
                            )}
                            {viewingMethod.description && (
                                <div>
                                    <Label className="text-muted-foreground">Description</Label>
                                    <p>{viewingMethod.description}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground">Status</Label>
                                <div className="mt-1">
                                    <Badge variant={viewingMethod.is_active ? "default" : "secondary"}>
                                        {viewingMethod.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            {viewingMethod.created_at && (
                                <div className="text-sm text-muted-foreground border-t pt-4 mt-4">
                                    Created: {new Date(viewingMethod.created_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
