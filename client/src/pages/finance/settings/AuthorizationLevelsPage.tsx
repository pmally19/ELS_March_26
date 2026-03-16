import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings2, Edit, DollarSign, Shield, CheckCircle2, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface AuthorizationLevel {
    id: number;
    level_name: string;
    level_order: number;
    min_amount: number;
    max_amount: number | null;
    requires_dual_approval: boolean;
}

interface AuthorizationSettingsPageProps {
    onBack?: () => void;
}

export default function AuthorizationSettingsPage({ onBack }: AuthorizationSettingsPageProps) {
    const [, setLocation] = useLocation();
    const handleBack = onBack || (() => setLocation('/finance/ap-tiles'));
    const [editingLevel, setEditingLevel] = useState<AuthorizationLevel | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch authorization levels
    const { data: levels = [], isLoading } = useQuery({
        queryKey: ['/api/ap/authorization/levels'],
        queryFn: async () => {
            const response = await fetch('/api/ap/authorization/levels');
            if (!response.ok) throw new Error('Failed to fetch levels');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Update level mutation
    const updateLevelMutation = useMutation({
        mutationFn: async (level: AuthorizationLevel) => {
            return await apiRequest(`/api/ap/authorization/levels/${level.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    level_name: level.level_name,
                    min_amount: level.min_amount,
                    max_amount: level.max_amount,
                    requires_dual_approval: level.requires_dual_approval,
                }),
            });
        },
        onSuccess: () => {
            toast({ title: "Authorization level updated successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/ap/authorization/levels'] });
            setIsDialogOpen(false);
            setEditingLevel(null);
        },
        onError: (error: any) => {
            toast({
                title: "Update failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleEdit = (level: AuthorizationLevel) => {
        setEditingLevel(level);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (editingLevel) {
            updateLevelMutation.mutate(editingLevel);
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
                            <Settings2 className="h-7 w-7" />
                            Authorization Levels
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Configure payment authorization hierarchy and approval thresholds
                        </p>
                    </div>
                </div>
                <Button onClick={() => window.location.href = '/finance/settings/vendor-payment-approval'}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Approvers
                </Button>
            </div>

            {/* Info Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3 text-sm">
                        <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">How Authorization Levels Work</p>
                            <p className="text-muted-foreground mt-1">
                                Each level defines a spending authority range. Payments are automatically routed to the appropriate
                                approver based on amount. Dual approval can be required for high-value transactions within a level.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Levels Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Authorization Hierarchy</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Level</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Min Amount</TableHead>
                                    <TableHead>Max Amount</TableHead>
                                    <TableHead>Dual Approval</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {levels.map((level: AuthorizationLevel) => (
                                    <TableRow key={level.id}>
                                        <TableCell className="font-medium">{level.level_order}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{level.level_name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">
                                                ${level.min_amount.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">
                                                {level.max_amount ? `$${level.max_amount.toLocaleString()}` : 'Unlimited'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {level.requires_dual_approval ? (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                    Required
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Not Required
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(level)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Authorization Level</DialogTitle>
                        <DialogDescription>
                            Update the authorization level settings. Changes affect all future payment authorizations.
                        </DialogDescription>
                    </DialogHeader>

                    {editingLevel && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="level_name">Role Name</Label>
                                <Input
                                    id="level_name"
                                    value={editingLevel.level_name}
                                    onChange={(e) =>
                                        setEditingLevel({ ...editingLevel, level_name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="min_amount">Min Amount ($)</Label>
                                    <Input
                                        id="min_amount"
                                        type="number"
                                        value={editingLevel.min_amount}
                                        onChange={(e) =>
                                            setEditingLevel({ ...editingLevel, min_amount: parseFloat(e.target.value) })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max_amount">Max Amount ($)</Label>
                                    <Input
                                        id="max_amount"
                                        type="number"
                                        value={editingLevel.max_amount || ''}
                                        placeholder="Leave empty for unlimited"
                                        onChange={(e) =>
                                            setEditingLevel({
                                                ...editingLevel,
                                                max_amount: e.target.value ? parseFloat(e.target.value) : null,
                                            })
                                        }
                                    />
                                </div>
                            </div>



                            <div className="flex items-center space-x-2 rounded-md border p-4">
                                <input
                                    type="checkbox"
                                    id="dual_approval"
                                    checked={editingLevel.requires_dual_approval}
                                    onChange={(e) =>
                                        setEditingLevel({ ...editingLevel, requires_dual_approval: e.target.checked })
                                    }
                                    className="h-4 w-4"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="dual_approval" className="font-medium cursor-pointer">
                                        Require Dual Approval
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Payments require two different approvers
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={updateLevelMutation.isPending}>
                            {updateLevelMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
