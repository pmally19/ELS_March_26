import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Package, ArrowRight, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

export default function PlannedOrdersList() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedSalesOrder, setSelectedSalesOrder] = useState('');

    // Fetch planned orders
    const { data: plannedOrders = [], isLoading } = useQuery({
        queryKey: ['/api/planned-orders', statusFilter],
        queryFn: async () => {
            const url = statusFilter === 'all'
                ? '/api/planned-orders'
                : `/api/planned-orders?status=${statusFilter}`;
            const response = await apiRequest(url);
            if (!response.ok) throw new Error('Failed to fetch planned orders');
            const data = await response.json();
            return data.data || data || [];
        },
    });

    // Fetch sales orders for creating planned orders
    const { data: salesOrders = [] } = useQuery({
        queryKey: ['/api/sales/orders'],
        queryFn: async () => {
            const response = await apiRequest('/api/sales/orders');
            if (!response.ok) return [];
            const data = await response.json();
            const orders = data.data || data || [];
            // Only show orders that need planning
            return Array.isArray(orders) ? orders.filter((so: any) => {
                const status = (so.status || '').toUpperCase();
                return !['CANCELLED', 'COMPLETED', 'DELIVERED', 'CLOSED'].includes(status);
            }) : [];
        },
    });

    // Create planned order from sales order
    const createPlannedOrderMutation = useMutation({
        mutationFn: async (salesOrderId: string) => {
            const response = await apiRequest('/api/planned-orders/from-sales-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salesOrderId: parseInt(salesOrderId),
                    createdBy: 'Current User', // TODO: Get from auth context
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create planned order');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Planned order created successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/planned-orders'] });
            setShowCreateDialog(false);
            setSelectedSalesOrder('');
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Convert planned order to production order
    const convertToProductionMutation = useMutation({
        mutationFn: async (plannedOrderId: number) => {
            const response = await apiRequest(`/api/planned-orders/${plannedOrderId}/convert-to-production`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 1, // TODO: Get from auth context
                    userName: 'Current User',
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to convert to production order');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: 'Success',
                description: `Converted to production order ${data.data?.production_order_number || ''}`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/planned-orders'] });
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
        const statusMap: Record<string, { variant: any; label: string }> = {
            Open: { variant: 'default', label: 'Open' },
            Converted: { variant: 'secondary', label: 'Converted' },
            Cancelled: { variant: 'destructive', label: 'Cancelled' },
        };

        const config = statusMap[status] || { variant: 'outline', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            Planned Orders
                        </CardTitle>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button>Create from Sales Order</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Planned Order from Sales Order</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sales_order">Sales Order</Label>
                                        <Select value={selectedSalesOrder} onValueChange={setSelectedSalesOrder}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select sales order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {salesOrders.length === 0 ? (
                                                    <SelectItem value="no-data" disabled>No sales orders available</SelectItem>
                                                ) : (
                                                    salesOrders.map((so: any) => (
                                                        <SelectItem key={so.id} value={so.id.toString()}>
                                                            {so.order_number} - {so.customer_name || 'No Customer'}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowCreateDialog(false);
                                                setSelectedSalesOrder('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => createPlannedOrderMutation.mutate(selectedSalesOrder)}
                                            disabled={!selectedSalesOrder || createPlannedOrderMutation.isPending}
                                        >
                                            {createPlannedOrderMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Create Planned Order
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="mb-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="status-filter">Status:</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Converted">Converted</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>Loading planned orders...</p>
                        </div>
                    ) : plannedOrders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order Number</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Sales Order</TableHead>
                                        <TableHead>Required Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plannedOrders.map((order: any) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.order_number || 'N/A'}</TableCell>
                                            <TableCell>{order.material_name || order.material_code || 'N/A'}</TableCell>
                                            <TableCell>
                                                {order.planned_quantity} {order.unit_of_measure || ''}
                                            </TableCell>
                                            <TableCell>{order.customer_name || '-'}</TableCell>
                                            <TableCell>
                                                {order.sales_order_number ? (
                                                    <a
                                                        href={`/sales/orders/${order.sales_order_id}`}
                                                        className="text-blue-600 hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {order.sales_order_number}
                                                    </a>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{formatDate(order.required_date)}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>
                                                {order.status === 'Open' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => convertToProductionMutation.mutate(order.id)}
                                                        disabled={convertToProductionMutation.isPending}
                                                    >
                                                        <PlayCircle className="h-4 w-4 mr-1" />
                                                        Convert to Production
                                                    </Button>
                                                )}
                                                {order.status === 'Converted' && order.converted_production_order_number && (
                                                    <a
                                                        href={`/production`}
                                                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                                    >
                                                        View Production Order
                                                        <ArrowRight className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No planned orders found</p>
                            <p className="text-sm">Create a planned order from a sales order to get started</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
