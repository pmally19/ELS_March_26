import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, User, Calendar, MapPin, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface DeliveryDetailDialogProps {
    deliveryId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function DeliveryDetailDialog({ deliveryId, isOpen, onClose }: DeliveryDetailDialogProps) {
    // Fetch delivery details from backend
    const { data: deliveryResponse, isLoading, error } = useQuery({
        queryKey: [`/api/delivery/${deliveryId}`],
        queryFn: async () => {
            const response = await fetch(`/api/delivery/${deliveryId}`);
            if (!response.ok) throw new Error('Failed to fetch delivery details');
            return response.json();
        },
        enabled: !!deliveryId && isOpen,
    });

    const delivery = deliveryResponse?.data;
    const items = delivery?.items || [];

    const getStatusBadge = (status: string) => {
        const statusUpper = status?.toUpperCase();
        switch (statusUpper) {
            case 'PENDING':
                return <Badge className="bg-yellow-500">Pending</Badge>;
            case 'CONFIRMED':
                return <Badge className="bg-blue-500">Confirmed</Badge>;
            case 'COMPLETED':
            case 'POSTED':
                return <Badge className="bg-green-500">Completed</Badge>;
            case 'CANCELLED':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), "PPP");
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    };

    if (!deliveryId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Package className="h-5 w-5" />
                        <span>Delivery: {delivery?.delivery_number || `ID ${deliveryId}`}</span>
                        {delivery?.status && getStatusBadge(delivery.status)}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2">Loading delivery details...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">
                        <p className="font-medium">Error loading delivery</p>
                        <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
                    </div>
                ) : delivery ? (
                    <div className="space-y-6">
                        {/* Delivery Information Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Customer Info */}
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-sm">Customer</h3>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{delivery.customer_name || 'N/A'}</p>
                                    <p className="text-sm text-muted-foreground">ID: {delivery.customer_id || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Delivery Details */}
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-sm">Delivery Date</h3>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{formatDate(delivery.delivery_date)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Created: {formatDate(delivery.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* Shipping Info */}
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-sm">Shipping</h3>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">Plant:</span>{' '}
                                        <span className="font-medium">{delivery.plant_code || delivery.plant || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">Shipping Point:</span>{' '}
                                        <span className="font-medium">{delivery.shipping_point || 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sales Order:</span>
                                    <span className="font-medium">{delivery.sales_order_number || delivery.sales_order_id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Incoterms:</span>
                                    <span className="font-medium">{delivery.incoterms || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Route:</span>
                                    <span className="font-medium">{delivery.route || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Delivery Priority:</span>
                                    <span className="font-medium">{delivery.delivery_priority || 'Normal'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Weight:</span>
                                    <span className="font-medium">{delivery.total_weight || 0} {delivery.weight_unit || 'KG'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Volume:</span>
                                    <span className="font-medium">{delivery.total_volume || 0} {delivery.volume_unit || 'M3'}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Delivery Items Table */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold">Delivery Items</h3>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Item</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="w-[80px]">Unit</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Storage Loc</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                                No items found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item: any, index: number) => (
                                            <TableRow key={item.id || index}>
                                                <TableCell>{item.line_number || index + 1}</TableCell>
                                                <TableCell className="font-medium">
                                                    {item.material_code || item.material_id || 'N/A'}
                                                </TableCell>
                                                <TableCell>{item.material_description || item.description || 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    {item.delivery_quantity || item.quantity || 0}
                                                </TableCell>
                                                <TableCell>{item.unit_of_measure || item.unit || 'EA'}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {item.batch || '-'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {item.storage_location || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Posting Information (if posted) */}
                        {delivery.material_document_number && (
                            <>
                                <Separator />
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <h3 className="font-semibold mb-2">Goods Issue Posted</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Material Document:</span>{' '}
                                            <span className="font-medium">{delivery.material_document_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Posted Date:</span>{' '}
                                            <span className="font-medium">{formatDate(delivery.posted_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Notes */}
                        {delivery.notes && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-2">Notes</h3>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        {delivery.notes}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No delivery data available
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
