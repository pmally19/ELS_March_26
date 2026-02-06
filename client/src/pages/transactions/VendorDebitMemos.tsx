import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    RefreshCw,
    MoreHorizontal,
    Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

type APDebitMemo = {
    id: number;
    debit_memo_number: string;
    vendor_id: number;
    vendor_name?: string;
    vendor_code?: string;
    purchase_order_id?: number;
    po_number?: string;
    debit_memo_date: string;
    amount: number;
    currency: string;
    posting_status: string;
    reason_code: string;
    reason_description?: string;
    posted_document_number?: string;
    created_at: string;
    item_count?: number;
};

export default function VendorDebitMemos() {
    const permissions = useAgentPermissions();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Fetch debit memos
    const { data: debitMemos = [], isLoading, refetch } = useQuery({
        queryKey: ['/api/purchase/ap-debit-memos', statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('postingStatus', statusFilter);
            const response = await fetch(`/api/purchase/ap-debit-memos?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch debit memos');
            const result = await response.json();
            return result.data || [];
        },
    });

    // Post debit memo mutation
    const postMutation = useMutation({
        mutationFn: async (debitMemoId: number) => {
            const response = await fetch(`/api/purchase/ap-debit-memos/${debitMemoId}/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to post debit memo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Debit memo ${data.data.debitMemoNumber} posted to GL successfully`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/purchase/ap-debit-memos'] });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" }> = {
            'DRAFT': { label: 'Draft', variant: 'secondary' },
            'POSTED': { label: 'Posted', variant: 'success' },
            'CANCELLED': { label: 'Cancelled', variant: 'destructive' },
        };
        const config = statusMap[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getReasonLabel = (code: string) => {
        const reasons: Record<string, string> = {
            'QUALITY': 'Quality Issue',
            'SHORTAGE': 'Shortage',
            'RETURN': 'Return to Vendor',
            'PRICE_ERR': 'Price Error',
            'OTHER': 'Other'
        };
        return reasons[code] || code;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">AP Debit Memos</h1>
                    <p className="text-muted-foreground">
                        Manage vendor claims and returns
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    {permissions.canCreate && (
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Debit Memo
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Debit Memos ({debitMemos.length})</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="POSTED">Posted</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading debit memos...
                        </div>
                    ) : debitMemos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No debit memos found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Debit Memo #</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>GL Doc #</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debitMemos.map((memo) => (
                                    <TableRow key={memo.id}>
                                        <TableCell className="font-medium">
                                            {memo.debit_memo_number}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{memo.vendor_name}</div>
                                                {memo.vendor_code && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {memo.vendor_code}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{memo.po_number || '-'}</span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(memo.debit_memo_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {getReasonLabel(memo.reason_code)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${memo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <div className="text-sm text-muted-foreground">{memo.currency}</div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(memo.posting_status)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {memo.posted_document_number || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {memo.posting_status === 'DRAFT' && permissions.canUpdate && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (confirm('Post this debit memo to General Ledger?')) {
                                                                    postMutation.mutate(memo.id);
                                                                }
                                                            }}
                                                        >
                                                            <Send className="h-4 w-4 mr-2" />
                                                            Post to GL
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CreateAPDebitMemoDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSuccess={() => {
                    refetch();
                    setShowCreateDialog(false);
                }}
            />
        </div>
    );
}

function CreateAPDebitMemoDialog({
    open,
    onOpenChange,
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        vendorId: "",
        reasonCode: "QUALITY",
        reasonDescription: "",
        amount: "",
        currency: "USD",
        notes: "",
        items: [{ description: "", quantity: "1", unit_price: "0" }]
    });

    // Fetch vendors for dropdown
    const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
        queryKey: ['/api/master-data/vendors'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/vendors');
            if (!response.ok) throw new Error('Failed to fetch vendors');
            const result = await response.json();
            return result.data || [];
        },
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/purchase/ap-debit-memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create debit memo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Debit memo ${data.data.debitMemoNumber} created successfully`,
            });
            onSuccess();
            setFormData({
                vendorId: "",
                reasonCode: "QUALITY",
                reasonDescription: "",
                amount: "",
                currency: "USD",
                notes: "",
                items: [{ description: "", quantity: "1", unit_price: "0" }]
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

    const handleSubmit = () => {
        if (!formData.vendorId || !formData.amount) {
            toast({
                title: "Validation Error",
                description: "Please fill in vendor ID, reason code, and amount",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            vendorId: parseInt(formData.vendorId),
            reasonCode: formData.reasonCode,
            reasonDescription: formData.reasonDescription,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            notes: formData.notes,
            items: formData.items.map(item => ({
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price)
            }))
        };

        createMutation.mutate(payload);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create AP Debit Memo</DialogTitle>
                    <DialogDescription>
                        Create a new vendor claim or debit
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vendor *</Label>
                            <Select
                                value={formData.vendorId}
                                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((vendor: any) => (
                                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                            {vendor.name} {vendor.vendor_code ? `(${vendor.vendor_code})` : ''}
                                        </SelectItem>
                                    ))}
                                    {vendors.length === 0 && !vendorsLoading && (
                                        <SelectItem value="none" disabled>No vendors found</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason Code *</Label>
                            <Select
                                value={formData.reasonCode}
                                onValueChange={(value) => setFormData({ ...formData, reasonCode: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="QUALITY">Quality Issue</SelectItem>
                                    <SelectItem value="SHORTAGE">Shortage</SelectItem>
                                    <SelectItem value="RETURN">Return to Vendor</SelectItem>
                                    <SelectItem value="PRICE_ERR">Price Error</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason Description</Label>
                        <Input
                            value={formData.reasonDescription}
                            onChange={(e) => setFormData({ ...formData, reasonDescription: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Input
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Item Description</Label>
                        <Input
                            value={formData.items[0].description}
                            onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[0].description = e.target.value;
                                setFormData({ ...formData, items: newItems });
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creating..." : " Create Debit Memo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
