import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft,
    RefreshCw,
    Plus,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    MoreHorizontal,
    Eye,
    FileText,
    RotateCcw
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Type definitions
type SalesReturn = {
    id: number;
    return_number: string;
    customer_id: number;
    customer_name?: string;
    sales_order_id?: number;
    order_number?: string;
    billing_document_id?: number;
    billing_number?: string;
    return_date: string;
    return_reason: string;
    total_amount: number;
    tax_amount: number;
    net_amount: number;
    status: string;
    approval_status: string;
    approved_at?: string;
    notes?: string;
    created_at: string;
    item_count?: number;
};

type CreditMemo = {
    id: number;
    credit_memo_number: string;
    return_id?: number;
    return_number?: string;
    customer_id: number;
    customer_name?: string;
    billing_document_id: number;
    billing_number?: string;
    credit_date: string;
    total_amount: number;
    tax_amount: number;
    posting_status: string;
    accounting_document_number?: string;
    created_at: string;
    item_count?: number;
};

export default function SalesReturns() {
    const permissions = useAgentPermissions();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState("returns");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showApprovalDialog, setShowApprovalDialog] = useState(false);
    const [showCreditMemoDialog, setShowCreditMemoDialog] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
    const [selectedCreditMemo, setSelectedCreditMemo | null > (null);

    // Create return form
    const [returnForm, setReturnForm] = useState({
        customerId: "",
        billingDocumentId: "",
        returnReason: "",
        notes: "",
        items: [] as Array<{
            product_id: number;
            quantity: number;
            unit_price: number;
            tax_rate: number;
            condition: string;
            disposition: string;
        }>
    });

    // Fetch sales returns
    const { data: returns = [], isLoading: returnsLoading, refetch: refetchReturns } = useQuery({
        queryKey: ['/api/order-to-cash/sales-returns', statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const response = await fetch(`/api/order-to-cash/sales-returns?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch returns');
            const result = await response.json();
            return result.data || [];
        },
        enabled: activeTab === 'returns',
    });

    // Fetch credit memos
    const { data: creditMemos = [], isLoading: creditMemosLoading, refetch: refetchCreditMemos } = useQuery({
        queryKey: ['/api/order-to-cash/credit-memos'],
        queryFn: async () => {
            const response = await fetch('/api/order-to-cash/credit-memos', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch credit memos');
            const result = await response.json();
            return result.data || [];
        },
        enabled: activeTab === 'creditMemos',
    });

    // Create return mutation
    const createReturnMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await apiRequest('/api/order-to-cash/sales-returns', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create return');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Return ${data.data.returnNumber} created successfully`,
            });
            setShowCreateDialog(false);
            refetchReturns();
            // Reset form
            setReturnForm({
                customerId: "",
                billingDocumentId: "",
                returnReason: "",
                notes: "",
                items: []
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create return",
                variant: "destructive",
            });
        },
    });

    // Approve return mutation
    const approveReturnMutation = useMutation({
        mutationFn: async (data: { id: number; approvalStatus: string; rejectionReason?: string }) => {
            const response = await apiRequest(`/api/order-to-cash/sales-returns/${data.id}/approve`, {
                method: 'PUT',
                body: JSON.stringify({
                    approvalStatus: data.approvalStatus,
                    rejectionReason: data.rejectionReason
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve return');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Return ${data.data.approvalStatus.toLowerCase()} successfully`,
            });
            setShowApprovalDialog(false);
            setSelectedReturn(null);
            refetchReturns();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to process approval",
                variant: "destructive",
            });
        },
    });

    // Generate credit memo mutation
    const generateCreditMemoMutation = useMutation({
        mutationFn: async (returnId: number) => {
            const response = await apiRequest('/api/order-to-cash/credit-memos', {
                method: 'POST',
                body: JSON.stringify({ returnId })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate credit memo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Credit memo ${data.data.creditMemoNumber} generated successfully`,
            });
            refetchReturns();
            refetchCreditMemos();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to generate credit memo",
                variant: "destructive",
            });
        },
    });

    // Post credit memo mutation
    const postCreditMemoMutation = useMutation({
        mutationFn: async (creditMemoId: number) => {
            const response = await apiRequest(`/api/order-to-cash/credit-memos/${creditMemoId}/post`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to post credit memo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Credit memo posted to GL (${data.data.glDocumentNumber})`,
            });
            refetchCreditMemos();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to post credit memo",
                variant: "destructive",
            });
        },
    });

    // Filtered returns
    const filteredReturns = returns.filter((item: SalesReturn) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                item.return_number?.toLowerCase().includes(query) ||
                item.customer_name?.toLowerCase().includes(query) ||
                item.billing_number?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    // Format currency
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>;
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Get posting status badge
    const getPostingBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>;
            case 'POSTED':
                return <Badge className="bg-green-100 text-green-800">Posted</Badge>;
            case 'CANCELLED':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        refetchReturns();
        refetchCreditMemos();
        toast({
            title: "Refreshing",
            description: "Loading latest data...",
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/transactions" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Sales Returns & Credit Memos</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage customer returns, approvals, and credit memo processing
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleRefresh}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Return
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="returns">Sales Returns</TabsTrigger>
                    <TabsTrigger value="creditMemos">Credit Memos</TabsTrigger>
                </TabsList>

                {/* Returns Tab */}
                <TabsContent value="returns" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Returns</CardTitle>
                            <Card Description>
                                Customer return requests and approval workflow
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search returns..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="rounded-md border">
                                <div className="max-h-[600px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-white z-10">
                                            <TableRow>
                                                <TableHead>Return #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead className="hidden md:table-cell">Invoice #</TableHead>
                                                <TableHead className="hidden md:table-cell">Return Date</TableHead>
                                                <TableHead className="hidden lg:table-cell">Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {returnsLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">
                                                        Loading...
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredReturns.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">
                                                        No returns found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredReturns.map((returnItem: SalesReturn) => (
                                                    <TableRow key={returnItem.id}>
                                                        <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{returnItem.customer_name || `Customer #${returnItem.customer_id}`}</div>
                                                                {returnItem.return_reason && (
                                                                    <div className="text-xs text-muted-foreground">{returnItem.return_reason}</div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell">{returnItem.billing_number || "-"}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{formatDate(returnItem.return_date)}</TableCell>
                                                        <TableCell className="hidden lg:table-cell">{formatCurrency(returnItem.total_amount)}</TableCell>
                                                        <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {permissions.hasDataModificationRights ? (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        {returnItem.status === 'DRAFT' && (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => {
                                                                                    setSelectedReturn(returnItem);
                                                                                    setShowApprovalDialog(true);
                                                                                }}>
                                                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                                                    Approve
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => {
                                                                                    setSelectedReturn(returnItem);
                                                                                    approveReturnMutation.mutate({
                                                                                        id: returnItem.id,
                                                                                        approvalStatus: 'REJECTED',
                                                                                        rejectionReason: 'User rejected'
                                                                                    });
                                                                                }}>
                                                                                    <XCircle className="mr-2 h-4 w-4" />
                                                                                    Reject
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        {returnItem.status === 'APPROVED' && (
                                                                            <DropdownMenuItem onClick={() => {
                                                                                generateCreditMemoMutation.mutate(returnItem.id);
                                                                            }}>
                                                                                <FileText className="mr-2 h-4 w-4" />
                                                                                Generate Credit Memo
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            ) : (
                                                                <span className="text-xs text-gray-500 px-2 py-1">
                                                                    {permissions.label}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Credit Memos Tab */}
                <TabsContent value="creditMemos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Credit Memos</CardTitle>
                            <CardDescription>
                                Credit notes issuedfor approved returns
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="max-h-[600px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-white z-10">
                                            <TableRow>
                                                <TableHead>Credit Memo #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead className="hidden md:table-cell">Return #</TableHead>
                                                <TableHead className="hidden md:table-cell">Credit Date</TableHead>
                                                <TableHead className="hidden lg:table-cell">Amount</TableHead>
                                                <TableHead>Posting Status</TableHead>
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {creditMemosLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">
                                                        Loading...
                                                    </TableCell>
                                                </TableRow>
                                            ) : creditMemos.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">
                                                        No credit memos found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                creditMemos.map((cm: CreditMemo) => (
                                                    <TableRow key={cm.id}>
                                                        <TableCell className="font-medium">{cm.credit_memo_number}</TableCell>
                                                        <TableCell>{cm.customer_name || `Customer #${cm.customer_id}`}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{cm.return_number || "-"}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{formatDate(cm.credit_date)}</TableCell>
                                                        <TableCell className="hidden lg:table-cell">{formatCurrency(cm.total_amount)}</TableCell>
                                                        <TableCell>{getPostingBadge(cm.posting_status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {permissions.hasDataModificationRights ? (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        {cm.posting_status === 'DRAFT' && (
                                                                            <DropdownMenuItem onClick={() => {
                                                                                postCreditMemoMutation.mutate(cm.id);
                                                                            }}>
                                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                                Post to GL
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {cm.accounting_document_number && (
                                                                            <DropdownMenuItem onClick={() => {
                                                                                toast({
                                                                                    title: "GL Document",
                                                                                    description: `Document #: ${cm.accounting_document_number}`,
                                                                                });
                                                                            }}>
                                                                                <Eye className="mr-2 h-4 w-4" />
                                                                                View GL Doc
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            ) : (
                                                                <span className="text-xs text-gray-500 px-2 py-1">
                                                                    {permissions.label}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Approval Dialog */}
            <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Return</DialogTitle>
                        <DialogDescription>
                            Approve return {selectedReturn?.return_number}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            if (selectedReturn) {
                                approveReturnMutation.mutate({
                                    id: selectedReturn.id,
                                    approvalStatus: 'APPROVED'
                                });
                            }
                        }}>
                            Approve Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
