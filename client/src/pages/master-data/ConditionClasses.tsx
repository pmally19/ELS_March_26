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

interface ConditionClass {
    id: number;
    class_code: string;
    class_name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Condition Class Details</DialogTitle>
                        <DialogDescription>
                            Detailed information for {viewingClass?.class_code}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingClass && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Code</Label>
                                    <p className="font-mono font-semibold text-2xl">{viewingClass.class_code}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                        <Badge variant={viewingClass.is_active ? "default" : "secondary"}>
                                            {viewingClass.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Name</Label>
                                <p className="font-semibold">{viewingClass.class_name}</p>
                            </div>
                            {viewingClass.description && (
                                <div>
                                    <Label className="text-muted-foreground">Description</Label>
                                    <p>{viewingClass.description}</p>
                                </div>
                            )}
                            {viewingClass.created_at && (
                                <div className="text-sm text-muted-foreground">
                                    Created: {new Date(viewingClass.created_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
