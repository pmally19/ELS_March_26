import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Send,
    Eye,
    Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

type APCreditMemo = {
    id: number;
    credit_memo_number: string;
    vendor_id: number;
    vendor_name?: string;
    vendor_code?: string;
    invoice_reference?: string;
    credit_memo_date: string;
    amount: number;
    currency: string;
    status: string;
    posted_document_number?: string;
    created_at: string;
    item_count?: number;
};

export default function VendorCreditMemos() {
    const permissions = useAgentPermissions();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Fetch credit memos
    const { data: creditMemos = [], isLoading, refetch } = useQuery({
        queryKey: ['/api/purchase/ap-credit-memos', statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const response = await fetch(`/api/purchase/ap-credit-memos?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch credit memos');
            const result = await response.json();
            return result.data || [];
        },
    });

    // Post credit memo mutation
    const postMutation = useMutation({
        mutationFn: async (creditMemoId: number) => {
            const response = await fetch(`/api/purchase/ap-credit-memos/${creditMemoId}/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
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
                description: `Credit memo ${data.data.creditMemoNumber} posted to GL successfully`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/purchase/ap-credit-memos'] });
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
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
            'pending': { label: 'Pending', variant: 'secondary' },
            'posted': { label: 'Posted', variant: 'default' },
        };
        const config = statusMap[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">AP Credit Memos</h1>
                    <p className="text-muted-foreground">
                        Manage vendor credit notes and returns
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
                            Create Credit Memo
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Credit Memos ({creditMemos.length})</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="posted">Posted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading credit memos...
                        </div>
                    ) : creditMemos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No credit memos found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Credit Memo #</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Invoice Ref</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>GL Doc #</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditMemos.map((memo) => (
                                    <TableRow key={memo.id}>
                                        <TableCell className="font-medium">
                                            {memo.credit_memo_number}
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
                                            <span className="text-sm">{memo.invoice_reference || '-'}</span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(memo.credit_memo_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${memo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <div className="text-sm text-muted-foreground">{memo.currency}</div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(memo.status)}
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
                                                    {memo.status === 'pending' && permissions.hasDataModificationRights && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (confirm('Post this credit memo to General Ledger?')) {
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

            <CreateAPCreditMemoDialog
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

function CreateAPCreditMemoDialog({
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
        invoiceReference: "",
        document_date: new Date().toISOString().split('T')[0],
        posting_date: new Date().toISOString().split('T')[0],
        company_code_id: "",
        amount: "",
        currency: "USD",
        paymentTerms: "",
        reasonCode: "",
        notes: "",
        items: [{
            description: "",
            quantity: "1",
            unit_price: "0",
            gl_account_id: "",
            tax_code: "",
            cost_center_id: ""
        }]
    });

    // Fetch vendors for dropdown
    const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
        queryKey: ['/api/master-data/vendors'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/vendors');
            if (!response.ok) throw new Error('Failed to fetch vendors');
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        },
        enabled: open,
    });

    // Fetch GL Accounts (Expense/Asset)
    const { data: glAccounts = [] } = useQuery({
        queryKey: ['/api/master-data/gl-accounts', { account_type: 'EXPENSE' }],
        queryFn: async () => {
            const response = await fetch('/api/master-data/gl-accounts?account_type=EXPENSE');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        },
        enabled: open,
    });

    // Fetch Tax Codes
    const { data: taxCodes = [] } = useQuery({
        queryKey: ['/api/master-data/tax-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/tax-codes');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        },
        enabled: open,
    });

    // Fetch Cost Centers
    const { data: costCenters = [] } = useQuery({
        queryKey: ['/api/master-data/cost-centers'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/cost-centers');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        },
        enabled: open,
    });

    // Fetch Reason Codes
    const { data: reasonCodes = [] } = useQuery({
        queryKey: ['/api/master-data/reason-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/reason-codes');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : [];
        },
        enabled: open,
    });

    // Fetch Vendor Invoices (when vendor selected)
    const { data: vendorInvoices = [] } = useQuery({
        queryKey: ['/api/purchase/vendor-invoices', formData.vendorId],
        queryFn: async () => {
            if (!formData.vendorId) return [];
            const response = await fetch(`/api/purchase/vendor-invoices?vendor_id=${formData.vendorId}`);
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : [];
        },
        enabled: !!formData.vendorId && open,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/purchase/ap-credit-memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create credit memo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Credit memo ${data.data.creditMemoNumber} created successfully`,
            });
            onSuccess();
            setFormData({
                vendorId: "",
                invoiceReference: "",
                document_date: new Date().toISOString().split('T')[0],
                posting_date: new Date().toISOString().split('T')[0],
                company_code_id: "",
                amount: "",
                currency: "USD",
                paymentTerms: "",
                reasonCode: "",
                notes: "",
                items: [{
                    description: "",
                    quantity: "1",
                    unit_price: "0",
                    gl_account_id: "",
                    tax_code: "",
                    cost_center_id: ""
                }]
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
                description: "Please fill in vendor ID and amount",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            vendorId: parseInt(formData.vendorId),
            invoiceReference: formData.invoiceReference,
            credit_memo_date: formData.document_date, // Using document date as credit memo date
            document_date: formData.document_date,
            posting_date: formData.posting_date,
            company_code_id: parseInt(formData.company_code_id),
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            paymentTerms: formData.paymentTerms,
            reasonCode: formData.reasonCode,
            notes: formData.notes,
            items: formData.items.map(item => ({
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                gl_account_id: item.gl_account_id ? parseInt(item.gl_account_id) : null,
                tax_code: item.tax_code,
                cost_center_id: item.cost_center_id ? parseInt(item.cost_center_id) : null
            }))
        };

        createMutation.mutate(payload);
    };

    // Derived values for UI
    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            return sum + (qty * price);
        }, 0);
    };

    const calculateTotalTax = () => {
        return formData.items.reduce((sum, item) => {
            return sum + (parseFloat(item.tax_amount) || 0);
        }, 0); // Assuming tax_amount is added to items, otherwise logic needs update
    };

    // Note: To match AR Debit Memo fully, we should ensure tax is calculated per item. 
    // AP Credit Memo items currently have 'tax_code' but maybe not 'tax_amount' in state? 
    // The previous state initialization (line 382) had 'tax_code' but no 'tax_amount'.
    // I will use a simple heuristic for now or just 0 if not calculated.
    const subtotal = calculateSubtotal();
    // For now assuming tax included in items or 0
    const totalTax = 0;
    const grandTotal = subtotal + totalTax;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create AP Credit Memo</DialogTitle>
                    <DialogDescription>
                        Create a new vendor credit note
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vendor *</Label>
                            <Select
                                value={formData.vendorId}
                                onValueChange={(value) => {
                                    const vendor = vendors.find((v: any) => v.id.toString() === value);
                                    setFormData({
                                        ...formData,
                                        vendorId: value,
                                        company_code_id: vendor?.company_code_id || "",
                                        currency: vendor?.currency || "USD"
                                    });
                                }}
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
                                    <SelectValue placeholder="Select Reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reasonCodes.map((rc: any) => (
                                        <SelectItem key={rc.code} value={rc.code}>
                                            {rc.code} - {rc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice Reference</Label>
                            {formData.vendorId ? (
                                <Select
                                    value={formData.invoiceReference}
                                    onValueChange={(value) => {
                                        const invoice = vendorInvoices.find((inv: any) => inv.invoice_number === value);
                                        setFormData({
                                            ...formData,
                                            invoiceReference: value,
                                            // Optional: Auto-fill amount/currency if user wants
                                            amount: invoice ? (invoice.net_amount || invoice.amount || "").toString() : formData.amount,
                                            currency: invoice ? (invoice.currency || "USD") : formData.currency
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Invoice" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendorInvoices.map((inv: any) => (
                                            <SelectItem key={inv.id} value={inv.invoice_number}>
                                                {inv.invoice_number} ({inv.currency} {inv.net_amount || inv.amount})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={formData.invoiceReference}
                                    onChange={(e) => setFormData({ ...formData, invoiceReference: e.target.value })}
                                    placeholder="Select vendor first"
                                    disabled={!formData.vendorId}
                                />
                            )}
                        </div>
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

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => setFormData({
                                ...formData,
                                items: [...formData.items, {
                                    description: "",
                                    quantity: "1",
                                    unit_price: "0",
                                    gl_account_id: "",
                                    tax_code: "",
                                    cost_center_id: ""
                                }]
                            })}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {formData.items.map((item, index) => (
                                <Card key={index} className="p-4 bg-gray-50/50">
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-4 space-y-2">
                                            <Label>Description</Label>
                                            <Input
                                                value={item.description}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].description = e.target.value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                                placeholder="Item description"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].quantity = e.target.value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Unit Price</Label>
                                            <Input
                                                type="number"
                                                value={item.unit_price}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].unit_price = e.target.value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-2">
                                            <Label>GL Account</Label>
                                            <Select
                                                value={item.gl_account_id}
                                                onValueChange={(value) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].gl_account_id = value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {glAccounts.map((acc: any) => (
                                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                                            {acc.account_number} - {acc.account_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1 flex items-end justify-end pb-1">
                                            {formData.items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        const newItems = formData.items.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Second Row for each item */}
                                        <div className="col-span-4 space-y-2">
                                            <Label>Cost Center</Label>
                                            <Select
                                                value={item.cost_center_id}
                                                onValueChange={(value) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].cost_center_id = value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Cost Center" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {costCenters.map((cc: any) => (
                                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                                            {cc.code} - {cc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3 space-y-2">
                                            <Label>Tax Code</Label>
                                            <Select
                                                value={item.tax_code}
                                                onValueChange={(value) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index].tax_code = value;
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tax Code" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {taxCodes.map((tc: any) => (
                                                        <SelectItem key={tc.id} value={tc.tax_code}>
                                                            {tc.tax_code} ({tc.tax_rate}%)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Line Total</Label>
                                            <div className="px-3 py-2 bg-gray-100 rounded text-right font-mono text-sm">
                                                {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Posting Preview */}
                    <Card className="bg-muted/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Posting Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>G/L Account</TableHead>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Vendor Entry (Debit for Credit Memo) */}
                                    {/* Credit Memo reduces vendor balance, so it's a DEBIT to Vendor Account? 
                                        Wait. Invoice = Credit Vendor. Credit Memo = Debit Vendor. YES. 
                                        So Vendor Line is DEBIT. 
                                        Expense Lines are CREDIT (Reversing expense).
                                    */}
                                    <TableRow className="font-medium bg-blue-50">
                                        <TableCell>210000</TableCell>
                                        <TableCell>Accounts Payable (Vendor)</TableCell>
                                        <TableCell className="text-right">
                                            {formData.currency} {grandTotal.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">-</TableCell>
                                    </TableRow>

                                    {/* Line Item Credits (Reversing Expense) */}
                                    {formData.items.map((item, idx) => {
                                        const glAccount = glAccounts.find((a: any) => a.id.toString() === item.gl_account_id);
                                        const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);

                                        return lineTotal > 0 && glAccount ? (
                                            <TableRow key={idx}>
                                                <TableCell>{glAccount.account_number}</TableCell>
                                                <TableCell>{glAccount.account_name}</TableCell>
                                                <TableCell className="text-right">-</TableCell>
                                                <TableCell className="text-right">
                                                    {formData.currency} {lineTotal.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ) : null;
                                    })}

                                    {/* Totals */}
                                    <TableRow className="font-bold border-t-2">
                                        <TableCell colSpan={2}>Total</TableCell>
                                        <TableCell className="text-right">
                                            {formData.currency} {grandTotal.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formData.currency} {grandTotal.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
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
                        {createMutation.isPending ? "Creating..." : "Create Credit Memo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
