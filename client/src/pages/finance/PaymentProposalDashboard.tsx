import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentProposal {
    id: number;
    proposal_number: string;
    company_code_id: number;
    company_code_name: string;
    payment_date: string;
    status: string;
    total_amount: number;
    total_items: number;
    creator_name: string;
    created_at: string;
}

interface ProposalItem {
    id: number;
    vendor_name: string;
    invoice_number: string;
    amount: number;
    status: string;
    exception_message?: string;
}

export default function PaymentProposalDashboard() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeStatus, setActiveStatus] = useState('all');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState<PaymentProposal | null>(null);

    // Fetch proposals
    const { data: proposals = [], isLoading, refetch } = useQuery<PaymentProposal[]>({
        queryKey: ['/api/payment-proposals', activeStatus],
        queryFn: async () => {
            const params = activeStatus !== 'all' ? `?status=${activeStatus}` : '';
            const response = await apiRequest(`/api/payment-proposals${params}`);
            return response.data || [];
        }
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
            DRAFT: { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Draft' },
            SUBMITTED: { color: 'bg-blue-100 text-blue-800', icon: AlertTriangle, label: 'Submitted' },
            APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
            REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
            POSTED: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Posted' }
        };

        const config = statusConfig[status] || statusConfig.DRAFT;
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} flex items-center gap-1 hover:${config.color}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Payment Proposals</h1>
                    <p className="text-gray-500 mt-1">Manage batch payment runs and approvals</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Proposal
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{proposals.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-blue-600">
                            {proposals.filter(p => p.status === 'SUBMITTED').length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-600">
                            {proposals.filter(p => p.status === 'APPROVED').length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {formatCurrency(proposals.reduce((sum, p) => sum + (p.total_amount || 0), 0))}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Proposals Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Payment Proposals</CardTitle>
                            <CardDescription>View and manage all payment proposal runs</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" onValueChange={setActiveStatus}>
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                            <TabsTrigger value="SUBMITTED">Submitted</TabsTrigger>
                            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                            <TabsTrigger value="POSTED">Posted</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeStatus} className="mt-4">
                            {isLoading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : proposals.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No proposals found</p>
                                    <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Proposal
                                    </Button>
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Proposal #</TableHead>
                                                <TableHead>Payment Date</TableHead>
                                                <TableHead>Company Code</TableHead>
                                                <TableHead>Items</TableHead>
                                                <TableHead>Total Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created By</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {proposals.map((proposal) => (
                                                <TableRow key={proposal.id}>
                                                    <TableCell className="font-medium">{proposal.proposal_number}</TableCell>
                                                    <TableCell>{formatDate(proposal.payment_date)}</TableCell>
                                                    <TableCell>{proposal.company_code_name || '-'}</TableCell>
                                                    <TableCell>{proposal.total_items}</TableCell>
                                                    <TableCell>{formatCurrency(proposal.total_amount)}</TableCell>
                                                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                                                    <TableCell>{proposal.creator_name || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedProposal(proposal)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {proposal.status === 'APPROVED' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    title="Download payment file"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Create Proposal Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Payment Proposal</DialogTitle>
                        <DialogDescription>
                            Create a new batch payment run. Select invoices to include in this proposal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Payment Date</Label>
                                <Input type="date" />
                            </div>
                            <div>
                                <Label>Value Date</Label>
                                <Input type="date" />
                            </div>
                        </div>
                        <div>
                            <Label>Company Code</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company code" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Company Code 1</SelectItem>
                                    <SelectItem value="2">Company Code 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Approval Pattern</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select approval pattern" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SINGLE">Single Approver</SelectItem>
                                    <SelectItem value="SEQUENTIAL">Sequential Approval</SelectItem>
                                    <SelectItem value="JOINT">Joint Approval</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Input placeholder="Optional notes" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button>Create Proposal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
