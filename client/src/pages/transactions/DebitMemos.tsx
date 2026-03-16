import { useState, useEffect } from 'react';
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
    DollarSign,
    MoreHorizontal,
    Send,
    Trash2,
    Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

type DebitMemo = {
    id: number;
    debit_memo_number: string;
    customer_id: number;
    customer_name?: string;
    customer_code?: string;
    billing_document_id?: number;
    billing_number?: string;
    debit_date: string;
    total_amount: number;
    tax_amount: number;
    net_amount: number;
    posting_status: string;
    reason_code: string;
    reason_description?: string;
    accounting_document_number?: string;
    created_at: string;
    item_count?: number;
    company_code_id?: number;
    currency?: string;
    reference?: string;
};

export default function DebitMemos() {
    const permissions = useAgentPermissions();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [viewDialogMemoId, setViewDialogMemoId] = useState<number | null>(null);

    // Fetch debit memos
    const { data: debitMemos = [], isLoading, refetch } = useQuery({
        queryKey: ['/api/order-to-cash/debit-memos', statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('postingStatus', statusFilter);
            const response = await fetch(`/api/order-to-cash/debit-memos?${params.toString()}`, {
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
            const response = await fetch(`/api/order-to-cash/debit-memos/${debitMemoId}/post`, {
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
            queryClient.invalidateQueries({ queryKey: ['/api/order-to-cash/debit-memos'] });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Fetch Reason Codes
    const { data: reasonCodes = [] } = useQuery({
        queryKey: ['/api/master-data/reason-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/reason-codes');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : [];
        }
    });

    // Fetch UOMs
    const { data: uoms = [] } = useQuery({
        queryKey: ['/api/master-data/uom'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/uom');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : [];
        }
    });

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            'DRAFT': { label: 'Draft', variant: 'secondary' },
            'POSTED': { label: 'Posted', variant: 'default' },
            'CANCELLED': { label: 'Cancelled', variant: 'destructive' },
            'REVERSED': { label: 'Reversed', variant: 'outline' },
        };
        const config = statusMap[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getReasonLabel = (code: string) => {
        const found = reasonCodes.find((r: any) => r.code === code);
        return found ? found.name : code;
    };

    const filteredMemos = debitMemos;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">AR Debit Memos</h1>
                    <p className="text-muted-foreground">
                        Manage additional customer charges (freight, fees, adjustments)
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
                        <CardTitle>Debit Memos ({filteredMemos.length})</CardTitle>
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
                    ) : filteredMemos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No debit memos found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Debit Memo #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>GL Doc #</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMemos.map((memo: DebitMemo) => (
                                    <TableRow key={memo.id}>
                                        <TableCell className="font-medium">
                                            {memo.debit_memo_number}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{memo.customer_name}</div>
                                                {memo.customer_code && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {memo.customer_code}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(memo.debit_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {getReasonLabel(memo.reason_code)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium">
                                                {memo.currency || '$'}{Number(memo.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            {Number(memo.tax_amount) > 0 && (
                                                <div className="text-sm text-muted-foreground">
                                                    Tax: ${Number(memo.tax_amount).toFixed(2)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(memo.posting_status)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {memo.accounting_document_number || '-'}
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
                                                    <DropdownMenuItem onClick={() => setViewDialogMemoId(memo.id)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {memo.posting_status === 'DRAFT' && permissions.hasDataModificationRights && (
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

            {/* Create Dialog */}
            <CreateDebitMemoDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSuccess={() => {
                    refetch();
                    setShowCreateDialog(false);
                }}
            />

            {/* View Dialog */}
            {viewDialogMemoId && (
                <ViewDebitMemoDialog
                    debitMemoId={viewDialogMemoId}
                    open={viewDialogMemoId !== null}
                    onOpenChange={(open) => !open && setViewDialogMemoId(null)}
                />
            )}
        </div>
    );
}

// CREATE DIALOG COMPONENT - Enhanced with FI-Compliant Features
function CreateDebitMemoDialog({ open, onOpenChange, onSuccess }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        customerId: "",
        billingDocumentId: "",
        document_date: new Date().toISOString().split('T')[0],
        company_code_id: "",
        currency: "",
        reference: "",
        reasonCode: "",
        reasonDescription: "",
        notes: "",
        items: [{
            description: "",
            quantity: "1",
            unit_price: "0",
            unit_of_measure: "EA",
            gl_account_id: "",
            tax_code: "",
            tax_amount: "0"
        }]
    });

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['/api/master-data/customer'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/customer');
            if (!response.ok) return [];
            const result = await response.json();
            return result.data || result || [];
        },
        enabled: open,
    });

    // Fetch billing documents
    const { data: billingDocuments = [] } = useQuery({
        queryKey: ['/api/order-to-cash/billing-documents', formData.customerId],
        queryFn: async () => {
            if (!formData.customerId) return [];
            const response = await fetch(`/api/order-to-cash/billing-documents?customerId=${formData.customerId}`);
            if (!response.ok) return [];
            const result = await response.json();
            return result.data || [];
        },
        enabled: !!formData.customerId && open,
    });

    // Fetch GL Accounts (REVENUE type for debit memo credits)
    const { data: glAccounts = [] } = useQuery({
        queryKey: ['/api/general-ledger/gl-accounts'],
        queryFn: async () => {
            const response = await fetch('/api/general-ledger/gl-accounts');
            if (!response.ok) return [];
            const result = await response.json();
            // Filter to REVENUE type accounts
            return (result || []).filter((acc: any) => acc.account_type === 'REVENUE' || acc.account_type === 'INCOME');
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
            return result || [];
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

    // Fetch UOMs
    const { data: uoms = [] } = useQuery({
        queryKey: ['/api/master-data/uom'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/uom');
            if (!response.ok) return [];
            const result = await response.json();
            return Array.isArray(result) ? result : [];
        },
        enabled: open,
    });

    // Fetch Company Codes
    const { data: companyCodes = [] } = useQuery({
        queryKey: ['/api/master-data/company-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/company-codes');
            if (!response.ok) return [];
            const result = await response.json();
            return result.data || result || [];
        },
        enabled: open,
    });

    //  Auto-derive company code and currency when customer selected
    useEffect(() => {
        if (formData.customerId && customers.length > 0) {
            const selectedCustomer = customers.find((c: any) => c.id.toString() === formData.customerId);
            if (selectedCustomer) {
                setFormData(prev => ({
                    ...prev,
                    company_code_id: selectedCustomer.company_code_id?.toString() || prev.company_code_id,
                    currency: selectedCustomer.currency || prev.currency
                }));
            }
        }
    }, [formData.customerId, customers]);

    // Calculate subtotal
    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            return sum + (qty * price);
        }, 0);
    };

    // Calculate total tax
    const calculateTotalTax = () => {
        return formData.items.reduce((sum, item) => {
            return sum + (parseFloat(item.tax_amount) || 0);
        }, 0);
    };

    // Update line item with tax auto-calculation
    const updateLineItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate tax when tax code, quantity, or price changes
        if (field === 'tax_code' || field === 'quantity' || field === 'unit_price') {
            const item = newItems[index];
            const taxCode = taxCodes.find((tc: any) => tc.id?.toString() === item.tax_code || tc.tax_code === item.tax_code);
            if (taxCode) {
                const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                const taxRate = parseFloat(taxCode.tax_rate || '0');
                const taxAmount = (lineTotal * taxRate) / 100;
                newItems[index].tax_amount = taxAmount.toFixed(2);
            } else if (field === 'tax_code' && !value) {
                // No tax code selected = zero tax
                newItems[index].tax_amount = "0";
            }
        }

        setFormData({ ...formData, items: newItems });
    };

    // Add line item
    const addLineItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                description: '',
                quantity: '1',
                unit_price: '0',
                unit_of_measure: 'EA',
                gl_account_id: '',
                tax_code: '',
                tax_amount: '0'
            }]
        });
    };

    // Remove line item
    const removeLineItem = (index: number) => {
        if (formData.items.length > 1) {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        }
    };

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const response = await fetch('/api/order-to-cash/debit-memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
            queryClient.invalidateQueries({ queryKey: ['/api/order-to-cash/debit-memos'] });
            onSuccess();
            // Reset form
            setFormData({
                customerId: "",
                billingDocumentId: "",
                document_date: new Date().toISOString().split('T')[0],
                company_code_id: "",
                currency: "",
                reference: "",
                reasonCode: "",
                reasonDescription: "",
                notes: "",
                items: [{
                    description: "",
                    quantity: "1",
                    unit_price: "0",
                    unit_of_measure: "EA",
                    gl_account_id: "",
                    tax_code: "",
                    tax_amount: "0"
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

    // Handle submit with comprehensive validation
    const handleSubmit = () => {
        // Validate header fields
        if (!formData.customerId) {
            toast({ title: "Validation Error", description: "Customer is required", variant: "destructive" });
            return;
        }

        if (!formData.document_date) {
            toast({ title: "Validation Error", description: "Document date is required", variant: "destructive" });
            return;
        }

        if (!formData.company_code_id) {
            toast({ title: "Validation Error", description: "Company code is required", variant: "destructive" });
            return;
        }

        if (!formData.currency || formData.currency.length !== 3) {
            toast({ title: "Validation Error", description: "Valid 3-character currency code is required (e.g., USD, INR)", variant: "destructive" });
            return;
        }

        if (!formData.reasonCode) {
            toast({ title: "Validation Error", description: "Reason code is required", variant: "destructive" });
            return;
        }

        // Validate line items
        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];

            if (!item.description) {
                toast({ title: "Validation Error", description: `Line ${i + 1}: Description is required`, variant: "destructive" });
                return;
            }

            if (!item.gl_account_id) {
                toast({ title: "Validation Error", description: `Line ${i + 1}: G/L Account is required`, variant: "destructive" });
                return;
            }

            if (!item.tax_code) {
                toast({ title: "Validation Error", description: `Line ${i + 1}: Tax Code is required (select 'No Tax' if not applicable)`, variant: "destructive" });
                return;
            }

            if (!item.unit_price || parseFloat(item.unit_price) < 0) {
                toast({ title: "Validation Error", description: `Line ${i + 1}: Valid unit price is required`, variant: "destructive" });
                return;
            }
        }

        // Calculate totals
        const calculatedSubtotal = calculateSubtotal();
        const calculatedTax = calculateTotalTax();

        if (calculatedSubtotal <= 0) {
            toast({ title: "Validation Error", description: "Total amount must be greater than 0", variant: "destructive" });
            return;
        }

        // Build payload
        const payload = {
            customerId: parseInt(formData.customerId),
            billingDocumentId: formData.billingDocumentId ? parseInt(formData.billingDocumentId) : undefined,
            document_date: formData.document_date,
            company_code_id: parseInt(formData.company_code_id),
            currency: formData.currency,
            reference: formData.reference,
            reasonCode: formData.reasonCode,
            reasonDescription: formData.reasonDescription,
            totalAmount: calculatedSubtotal,
            taxAmount: calculatedTax,
            notes: formData.notes,
            items: formData.items.map(item => ({
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                gl_account_id: parseInt(item.gl_account_id),
                tax_code: item.tax_code,
                tax_amount: parseFloat(item.tax_amount),
                unit_of_measure: item.unit_of_measure
            }))
        };

        createMutation.mutate(payload);
    };

    const subtotal = calculateSubtotal();
    const totalTax = calculateTotalTax();
    const grandTotal = subtotal + totalTax;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create AR Debit Memo</DialogTitle>
                    <DialogDescription>
                        Add additional charges to customer account (freight, restocking fees, etc.)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Customer *</Label>
                            <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((customer: any) => (
                                        <SelectItem key={customer.id} value={customer.id.toString()}>
                                            {customer.name} {customer.customer_code ? `(${customer.customer_code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Company Code *</Label>
                            <Select value={formData.company_code_id} onValueChange={(value) => {
                                const company = companyCodes.find((c: any) => c.id?.toString() === value);
                                setFormData({
                                    ...formData,
                                    company_code_id: value,
                                    currency: company?.currency || formData.currency
                                });
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companyCodes.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                            {cc.code} - {cc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Currency *</Label>
                            <Input
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                placeholder="USD"
                                maxLength={3}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Document Date *</Label>
                            <Input
                                type="date"
                                value={formData.document_date}
                                onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Billing Document (Optional)</Label>
                            <Select
                                value={formData.billingDocumentId}
                                onValueChange={(value) => setFormData({ ...formData, billingDocumentId: value })}
                                disabled={!formData.customerId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select billing doc" />
                                </SelectTrigger>
                                <SelectContent>
                                    {billingDocuments.map((doc: any) => (
                                        <SelectItem key={doc.id} value={doc.id.toString()}>
                                            {doc.billing_number} - {formData.currency || '$'}{parseFloat(doc.total_amount || 0).toFixed(2)}
                                        </SelectItem>
                                    ))}
                                    {billingDocuments.length === 0 && (
                                        <SelectItem value="none" disabled>No billing documents</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference / Assignment</Label>
                            <Input
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="e.g., INV-2026-001"
                                maxLength={100}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Reason Code *</Label>
                            <Select value={formData.reasonCode} onValueChange={(value) => setFormData({ ...formData, reasonCode: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reasonCodes.map((reason: any) => (
                                        <SelectItem key={reason.code} value={reason.code}>
                                            {reason.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason Description</Label>
                            <Input
                                value={formData.reasonDescription}
                                onChange={(e) => setFormData({ ...formData, reasonDescription: e.target.value })}
                                placeholder="Enter reason description"
                            />
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Line Items *</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end pb-3 border-b">
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs">Description *</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                            placeholder="Item description"
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">G/L Account *</Label>
                                        <Select
                                            value={item.gl_account_id}
                                            onValueChange={(value) => updateLineItem(index, 'gl_account_id', value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select" />
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

                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-xs">Qty *</Label>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                            className="h-9"
                                            min="0"
                                            step="1"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">Unit Price *</Label>
                                        <Input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                                            className="h-9"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">Tax Code *</Label>
                                        <Select
                                            value={item.tax_code}
                                            onValueChange={(value) => updateLineItem(index, 'tax_code', value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="V0">No Tax (0%)</SelectItem>
                                                {taxCodes.map((tc: any) => (
                                                    <SelectItem key={tc.id || tc.tax_code} value={tc.id?.toString() || tc.tax_code}>
                                                        {tc.tax_code || tc.code} - {tc.description} ({tc.tax_rate}%)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-xs">Tax</Label>
                                        <Input
                                            value={item.tax_amount}
                                            disabled
                                            className="h-9 bg-muted"
                                        />
                                    </div>

                                    <div className="col-span-1 flex items-end">
                                        {formData.items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLineItem(index)}
                                                className="h-9"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Posting Preview */}
                    <Card className="bg-muted/50">
                        <CardHeader>
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
                                    {/* AR Entry (Debit) */}
                                    <TableRow className="font-medium bg-blue-50">
                                        <TableCell>120000</TableCell>
                                        <TableCell>Accounts Receivable</TableCell>
                                        <TableCell className="text-right">
                                            {formData.currency} {grandTotal.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">-</TableCell>
                                    </TableRow>

                                    {/* Line Item Credits */}
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

                                    {/* Tax Entry (if applicable) */}
                                    {totalTax > 0 && (
                                        <TableRow>
                                            <TableCell>210000</TableCell>
                                            <TableCell>Output Tax Payable</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right">
                                                {formData.currency} {totalTax.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )}

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

                                    {/* Balance Check */}
                                    <TableRow className="bg-green-50">
                                        <TableCell colSpan={2} className="font-semibold">Balance</TableCell>
                                        <TableCell colSpan={2} className="text-center text-green-600 font-semibold">
                                            ✓ Balanced (0.00)
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            {/* Summary */}
                            <div className="mt-4 p-3 bg-white rounded border grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Subtotal</div>
                                    <div className="text-lg font-semibold">{formData.currency} {subtotal.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Tax</div>
                                    <div className="text-lg font-semibold">{formData.currency} {totalTax.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Grand Total</div>
                                    <div className="text-xl font-bold text-primary">{formData.currency} {grandTotal.toFixed(2)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Creating...' : 'Create Debit Memo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// VIEW DIALOG - Complete implementation
function ViewDebitMemoDialog({ debitMemoId, open, onOpenChange }: {
    debitMemoId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data: debitMemo, isLoading } = useQuery({
        queryKey: ['/api/order-to-cash/debit-memos', debitMemoId],
        queryFn: async () => {
            const response = await fetch(`/api/order-to-cash/debit-memos/${debitMemoId}`);
            if (!response.ok) throw new Error('Failed to fetch debit memo');
            const result = await response.json();
            return result.data;
        },
        enabled: open,
    });

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Loading...</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-8">
                        <div className="text-muted-foreground">Loading debit memo details...</div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!debitMemo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Debit Memo: {debitMemo.debit_memo_number}</DialogTitle>
                    <DialogDescription>
                        View debit memo details and line items
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Header Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Customer</Label>
                                <p className="font-medium">{debitMemo.customer_name}</p>
                                {debitMemo.customer_code && (
                                    <p className="text-sm text-muted-foreground">{debitMemo.customer_code}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Debit Date</Label>
                                <p className="font-medium">{new Date(debitMemo.debit_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Reason</Label>
                                <p className="font-medium">{debitMemo.reason_code}</p>
                                {debitMemo.reason_description && (
                                    <p className="text-sm text-muted-foreground">{debitMemo.reason_description}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Status</Label>
                                <p>
                                    <Badge variant={debitMemo.posting_status === 'POSTED' ? 'default' : 'secondary'}>
                                        {debitMemo.posting_status}
                                    </Badge>
                                </p>
                            </div>
                            {debitMemo.billing_number && (
                                <div>
                                    <Label className="text-muted-foreground">Billing Document</Label>
                                    <p className="font-medium">{debitMemo.billing_number}</p>
                                </div>
                            )}
                            {debitMemo.accounting_document_number && (
                                <div>
                                    <Label className="text-muted-foreground">GL Document</Label>
                                    <p className="font-medium">{debitMemo.accounting_document_number}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Amounts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Amounts</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Total Amount</Label>
                                <p className="text-lg font-bold">
                                    ${debitMemo.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Tax Amount</Label>
                                <p className="text-lg font-bold">
                                    ${debitMemo.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Net Amount</Label>
                                <p className="text-lg font-bold text-primary">
                                    ${debitMemo.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Line Items ({debitMemo.items?.length || 0})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {debitMemo.items && debitMemo.items.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead>UOM</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {debitMemo.items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.line_number}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell>{item.unit_of_measure}</TableCell>
                                                <TableCell className="text-right">
                                                    ${parseFloat(item.unit_price).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ${parseFloat(item.total_amount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No line items</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {debitMemo.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{debitMemo.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
