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
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, MoreHorizontal, Download, ArrowLeft, Info, ChevronDown, ChevronRight, Calculator } from "lucide-react";
import { Link } from "wouter";

interface ConditionClass {
    id: number;
    class_code: string;
    class_name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    created_by?: number | null;
    updated_by?: number | null;
    tenant_id?: string;
}

export default function ConditionClasses() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ConditionClass | null>(null);
    const [viewingClass, setViewingClass] = useState<ConditionClass | null>(null);
    const [formData, setFormData] = useState({
        class_code: "",
        class_name: "",
        description: "",
        is_active: true,
    });
    const [adminDataOpen, setAdminDataOpen] = useState(false);

    // Fetch condition classes
    const { data: conditionClasses = [], isLoading, error } = useQuery({
        queryKey: ['/api/master-data/condition-classes'],
        queryFn: async () => {
            const res = await apiRequest('/api/master-data/condition-classes');
            if (!res.ok) throw new Error('Failed to fetch condition classes');
            return res.json();
        }
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const url = editingClass
                ? `/api/master-data/condition-classes/${editingClass.id}`
                : '/api/master-data/condition-classes';
            const method = editingClass ? 'PUT' : 'POST';

            const res = await apiRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save condition class');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-classes'] });
            toast({
                title: "Success",
                description: `Condition class ${editingClass ? 'updated' : 'created'} successfully`,
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
            const res = await apiRequest(`/api/master-data/condition-classes/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete condition class');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-classes'] });
            toast({
                title: "Success",
                description: "Condition class deleted successfully",
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
        setEditingClass(null);
        setFormData({
            class_code: "",
            class_name: "",
            description: "",
            is_active: true,
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (cls: ConditionClass) => {
        setEditingClass(cls);
        setFormData({
            class_code: cls.class_code,
            class_name: cls.class_name,
            description: cls.description || "",
            is_active: cls.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleViewDetails = (cls: ConditionClass) => {
        setViewingClass(cls);
        setIsViewDialogOpen(true);
        setAdminDataOpen(false);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingClass(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleExport = () => {
        const csv = [
            ['Code', 'Name', 'Description', 'Status'],
            ...filteredClasses.map(cls => [
                cls.class_code,
                cls.class_name,
                cls.description || '',
                cls.is_active ? 'Active' : 'Inactive'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `condition-classes-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredClasses = conditionClasses.filter((cls: ConditionClass) =>
        cls.class_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cls.description && cls.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
                        <h1 className="text-3xl font-bold">Condition Classes</h1>
                        <p className="text-muted-foreground">Manage condition classes (A=Discount, B=Prices, C=Expense, D=Taxes, E=Jurisdiction)</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export to CSV
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Condition Class
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
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/master-data/condition-classes'] })}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Condition Classes ({filteredClasses.length})</CardTitle>
                    <CardDescription>All condition classes in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-600">Error loading condition classes</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClasses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? 'No matching condition classes found' : 'No condition classes found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredClasses.map((cls: ConditionClass) => (
                                        <TableRow key={cls.id}>
                                            <TableCell className="font-mono font-bold text-lg">{cls.class_code}</TableCell>
                                            <TableCell className="font-medium">{cls.class_name}</TableCell>
                                            <TableCell className="max-w-xs truncate">{cls.description || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={cls.is_active ? "default" : "secondary"}>
                                                    {cls.is_active ? "Active" : "Inactive"}
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
                                                        <DropdownMenuItem onClick={() => handleViewDetails(cls)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(cls)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => deleteMutation.mutate(cls.id)}
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
                        <DialogTitle>{editingClass ? 'Edit' : 'Create'} Condition Class</DialogTitle>
                        <DialogDescription>
                            {editingClass ? 'Update' : 'Add a new'} condition class
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="class_code">Code * (1 character)</Label>
                                <Input
                                    id="class_code"
                                    value={formData.class_code}
                                    onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                                    placeholder="D"
                                    required
                                    maxLength={1}
                                />
                            </div>
                            <div>
                                <Label htmlFor="class_name">Name *</Label>
                                <Input
                                    id="class_name"
                                    value={formData.class_name}
                                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                    placeholder="Taxes"
                                    required
                                    maxLength={100}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="GST, VAT, and other tax conditions"
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
                                {saveMutation.isPending ? 'Saving...' : editingClass ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Condition Class Details</DialogTitle>
                        <DialogDescription>
                            Detailed information for {viewingClass?.class_code}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingClass && (
                        <div className="flex-1 overflow-y-auto space-y-6 p-6 pt-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center">
                                        <Calculator className="h-4 w-4 mr-2" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-4">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Class Code</dt>
                                            <dd className="text-lg font-mono font-bold text-gray-900">{viewingClass.class_code}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                                            <dd className="mt-1">
                                                <Badge variant={viewingClass.is_active ? "default" : "secondary"}>
                                                    {viewingClass.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Name</dt>
                                            <dd className="text-sm text-gray-900">{viewingClass.class_name}</dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-sm font-medium text-gray-500">Description</dt>
                                            <dd className="text-sm text-gray-900">{viewingClass.description || '—'}</dd>
                                        </div>
                                    </dl>
                                </CardContent>
                            </Card>

                            {/* ── Administrative Data (SAP ECC style) ────────────────── */}
                            <div className="border rounded-md overflow-hidden bg-white">
                                <button
                                    type="button"
                                    onClick={() => setAdminDataOpen(o => !o)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <Info className="h-3.5 w-3.5" />
                                        Administrative Data
                                    </span>
                                    {adminDataOpen
                                        ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                        : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                </button>

                                {adminDataOpen && (
                                    <dl className="px-4 py-3 space-y-2 bg-white">
                                        <div className="flex justify-between items-center">
                                            <dt className="text-xs text-gray-400">Created on</dt>
                                            <dd className="text-xs text-gray-500">
                                                {viewingClass.created_at
                                                    ? new Date(viewingClass.created_at).toLocaleString()
                                                    : '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                                            <dd className="text-xs text-gray-500">
                                                {viewingClass.created_by ?? '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <dt className="text-xs text-gray-400">Last changed on</dt>
                                            <dd className="text-xs text-gray-500">
                                                {viewingClass.updated_at
                                                    ? new Date(viewingClass.updated_at).toLocaleString()
                                                    : '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                                            <dd className="text-xs text-gray-500">
                                                {viewingClass.updated_by ?? '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <dt className="text-xs text-gray-400">Tenant ID</dt>
                                            <dd className="text-xs text-gray-500">
                                                {viewingClass.tenant_id ?? '—'}
                                            </dd>
                                        </div>
                                    </dl>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
