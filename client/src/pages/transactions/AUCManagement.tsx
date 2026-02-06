import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { CreateAUCDialog } from '@/components/auc/CreateAUCDialog';

interface AUC {
    id: number;
    asset_number: string;
    name: string;
    auc_status: 'in_progress' | 'capitalized' | 'abandoned';
    company_code: string;
    company_name: string;
    asset_class_name: string;
    construction_start_date: string;
    planned_capitalization_date?: string;
    actual_capitalization_date?: string;
    wip_account_code: string;
    total_cost?: number;
    settled_cost?: number;
    unsettled_cost?: number;
    cost_count?: number;
    created_at: string;
}

export default function AUCManagement() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const pageSize = 20;

    // Fetch AUCs
    const { data, isLoading, error } = useQuery({
        queryKey: ['aucs', search, statusFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            params.append('limit', pageSize.toString());
            params.append('offset', ((page - 1) * pageSize).toString());

            const response = await fetch(`/api/auc-management?${params}`);
            if (!response.ok) throw new Error('Failed to fetch AUCs');
            return response.json();
        },
    });

    // Delete AUC mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/auc-management/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete AUC');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aucs'] });
            toast({
                title: 'Success',
                description: 'AUC deleted successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

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

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const handleExport = () => {
        if (!data?.data) return;

        const csvData = data.data.map((auc: AUC) => ({
            'Asset Number': auc.asset_number,
            'Description': auc.name,
            'Status': auc.auc_status,
            'Company': `${auc.company_code} - ${auc.company_name}`,
            'Asset Class': auc.asset_class_name,
            'Start Date': formatDate(auc.construction_start_date),
            'Planned Capitalization': formatDate(auc.planned_capitalization_date),
            'Total Cost': auc.total_cost || 0,
            'Unsettled Cost': auc.unsettled_cost || 0,
        }));

        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).join(',')),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auc-list-${new Date().toISOString()}.csv`;
        a.click();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Asset Under Construction (AUC)</h1>
                    <p className="text-sm text-gray-500">Manage construction-in-progress assets</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create AUC
                </Button>
            </div>

            <Card className="p-4">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search by asset number or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="capitalized">Capitalized</SelectItem>
                            <SelectItem value="abandoned">Abandoned</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExport} disabled={!data?.data?.length}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">Error loading AUCs</div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset Number</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Asset Class</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                    <TableHead className="text-right">Unsettled</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                            No AUCs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((auc: AUC) => (
                                        <TableRow key={auc.id}>
                                            <TableCell className="font-medium">{auc.asset_number}</TableCell>
                                            <TableCell>{auc.name}</TableCell>
                                            <TableCell>{getStatusBadge(auc.auc_status)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-medium">{auc.company_code}</div>
                                                    <div className="text-gray-500">{auc.company_name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{auc.asset_class_name}</TableCell>
                                            <TableCell>{formatDate(auc.construction_start_date)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(auc.total_cost)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(auc.unsettled_cost)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/transactions/auc/${auc.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {auc.auc_status === 'in_progress' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to delete this AUC?')) {
                                                                    deleteMutation.mutate(auc.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {data?.total > pageSize && (
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-sm text-gray-500">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.total)} of {data.total} results
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page * pageSize >= data.total}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            <CreateAUCDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['aucs'] });
                    setCreateDialogOpen(false);
                }}
            />
        </div>
    );
}
