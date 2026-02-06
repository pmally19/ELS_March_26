import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface PODetailDialogProps {
    orderId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function PODetailDialog({ orderId, isOpen, onClose }: PODetailDialogProps) {
    // Fetch PO details
    const { data: order, isLoading: isLoadingOrder } = useQuery({
        queryKey: ['/api/purchase/orders', orderId],
        queryFn: async () => {
            const response = await fetch(`/api/purchase/orders/${orderId}`);
            if (!response.ok) throw new Error('Failed to fetch order');
            return response.json();
        },
        enabled: !!orderId && isOpen,
    });

    // Fetch PO items
    const { data: items, isLoading: isLoadingItems } = useQuery({
        queryKey: ['/api/purchase/orders', orderId, 'items'],
        queryFn: async () => {
            const response = await fetch(`/api/purchase/orders/${orderId}/items`);
            if (!response.ok) throw new Error('Failed to fetch items');
            return response.json();
        },
        enabled: !!orderId && isOpen,
    });

    // Fetch related receipts
    const { data: receipts, isLoading: isLoadingReceipts } = useQuery({
        queryKey: ['/api/purchase/receipts', { po_id: orderId }],
        queryFn: async () => {
            const response = await fetch(`/api/purchase/receipts?po_id=${orderId}`);
            if (!response.ok) return [];
            return response.json();
        },
        enabled: !!orderId && isOpen,
    });

    // Fetch material movements
    const { data: materialMovements, isLoading: isLoadingMovements } = useQuery({
        queryKey: ['/api/purchase/material-movements', orderId],
        queryFn: async () => {
            const response = await fetch(`/api/purchase/material-movements/${orderId}`);
            if (!response.ok) return [];
            return response.json();
        },
        enabled: !!orderId && isOpen,
    });

    // Fetch related invoices
    const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
        queryKey: ['/api/vendor-invoices', { purchase_order: order?.order_number }],
        queryFn: async () => {
            if (!order?.order_number) return [];
            const response = await fetch(`/api/vendor-invoices?purchase_order=${encodeURIComponent(order.order_number)}`);
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!order?.order_number && isOpen,
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft':
                return <Badge variant="outline">Draft</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500">Pending</Badge>;
            case 'approved':
                return <Badge className="bg-blue-500">Approved</Badge>;
            case 'sent':
                return <Badge className="bg-purple-500">Sent</Badge>;
            case 'partially_received':
                return <Badge className="bg-orange-500">Partially Received</Badge>;
            case 'received':
                return <Badge className="bg-green-500">Received</Badge>;
            case 'closed':
                return <Badge variant="secondary">Closed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getInvoiceStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PARKED':
                return <Badge className="bg-yellow-500">Parked</Badge>;
            case 'POSTED':
                return <Badge className="bg-green-500">Posted</Badge>;
            case 'BLOCKED':
                return <Badge className="bg-red-500">Blocked</Badge>;
            case 'CANCELLED':
                return <Badge variant="secondary">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OPEN':
                return <Badge variant="outline">Open</Badge>;
            case 'PARTIAL':
                return <Badge className="bg-blue-500">Partial</Badge>;
            case 'PAID':
                return <Badge className="bg-green-500">Paid</Badge>;
            case 'OVERDUE':
                return <Badge className="bg-red-500">Overdue</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!orderId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span>Purchase Order: {order?.order_number || `PO-${orderId}`}</span>
                        {order?.status && getStatusBadge(order.status)}
                    </DialogTitle>
                </DialogHeader>

                {isLoadingOrder ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2">Loading order details...</span>
                    </div>
                ) : (
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="items">Line Items</TabsTrigger>
                            <TabsTrigger value="receipts">Receipts</TabsTrigger>
                            <TabsTrigger value="movements">Material Movements</TabsTrigger>
                            <TabsTrigger value="invoices">Invoices</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Order Information</h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Order Number:</dt>
                                            <dd className="font-medium">{order?.order_number}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Order Date:</dt>
                                            <dd>{formatDate(order?.order_date)}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Delivery Date:</dt>
                                            <dd>{formatDate(order?.delivery_date)}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Status:</dt>
                                            <dd>{getStatusBadge(order?.status)}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Vendor Information</h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Vendor:</dt>
                                            <dd className="font-medium">{order?.vendor_name || 'N/A'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Currency:</dt>
                                            <dd>{order?.currency || order?.currency_code || 'N/A'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Total Amount:</dt>
                                            <dd className="font-semibold text-lg">
                                                {order?.currency || order?.currency_code} {Number(order?.total_amount || 0).toFixed(2)}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            {order?.notes && (
                                <div>
                                    <h3 className="font-semibold mb-2">Notes</h3>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        {order.notes}
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="items">
                            {isLoadingItems ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : items && items.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Line #</TableHead>
                                            <TableHead>Material</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total Price</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.line_number || item.id}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{item.material_code}</div>
                                                        <div className="text-sm text-muted-foreground">{item.material_name}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {order?.currency} {Number(item.unit_price || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {order?.currency} {Number(item.total_price || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{item.status || 'Open'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No line items found
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="receipts">
                            {isLoadingReceipts ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : receipts && receipts.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Receipt Number</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Items</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receipts.map((receipt: any) => (
                                            <TableRow key={receipt.id}>
                                                <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                                                <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
                                                <TableCell>{receipt.status}</TableCell>
                                                <TableCell className="text-right">{receipt.items_count || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No goods receipts found for this order
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="movements">
                            {isLoadingMovements ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="ml-2">Loading material movements...</span>
                                </div>
                            ) : materialMovements && materialMovements.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Movement Number</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Material</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>GR Number</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materialMovements.map((movement: any) => (
                                            <TableRow key={movement.id}>
                                                <TableCell className="font-medium">{movement.movement_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        movement.movement_type === 'Goods Receipt' ? 'default' :
                                                            movement.movement_type === 'Goods Issue' ? 'destructive' :
                                                                movement.movement_type === 'Transfer' ? 'secondary' :
                                                                    'outline'
                                                    }>
                                                        {movement.movement_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(movement.movement_date)}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{movement.material_code || 'N/A'}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {movement.material_description || movement.material_name || 'N/A'}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(movement.quantity || 0).toFixed(2)} {movement.unit_of_measure || ''}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {movement.from_location || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {movement.to_location || '-'}
                                                        {movement.plant_name && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {movement.plant_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {movement.receipt_number || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={movement.status === 'Posted' ? 'default' : 'outline'}>
                                                        {movement.status || 'Posted'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="font-medium">No material movements found for this purchase order</p>
                                    <p className="text-sm mt-2">Material movements will appear here once goods are received</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="invoices">
                            {isLoadingInvoices ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="ml-2">Loading invoices...</span>
                                </div>
                            ) : invoices && invoices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice Number</TableHead>
                                            <TableHead>Invoice Date</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead className="text-right">Net Amount</TableHead>
                                            <TableHead className="text-right">Tax</TableHead>
                                            <TableHead className="text-right">Gross Amount</TableHead>
                                            <TableHead>Invoice Status</TableHead>
                                            <TableHead>Payment Status</TableHead>
                                            <TableHead>Due Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((invoice: any) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="font-medium">
                                                    {invoice.invoice_number}
                                                </TableCell>
                                                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {invoice.invoice_reference || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {invoice.currency || order?.currency} {Number(invoice.net_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {invoice.currency || order?.currency} {Number(invoice.tax_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {invoice.currency || order?.currency} {Number(invoice.gross_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    {getInvoiceStatusBadge(invoice.invoice_status)}
                                                </TableCell>
                                                <TableCell>
                                                    {getPaymentStatusBadge(invoice.payment_status)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(invoice.due_date)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="font-medium">No invoices found for this purchase order</p>
                                    <p className="text-sm mt-2">Invoices will appear here once they are created for PO {order?.order_number}</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
