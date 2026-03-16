import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Plus,
    CheckCircle2,
    XCircle,
    DollarSign,
    Calendar,
    Building,
    Layers,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AUCDetails {
    id: number;
    asset_number: string;
    asset_description: string;
    auc_status: string;
    company_code: string;
    company_name: string;
    asset_class_name: string;
    asset_class_code: string;
    construction_start_date: string;
    planned_capitalization_date?: string;
    actual_capitalization_date?: string;
    wip_account_code: string;
    settlement_profile?: string;
    total_cost?: number;
    settled_cost?: number;
    unsettled_cost?: number;
    cost_count?: number;
    parent_asset_number?: string;
    created_at: string;
}

interface AUCCost {
    id: number;
    cost_type: string;
    cost_element_code: string;
    cost_amount: number;
    posting_date: string;
    vendor_name?: string;
    purchase_order_id?: number;
    goods_receipt_id?: number;
    document_number?: string;
    description?: string;
    is_settled: boolean;
    settlement_date?: string;
    cost_center_code?: string;
}

export default function AUCDetails() {
    const params = useParams();
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const aucId = parseInt(params.id || '0');

    const [activeTab, setActiveTab] = useState('general');
    const [showAddCostDialog, setShowAddCostDialog] = useState(false);
    const [showCapitalizeDialog, setShowCapitalizeDialog] = useState(false);

    // Fetch AUC details
    const { data: auc, isLoading } = useQuery({
        queryKey: ['auc', aucId],
        queryFn: async () => {
            const response = await fetch(`/api/auc-management/${aucId}`);
            if (!response.ok) throw new Error('Failed to fetch AUC');
            const result = await response.json();
            return result.data as AUCDetails;
        },
        enabled: aucId > 0,
    });

    // Fetch costs
    const { data: costs } = useQuery({
        queryKey: ['auc-costs', aucId],
        queryFn: async () => {
            const response = await fetch(`/api/auc-management/${aucId}/costs`);
            if (!response.ok) throw new Error('Failed to fetch costs');
            const result = await response.json();
            return result.data as AUCCost[];
        },
        enabled: aucId > 0,
    });

    // Fetch Asset Classes
    const { data: assetClasses } = useQuery({
        queryKey: ['asset-classes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/asset-classes');
            if (!response.ok) throw new Error('Failed to fetch asset classes');
            return response.json();
        },
    });

    // Fetch Depreciation Methods
    const { data: depreciationMethods } = useQuery({
        queryKey: ['depreciation-methods'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/depreciation-methods');
            if (!response.ok) throw new Error('Failed to fetch depreciation methods');
            return response.json();
        },
    });

    // Capitalize mutation
    const capitalizeMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/auc-management/capitalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to capitalize AUC');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auc', aucId] });
            queryClient.invalidateQueries({ queryKey: ['auc-costs', aucId] });
            toast({
                title: 'Success',
                description: 'AUC capitalized successfully',
            });
            setShowCapitalizeDialog(false);
            navigate('/transactions/auc');
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Add Cost mutation
    const addCostMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/auc-management/costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add cost');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auc', aucId] });
            queryClient.invalidateQueries({ queryKey: ['auc-costs', aucId] });
            toast({
                title: 'Success',
                description: 'Cost added successfully',
            });
            setShowAddCostDialog(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string; icon: any }> = {
            in_progress: { variant: 'default', label: 'In Progress', icon: null },
            capitalized: { variant: 'default', label: 'Capitalized', icon: CheckCircle2 },
            abandoned: { variant: 'destructive', label: 'Abandoned', icon: XCircle },
        };

        const config = variants[status] || variants.in_progress;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                {Icon && <Icon className="h-3 w-3" />}
                {config.label}
            </Badge>
        );
    };

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!auc) {
        return <div className="p-6">AUC not found</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/transactions/auc')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{auc.asset_number}</h1>
                        <p className="text-sm text-gray-500">{auc.asset_description}</p>
                    </div>
                    {getStatusBadge(auc.auc_status)}
                </div>

                {auc.auc_status === 'in_progress' && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAddCostDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Cost
                        </Button>
                        <Button onClick={() => setShowCapitalizeDialog(true)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Capitalize
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">Total Cost</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(auc.total_cost)}</div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-gray-500">Unsettled</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(auc.unsettled_cost)}
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">Cost Entries</span>
                    </div>
                    <div className="text-2xl font-bold">{auc.cost_count || 0}</div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">Duration</span>
                    </div>
                    <div className="text-2xl font-bold">
                        {Math.ceil(
                            (new Date().getTime() - new Date(auc.construction_start_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                    </div>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="costs">
                        Costs {costs && `(${costs.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label className="text-sm text-gray-500">Asset Number</Label>
                                <div className="font-medium">{auc.asset_number}</div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Asset Description</Label>
                                <div className="font-medium">{auc.asset_description}</div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Company Code</Label>
                                <div className="font-medium">
                                    {auc.company_code} - {auc.company_name}
                                </div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Asset Class</Label>
                                <div className="font-medium">
                                    {auc.asset_class_code} - {auc.asset_class_name}
                                </div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">WIP Account</Label>
                                <div className="font-medium">{auc.wip_account_code}</div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Settlement Profile</Label>
                                <div className="font-medium">{auc.settlement_profile || '-'}</div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Construction Start Date</Label>
                                <div className="font-medium">{formatDate(auc.construction_start_date)}</div>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-500">Planned Capitalization</Label>
                                <div className="font-medium">{formatDate(auc.planned_capitalization_date)}</div>
                            </div>

                            {auc.actual_capitalization_date && (
                                <div>
                                    <Label className="text-sm text-gray-500">Actual Capitalization</Label>
                                    <div className="font-medium">
                                        {formatDate(auc.actual_capitalization_date)}
                                    </div>
                                </div>
                            )}

                            {auc.parent_asset_number && (
                                <div>
                                    <Label className="text-sm text-gray-500">Capitalized to Asset</Label>
                                    <div className="font-medium">{auc.parent_asset_number}</div>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="costs">
                    <Card className="p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Cost Element</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!costs || costs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No costs recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    costs.map((cost) => (
                                        <TableRow key={cost.id}>
                                            <TableCell>{formatDate(cost.posting_date)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{cost.cost_type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {cost.cost_element_code}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {cost.description || '-'}
                                            </TableCell>
                                            <TableCell>{cost.vendor_name || '-'}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(cost.cost_amount)}
                                            </TableCell>
                                            <TableCell>
                                                {cost.is_settled ? (
                                                    <Badge variant="default">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Settled
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Unsettled</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="p-4">
                        <div className="text-center py-8 text-gray-500">
                            No history available
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Cost Dialog */}
            <Dialog open={showAddCostDialog} onOpenChange={setShowAddCostDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Cost Entry</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            addCostMutation.mutate({
                                auc_id: aucId,
                                posting_date: formData.get('posting_date'),
                                cost_type: formData.get('cost_type'),
                                cost_element_code: formData.get('cost_element_code'),
                                cost_amount: parseFloat(formData.get('cost_amount') as string),
                                description: formData.get('description'),
                                document_number: formData.get('document_number'),
                                user_id: 1, // TODO: Get from auth
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="posting_date">Posting Date *</Label>
                            <Input
                                id="posting_date"
                                name="posting_date"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div>
                            <Label htmlFor="cost_type">Cost Type *</Label>
                            <Select name="cost_type" required defaultValue="material">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material">Material</SelectItem>
                                    <SelectItem value="labor">Labor</SelectItem>
                                    <SelectItem value="overhead">Overhead</SelectItem>
                                    <SelectItem value="external_service">External Service</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="cost_element_code">Cost Element / GL Account *</Label>
                            <Input
                                id="cost_element_code"
                                name="cost_element_code"
                                placeholder="e.g. 400000"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="cost_amount">Amount *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                <Input
                                    id="cost_amount"
                                    name="cost_amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="pl-7"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="document_number">Document Number</Label>
                            <Input
                                id="document_number"
                                name="document_number"
                                placeholder="Optional"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Enter cost details..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddCostDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addCostMutation.isPending}>
                                {addCostMutation.isPending ? 'Adding...' : 'Add Cost'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Capitalize Dialog */}
            <Dialog open={showCapitalizeDialog} onOpenChange={setShowCapitalizeDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Capitalize AUC to Fixed Asset</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            capitalizeMutation.mutate({
                                auc_id: aucId,
                                capitalization_date: formData.get('capitalization_date'),
                                depreciation_start_date: formData.get('depreciation_start_date'),
                                asset_class_id: parseInt(formData.get('asset_class_id') as string),
                                depreciation_method_id: formData.get('depreciation_method_id') ? parseInt(formData.get('depreciation_method_id') as string) : undefined,
                                user_id: 1, // TODO: Get from auth context
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label>Total Cost to Capitalize</Label>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(auc.unsettled_cost)}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                This amount will be transferred to a new fixed asset
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="capitalization_date">Capitalization Date *</Label>
                            <Input
                                id="capitalization_date"
                                name="capitalization_date"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div>
                            <Label htmlFor="asset_class_id">Asset Class *</Label>
                            <Select name="asset_class_id" defaultValue={auc.asset_class_id.toString()} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Asset Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assetClasses?.map((ac: any) => (
                                        <SelectItem key={ac.id} value={ac.id.toString()}>
                                            {ac.code} - {ac.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="depreciation_method_id">Depreciation Method</Label>
                            <Select name="depreciation_method_id">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Method (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {depreciationMethods?.map((dm: any) => (
                                        <SelectItem key={dm.id} value={dm.id.toString()}>
                                            {dm.code} - {dm.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="depreciation_start_date">Depreciation Start Date</Label>
                            <Input
                                id="depreciation_start_date"
                                name="depreciation_start_date"
                                type="date"
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-sm text-yellow-800">
                                <strong>Warning:</strong> This action cannot be undone. The AUC will be marked
                                as capitalized and a new fixed asset will be created.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCapitalizeDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={capitalizeMutation.isPending}>
                                {capitalizeMutation.isPending ? 'Capitalizing...' : 'Capitalize'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
