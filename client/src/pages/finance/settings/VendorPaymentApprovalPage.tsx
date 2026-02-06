import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Edit, Trash2, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface UserAuthorization {
    id: number;
    user_id: number;
    user_name?: string;
    user_email?: string;
    role: string;
    daily_limit: number;
    single_payment_limit: number;
    dual_approval_threshold: number;
    company_code_id?: number;
    company_code_name?: string;
}

interface VendorPaymentApprovalPageProps {
    onBack?: () => void;
}

export default function VendorPaymentApprovalPage({ onBack }: VendorPaymentApprovalPageProps) {
    const [, setLocation] = useLocation();
    const handleBack = onBack || (() => setLocation('/finance/ap-tiles'));
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserAuthorization | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        user_id: '',
        role: '',
        daily_limit: '',
        single_payment_limit: '',
        dual_approval_threshold: '',
    });

    // Fetch user authorization limits
    const { data: userLimits = [], isLoading } = useQuery({
        queryKey: ['/api/ap/authorization/users'],
        queryFn: async () => {
            const response = await fetch('/api/ap/authorization/users');
            if (!response.ok) throw new Error('Failed to fetch user limits');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch available users (who don't have limits yet)
    const { data: availableUsers = [] } = useQuery({
        queryKey: ['/api/ap/authorization/available-users'],
        queryFn: async () => {
            const response = await fetch('/api/ap/authorization/available-users');
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest('/api/ap/authorization/users', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            toast({ title: "User authorization created successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/available-users'] });
            handleDialogClose(false);
        },
        onError: (error: any) => {
            toast({ title: "Creation failed", description: error.message, variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (user: UserAuthorization) => {
            return await apiRequest(`/api/ap/authorization/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    role: user.role,
                    daily_limit: user.daily_limit,
                    single_payment_limit: user.single_payment_limit,
                    dual_approval_threshold: user.dual_approval_threshold,
                }),
            });
        },
        onSuccess: () => {
            toast({ title: "User authorization updated successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/users'] });
            setIsDialogOpen(false);
            setEditingUser(null);
        },
        onError: (error: any) => {
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest(`/api/ap/authorization/users/${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            toast({ title: "User authorization removed successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/available-users'] });
        },
        onError: (error: any) => {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            user_id: '',
            role: '',
            daily_limit: '',
            single_payment_limit: '',
            dual_approval_threshold: '',
        });
    };

    const handleCreate = () => {
        // Reset state properly before opening dialog
        setEditingUser(null);
        setIsCreating(true);
        resetForm();
        setIsDialogOpen(true);
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            // Reset all state when dialog closes
            setIsCreating(false);
            setEditingUser(null);
            resetForm();
        }
    };

    const handleEdit = (user: UserAuthorization) => {
        setIsCreating(false);
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (isCreating) {
            // Validate form data
            if (!formData.user_id || !formData.role || !formData.daily_limit ||
                !formData.single_payment_limit || !formData.dual_approval_threshold) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all fields",
                    variant: "destructive"
                });
                return;
            }

            createMutation.mutate({
                user_id: parseInt(formData.user_id),
                role: formData.role,
                daily_limit: parseFloat(formData.daily_limit),
                single_payment_limit: parseFloat(formData.single_payment_limit),
                dual_approval_threshold: parseFloat(formData.dual_approval_threshold),
                company_code_id: 1, // Default company code
            });
        } else if (editingUser) {
            // Validate editing user
            if (!editingUser.role || !editingUser.daily_limit ||
                !editingUser.single_payment_limit || !editingUser.dual_approval_threshold) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all fields",
                    variant: "destructive"
                });
                return;
            }

            updateMutation.mutate(editingUser);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to remove this user authorization?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/finance/ap-tiles'}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Users className="h-7 w-7" />
                            Vendor Payment Approver
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Assign payment approval limits to users
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreate}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign User
                </Button>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Approvers ({userLimits.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : userLimits.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No users have been assigned as payment approvers yet
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Daily Limit</TableHead>
                                    <TableHead>Single Payment</TableHead>
                                    <TableHead>Dual Threshold</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[120px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userLimits.map((user: UserAuthorization) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.user_name || `User ${user.user_id}`}</div>
                                                {user.user_email && (
                                                    <div className="text-xs text-muted-foreground">{user.user_email}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">${user.daily_limit.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">${user.single_payment_limit.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">${user.dual_approval_threshold.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Assign Payment Approver' : 'Edit Payment Approver'}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Configure payment approval limits for a user'
                                : 'Update payment approval limits'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isCreating ? (
                            <div className="space-y-2">
                                <Label htmlFor="user">Select User</Label>
                                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUsers.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={isCreating ? formData.role : editingUser?.role}
                                onValueChange={(value) =>
                                    isCreating
                                        ? setFormData({ ...formData, role: value })
                                        : setEditingUser(editingUser ? { ...editingUser, role: value } : null)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AP Clerk">AP Clerk</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                                    <SelectItem value="CFO">CFO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Daily Limit ($)</Label>
                                <Input
                                    type="number"
                                    value={isCreating ? formData.daily_limit : editingUser?.daily_limit}
                                    onChange={(e) =>
                                        isCreating
                                            ? setFormData({ ...formData, daily_limit: e.target.value })
                                            : setEditingUser(editingUser ? { ...editingUser, daily_limit: parseFloat(e.target.value) } : null)
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Single Payment ($)</Label>
                                <Input
                                    type="number"
                                    value={isCreating ? formData.single_payment_limit : editingUser?.single_payment_limit}
                                    onChange={(e) =>
                                        isCreating
                                            ? setFormData({ ...formData, single_payment_limit: e.target.value })
                                            : setEditingUser(editingUser ? { ...editingUser, single_payment_limit: parseFloat(e.target.value) } : null)
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Dual Approval Threshold ($)</Label>
                            <Input
                                type="number"
                                value={isCreating ? formData.dual_approval_threshold : editingUser?.dual_approval_threshold}
                                onChange={(e) =>
                                    isCreating
                                        ? setFormData({ ...formData, dual_approval_threshold: e.target.value })
                                        : setEditingUser(editingUser ? { ...editingUser, dual_approval_threshold: parseFloat(e.target.value) } : null)
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Payments above this amount require two approvers
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
