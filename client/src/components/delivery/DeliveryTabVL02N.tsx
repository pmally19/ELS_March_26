import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Package, Truck, CheckCircle, RefreshCw, AlertCircle, Eye, PackageOpen, ClipboardList } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DeliveryTabVL02NProps {
    salesOrdersForDelivery?: any[];
    handleProcessDelivery?: (orderId: number) => void;
    handleOpenEnhancedDeliveryDialog?: (order: any) => void;
    inlineDeliveryId?: number;
    hidePgiTab?: boolean;
    initialTab?: string;
    /** 'view' = Overview tab only (read-only). 'pickpack' = Picking + Packing tabs only. undefined = all tabs */
    mode?: 'view' | 'pickpack';
}

export default function DeliveryTabVL02N({
    salesOrdersForDelivery = [],
    handleProcessDelivery,
    handleOpenEnhancedDeliveryDialog,
    inlineDeliveryId,
    hidePgiTab = false,
    initialTab,
    mode
}: DeliveryTabVL02NProps) {
    // Derive the default tab from mode if initialTab not explicitly provided
    const resolvedInitialTab = initialTab ?? (mode === 'pickpack' ? 'picking' : 'overview');
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(inlineDeliveryId || null);
    const [searchTerm, setSearchTerm] = useState('');
    // Controls which tab the right-pane detail view opens to
    const [activeTab, setActiveTab] = useState<string>(resolvedInitialTab);

    useEffect(() => {
        if (inlineDeliveryId !== undefined) {
            setSelectedDeliveryId(inlineDeliveryId);
        }
    }, [inlineDeliveryId]);

    // Fetch deliveries
    const { data: deliveriesResponse, isLoading: isLoadingDeliveries } = useQuery({
        queryKey: ['/api/delivery'],
    });

    const deliveries = (deliveriesResponse as any)?.data || [];

    // Filtered list
    const filteredDeliveries = deliveries.filter((d: any) =>
        d.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.status || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Detail view queries - enabled only when a delivery is selected
    const { data: deliveryDetailResponse, isLoading: isLoadingDetail } = useQuery({
        queryKey: ['/api/delivery', selectedDeliveryId],
        queryFn: async () => {
            const res = await apiRequest(`/api/delivery/${selectedDeliveryId}`);
            return res.json();
        },
        enabled: !!selectedDeliveryId,
    });

    const { data: pickingOrderResponse } = useQuery({
        queryKey: ['/api/delivery', selectedDeliveryId, 'picking'],
        queryFn: async () => {
            const res = await apiRequest(`/api/delivery/${selectedDeliveryId}/picking`);
            return res.json();
        },
        enabled: !!selectedDeliveryId,
    });

    const { data: handlingUnitsResponse } = useQuery({
        queryKey: ['/api/delivery', selectedDeliveryId, 'handling-units'],
        queryFn: async () => {
            const res = await apiRequest(`/api/delivery/${selectedDeliveryId}/handling-units`);
            return res.json();
        },
        enabled: !!selectedDeliveryId,
    });

    const { data: packagingTypesResponse } = useQuery({
        queryKey: ['/api/delivery/master-data/packaging-types'],
        queryFn: async () => {
            const res = await apiRequest('/api/delivery/master-data/packaging-types');
            return res.json();
        }
    });

    const delivery = (deliveryDetailResponse as any)?.data;
    const pickingOrder = (pickingOrderResponse as any)?.data;
    const handlingUnits = (handlingUnitsResponse as any)?.data || [];
    const packagingTypes = Array.isArray(packagingTypesResponse) ? packagingTypesResponse : ((packagingTypesResponse as any)?.data || []);

    // Mutations
    const startPickingMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/delivery/${id}/start-picking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId] });
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId, 'picking'] });
            toast({ title: "Picking Started", description: "Transfer order created." });
        }
    });

    const confirmPickingMutation = useMutation({
        mutationFn: async ({ id, items }: { id: number, items: any[] }) => {
            const res = await apiRequest(`/api/delivery/${id}/picking`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId] });
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId, 'picking'] });
            toast({ title: "Picking Updated", description: "Picked quantities saved." });
        }
    });

    const createHUMutation = useMutation({
        mutationFn: async ({ id, packagingTypeId, items }: any) => {
            const res = await apiRequest(`/api/delivery/${id}/handling-units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packagingTypeId, items })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId] });
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId, 'handling-units'] });
            toast({ title: "Handling Unit Created", description: "Items packed successfully." });
        }
    });

    const confirmPackingMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/delivery/${id}/confirm-packing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId] });
            toast({ title: "Packing Confirmed", description: "Delivery packing is complete." });
        }
    });

    const saveLoadingMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number, data: any }) => {
            const res = await apiRequest(`/api/delivery/${id}/loading`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery', selectedDeliveryId] });
            toast({ title: "Loading Saved", description: "Loading details updated." });
        }
    });

    const postGIMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/delivery/${id}/post-goods-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to post goods issue");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/delivery'] });
            toast({ title: "Goods Issue Posted", description: `Material document ${data.data?.materialDocumentNumber} created.` });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: 'destructive' });
        }
    });

    // State for forms
    const [pickingQuantities, setPickingQuantities] = useState<Record<number, number>>({});
    const [huPackagingId, setHuPackagingId] = useState<string>('');
    const [huItems, setHuItems] = useState<Record<number, number>>({});

    const [loadingData, setLoadingData] = useState({
        loading_point: '',
        carrier_id: '',
        tracking_reference: '',
        loading_start_date: '',
        loading_completion_date: '',
    });

    React.useEffect(() => {
        if (delivery) {
            setLoadingData({
                loading_point: delivery.loading_point || '',
                carrier_id: delivery.carrier_id?.toString() || '',
                tracking_reference: delivery.tracking_reference || '',
                loading_start_date: delivery.loading_start_date ? new Date(delivery.loading_start_date).toISOString().slice(0, 16) : '',
                loading_completion_date: delivery.loading_completion_date ? new Date(delivery.loading_completion_date).toISOString().slice(0, 16) : '',
            });
        }
    }, [delivery]);

    return (
        <div className={`flex flex-col lg:flex-row gap-6 ${inlineDeliveryId ? 'min-h-[700px]' : 'h-[800px]'}`}>
            {/* LEFT PANE: Master List (30%) - Hidden if inline */}
            {!inlineDeliveryId && (
                <Card className="w-full lg:w-[30%] flex flex-col h-full">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg flex justify-between items-center">
                            Deliveries
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/delivery'] })}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="text-blue-600">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle> Delivery </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-500">Select a Sales Order that is ready for delivery.</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {salesOrdersForDelivery.map((order: any) => (
                                                    <div key={order.id} className="p-4 border rounded-lg hover:border-blue-300 transition-colors">
                                                        <div className="font-semibold">{order.orderNumber || `Order ${order.id}`}</div>
                                                        <div className="text-sm text-gray-600 mb-4">{order.customerDisplayName || order.customerName || `Customer ${order.customer_id}`}</div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" className="flex-1" onClick={() => {
                                                                if (handleProcessDelivery) handleProcessDelivery(order.id);
                                                            }}>
                                                                <Truck className="h-3 w-3 mr-1" /> Auto-Create Delivery
                                                            </Button>
                                                            {handleOpenEnhancedDeliveryDialog && (
                                                                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEnhancedDeliveryDialog(order)}>
                                                                    <Package className="h-3 w-3 mr-1" /> Partial Delivery
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {salesOrdersForDelivery.length === 0 && (
                                                    <div className="col-span-2 text-center py-8 text-gray-500">
                                                        No sales orders are currently ready for delivery.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <div className="px-4 pb-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search delivery..."
                                className="pl-9 bg-gray-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        {isLoadingDeliveries ? (
                            <div className="p-4 text-center">Loading...</div>
                        ) : (
                            <div className="divide-y">
                                {filteredDeliveries.map((d: any) => (
                                    <div
                                        key={d.id}
                                        className={`p-3 hover:bg-gray-50 transition-colors ${selectedDeliveryId === d.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-blue-900 text-sm">{d.delivery_number}</span>
                                            <div className="flex items-center gap-1">
                                                <Badge variant={d.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">{d.status}</Badge>
                                                {/* Icon 1: View delivery/packing/picking details */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                                                    title="View Delivery & Packing/Picking Details"
                                                    onClick={() => {
                                                        setSelectedDeliveryId(d.id);
                                                        setActiveTab('overview');
                                                    }}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {/* Icon 2: Perform Pick & Pack operations */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100"
                                                    title="Pick & Pack Operations"
                                                    onClick={() => {
                                                        setSelectedDeliveryId(d.id);
                                                        setActiveTab('picking');
                                                    }}
                                                >
                                                    <PackageOpen className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            Date: {d.delivery_date ? new Date(d.delivery_date).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1 py-0 ${d.picking_status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-300' : d.picking_status === 'IN_PROGRESS' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : 'bg-gray-50 text-gray-500'}`}
                                            >
                                                Pick: {d.picking_status || 'NOT_STARTED'}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1 py-0 ${d.packing_status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-300' : d.packing_status === 'IN_PROGRESS' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : 'bg-gray-50 text-gray-500'}`}
                                            >
                                                Pack: {d.packing_status || 'NOT_STARTED'}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1 py-0 ${d.pgi_status === 'POSTED' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500'}`}
                                            >
                                                PGI: {d.pgi_status || 'PENDING'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {filteredDeliveries.length === 0 && <div className="p-4 text-center text-gray-500">No deliveries found.</div>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* RIGHT PANE: Detail View */}
            <Card className={`w-full ${!inlineDeliveryId ? 'lg:w-[70%]' : ''} flex flex-col ${inlineDeliveryId ? 'min-h-[700px]' : 'h-full'} overflow-hidden border`}>
                {isLoadingDetail ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
                        <RefreshCw className="h-10 w-10 mb-4 animate-spin opacity-40" />
                        <p className="text-sm font-medium">Loading delivery details...</p>
                    </div>
                ) : !selectedDeliveryId || !delivery ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-16 w-16 mb-4 opacity-20" />
                        <p>{inlineDeliveryId ? 'Could not load delivery details.' : 'Select a delivery from the list to view details'}</p>
                    </div>
                ) : (
                    <>
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{delivery.delivery_number}</CardTitle>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                        <span>Customer: <span className="font-medium text-gray-900">{delivery.customer_name || delivery.customer_id}</span></span>
                                        <span>Order: <span className="font-medium text-gray-900">{delivery.sales_order_number || delivery.sales_order_id}</span></span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <div className="flex gap-2 items-center flex-wrap justify-end">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Picking</div>
                                            <Badge className={`text-xs mt-0.5 ${delivery.picking_status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-300' : delivery.picking_status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-600'}`}>
                                                {delivery.picking_status || 'NOT STARTED'}
                                            </Badge>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Packing</div>
                                            <Badge className={`text-xs mt-0.5 ${delivery.packing_status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-300' : delivery.packing_status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-600'}`}>
                                                {delivery.packing_status || 'NOT STARTED'}
                                            </Badge>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Status</div>
                                            <Badge className="mt-0.5">{delivery.status}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <div className="border-b px-6 py-2 bg-white">
                                    <TabsList>
                                        {/* view mode: Overview only */}
                                        {(!mode || mode === 'view') && <TabsTrigger value="overview">Overview</TabsTrigger>}
                                        {/* pickpack mode: Picking + Packing only */}
                                        {(!mode || mode === 'pickpack') && <TabsTrigger value="picking">Picking</TabsTrigger>}
                                        {(!mode || mode === 'pickpack') && <TabsTrigger value="packing">Packing</TabsTrigger>}
                                        {/* full mode: Loading + PGI */}
                                        {!mode && <TabsTrigger value="loading">Loading</TabsTrigger>}
                                        {!mode && !hidePgiTab && <TabsTrigger value="pgi">Post GI</TabsTrigger>}
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {/* OVERVIEW TAB */}
                                    <TabsContent value="overview" className="m-0 space-y-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Shipping Point</div>
                                                <div className="font-medium">{delivery.shipping_point}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Route Code</div>
                                                <div className="font-medium">{delivery.route_code || '-'}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Total Amount</div>
                                                <div className="font-medium">${delivery.total_amount || 0}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Movement Type</div>
                                                <div className="font-medium">{delivery.movement_type}</div>
                                            </div>
                                        </div>

                                        <h4 className="font-semibold text-lg mt-6 mb-2">Delivery Items</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Item Cat.</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Storage Loc</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {delivery.items?.map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.line_item}</TableCell>
                                                        <TableCell>{item.material_code}</TableCell>
                                                        <TableCell>{item.material_description}</TableCell>
                                                        <TableCell>
                                                            {item.item_category ? (
                                                                <Badge variant="outline" className="text-blue-700 bg-blue-50/50 border-blue-200">{item.item_category}</Badge>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{item.delivery_quantity} {item.unit}</TableCell>
                                                        <TableCell>{item.storage_location}</TableCell>
                                                        <TableCell>{item.batch}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>

                                    {/* PICKING TAB */}
                                    <TabsContent value="picking" className="m-0 space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold text-lg">Picking / Transfer Order</h4>
                                            {!pickingOrder && delivery.picking_status === 'NOT_STARTED' && (
                                                <Button onClick={() => startPickingMutation.mutate(delivery.id)} disabled={startPickingMutation.isPending}>
                                                    Start Picking
                                                </Button>
                                            )}
                                            {delivery.picking_status === 'COMPLETED' && (
                                                <Badge className="bg-green-100 text-green-800 border-none">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Picking Completed
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Delivery Items Reference Panel */}
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                                                <span className="text-sm font-semibold text-blue-900">
                                                    Delivery {delivery.delivery_number}
                                                </span>
                                                <span className="text-xs text-blue-600">
                                                    Customer: <strong>{delivery.customer_name || delivery.customer_id}</strong>
                                                </span>
                                                <span className="text-xs text-blue-600">
                                                    Order: <strong>{delivery.sales_order_number || delivery.sales_order_id}</strong>
                                                </span>
                                                <span className="text-xs text-blue-600">
                                                    Date: <strong>{delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : '—'}</strong>
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto rounded border border-blue-100 bg-white">
                                                <Table>
                                                    <TableHeader className="bg-blue-50">
                                                        <TableRow>
                                                            <TableHead className="text-xs text-blue-700 py-2">Item</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2">Material</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2">Description</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2 text-right">Qty</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2">UoM</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2">Storage Loc</TableHead>
                                                            <TableHead className="text-xs text-blue-700 py-2">Batch</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(delivery.items || []).map((di: any) => (
                                                            <TableRow key={di.id} className="text-sm hover:bg-blue-50/50">
                                                                <TableCell className="py-1.5 font-medium">{di.line_item}</TableCell>
                                                                <TableCell className="py-1.5 font-mono text-xs text-blue-800">{di.material_code || di.product_code}</TableCell>
                                                                <TableCell className="py-1.5">{di.material_description || di.material_name || di.product_name}</TableCell>
                                                                <TableCell className="py-1.5 text-right font-semibold">{di.delivery_quantity}</TableCell>
                                                                <TableCell className="py-1.5 text-xs text-gray-500">{di.unit}</TableCell>
                                                                <TableCell className="py-1.5">{di.storage_location}</TableCell>
                                                                <TableCell className="py-1.5 font-mono text-xs">{di.batch}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {pickingOrder && (
                                            <div className="space-y-4 shadow-sm border p-4 rounded-lg bg-white">
                                                <div className="flex justify-between items-center border-b pb-3 mb-3">
                                                    <div>
                                                        <div className="text-sm text-gray-500">Transfer Order</div>
                                                        <div className="font-bold text-lg">{pickingOrder.picking_number}</div>
                                                    </div>
                                                    <Badge variant={pickingOrder.status === 'COMPLETED' ? 'default' : 'outline'}>{pickingOrder.status}</Badge>
                                                </div>

                                                <div className="border rounded-md mt-4 shadow-sm bg-white overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-gray-100">
                                                            <TableRow>
                                                                <TableHead className="w-[100px] text-center border-r"><Badge variant="outline" className="bg-white">Status</Badge></TableHead>
                                                                <TableHead className="border-r">Material</TableHead>
                                                                <TableHead className="text-right border-r">Expected</TableHead>
                                                                <TableHead className="border-r">Source Bin</TableHead>
                                                                <TableHead className="w-[180px] bg-blue-50">Picked Qty</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {(pickingOrder.items || []).map((item: any) => {
                                                                const currentInputQty = pickingQuantities[item.id] !== undefined ? pickingQuantities[item.id] : item.picked_qty;
                                                                const isFullyPicked = currentInputQty >= item.required_qty;

                                                                return (
                                                                    <TableRow key={item.id} className={isFullyPicked ? "bg-green-50/20" : ""}>
                                                                        <TableCell className="text-center w-[100px] border-r">
                                                                            {isFullyPicked ? (
                                                                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                                            ) : (
                                                                                <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="border-r font-medium text-blue-800">
                                                                            {item.material_code}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-medium border-r">{item.required_qty}</TableCell>
                                                                        <TableCell className="border-r">
                                                                            <Badge variant="secondary" className="font-mono text-xs">{item.from_storage_bin || 'WH-1'}</Badge>
                                                                        </TableCell>
                                                                        <TableCell className="bg-blue-50/30">
                                                                            {delivery.status === 'COMPLETED' || pickingOrder.status === 'COMPLETED' ? (
                                                                                <span className="font-bold flex items-center justify-end pr-3 text-lg">{item.picked_qty}</span>
                                                                            ) : (
                                                                                <Input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    max={item.required_qty}
                                                                                    value={currentInputQty}
                                                                                    onChange={(e) => {
                                                                                        const val = Number(e.target.value);
                                                                                        setPickingQuantities({ ...pickingQuantities, [item.id]: val > item.required_qty ? item.required_qty : val })
                                                                                    }}
                                                                                    className={`w-full text-right font-bold transition-all ${isFullyPicked ? 'border-green-400 focus-visible:ring-green-400 bg-green-50' : 'border-blue-400 focus-visible:ring-blue-400 bg-white'}`}
                                                                                />
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                    {pickingOrder.status !== 'COMPLETED' && delivery.status !== 'COMPLETED' && (
                                                        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                                                            <div className="text-sm text-gray-600 flex items-center">
                                                                <AlertCircle className="h-4 w-4 mr-2 text-blue-500" /> Verify picked quantities reflect actual physical moves.
                                                            </div>
                                                            <Button
                                                                onClick={() => {
                                                                    let hasError = false;
                                                                    const itemsToUpdate = (pickingOrder?.items || []).map((i: any) => {
                                                                        const rawVal = pickingQuantities[i.id] !== undefined ? pickingQuantities[i.id] : i.picked_qty;
                                                                        const finalQty = Math.max(0, Math.min(rawVal, i.required_qty)); // Clamp picking line to maximum allowed limit
                                                                        if (rawVal > i.required_qty) hasError = true;
                                                                        return { id: i.id, picked_qty: finalQty };
                                                                    });
                                                                    
                                                                    if (hasError) {
                                                                        toast({ title: "Validation Error", description: "Picked quantity cannot exceed required delivery quantity. Values have been adjusted.", variant: 'destructive' });
                                                                    }

                                                                    confirmPickingMutation.mutate({ id: delivery.id, items: itemsToUpdate });
                                                                }}
                                                                disabled={confirmPickingMutation.isPending}
                                                                className="bg-blue-700 hover:bg-blue-800 font-semibold shadow-sm"
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-2" /> Confirm Picking Quantities
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* PACKING TAB */}
                                    <TabsContent value="packing" className="m-0 space-y-6">
                                        <div className="flex justify-between items-center border-b pb-4">
                                            <div>
                                                <h4 className="font-semibold text-lg">Handling Units</h4>
                                                <p className="text-sm text-gray-500">Pack items into handling units (optional).</p>
                                            </div>
                                            {delivery.picking_status !== 'COMPLETED' ? (
                                                <div className="text-sm text-red-500 flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-1" />
                                                    Complete picking first
                                                </div>
                                            ) : (
                                                delivery.packing_status !== 'COMPLETED' && (
                                                    <div className="flex gap-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" onClick={() => {
                                                                    // Pre-fill Handling Unit items with fully picked quantities
                                                                    const initialHuItems: Record<number, number> = {};
                                                                    const pickItems = pickingOrder?.items || [];
                                                                    
                                                                    delivery.items?.forEach((item: any) => {
                                                                         const matchingPickItem = pickItems.find((pi: any) => pi.delivery_item_id === item.id);
                                                                         initialHuItems[item.id] = matchingPickItem ? Math.max(0, matchingPickItem.picked_qty) : item.delivery_quantity;
                                                                    });
                                                                    setHuItems(initialHuItems);
                                                                }}><Plus className="w-4 h-4 mr-1" /> Create HU</Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Pack Items into Handling Unit</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4 pt-4">
                                                                    <div>
                                                                        <Label>Packaging Material</Label>
                                                                        <Select value={huPackagingId} onValueChange={setHuPackagingId}>
                                                                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {packagingTypes.map((pt: any) => (
                                                                                    <SelectItem key={pt.id} value={pt.id.toString()}>{pt.name} ({pt.code})</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="pt-2 border-t">
                                                                        <Label className="mb-2 block">Items to Pack</Label>
                                                                        {delivery.items?.map((item: any) => {
                                                                            const maxPackable = delivery.picking_status === 'COMPLETED' 
                                                                                ? (pickingOrder?.items?.find((pi: any) => pi.material_code === item.material_code)?.picked_qty || item.delivery_quantity)
                                                                                : item.delivery_quantity;

                                                                            return (
                                                                                <div key={item.id} className="flex justify-between items-center mb-2">
                                                                                    <span className="text-sm">{item.material_code} (max: {maxPackable})</span>
                                                                                    <Input
                                                                                        type="number" className="w-24" placeholder="Qty"
                                                                                        min={0}
                                                                                        max={maxPackable}
                                                                                        value={huItems[item.id] !== undefined ? huItems[item.id] : ''}
                                                                                        onChange={e => {
                                                                                            const val = parseFloat(e.target.value);
                                                                                            setHuItems({ ...huItems, [item.id]: val > maxPackable ? maxPackable : val });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <Button className="w-full" onClick={() => {
                                                                        const itemsPayload = Object.entries(huItems)
                                                                            .filter(([k, v]) => v > 0)
                                                                            .map(([k, v]) => {
                                                                                const itemDef = delivery.items.find((i: any) => i.id.toString() === k);
                                                                                return { delivery_item_id: parseInt(k), material_id: itemDef.material_id, packed_qty: v };
                                                                            });
                                                                        if (!huPackagingId || itemsPayload.length === 0) return toast({ title: "Validation Error", description: "Select packaging and at least 1 item", variant: 'destructive' });
                                                                        createHUMutation.mutate({ id: delivery.id, packagingTypeId: parseInt(huPackagingId), items: itemsPayload });
                                                                    }}>Pack</Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button onClick={() => confirmPackingMutation.mutate(delivery.id)}>Complete Packing</Button>
                                                    </div>
                                                )
                                            )}
                                            {delivery.packing_status === 'COMPLETED' && (
                                                <Badge className="bg-green-100 text-green-800 border-none">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Packing Completed
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Delivery Items Reference Panel */}
                                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <Package className="h-4 w-4 text-green-600 shrink-0" />
                                                <span className="text-sm font-semibold text-green-900">
                                                    Delivery {delivery.delivery_number}
                                                </span>
                                                <span className="text-xs text-green-700">
                                                    Customer: <strong>{delivery.customer_name || delivery.customer_id}</strong>
                                                </span>
                                                <span className="text-xs text-green-700">
                                                    Order: <strong>{delivery.sales_order_number || delivery.sales_order_id}</strong>
                                                </span>
                                                <span className="text-xs text-green-700">
                                                    Date: <strong>{delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : '—'}</strong>
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto rounded border border-green-100 bg-white">
                                                <Table>
                                                    <TableHeader className="bg-green-50">
                                                        <TableRow>
                                                            <TableHead className="text-xs text-green-700 py-2">Item</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2">Material</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2">Description</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2 text-right">Qty</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2">UoM</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2">Storage Loc</TableHead>
                                                            <TableHead className="text-xs text-green-700 py-2">Batch</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(delivery.items || []).map((di: any) => (
                                                            <TableRow key={di.id} className="text-sm hover:bg-green-50/50">
                                                                <TableCell className="py-1.5 font-medium">{di.line_item}</TableCell>
                                                                <TableCell className="py-1.5 font-mono text-xs text-green-800">{di.material_code || di.product_code}</TableCell>
                                                                <TableCell className="py-1.5">{di.material_description || di.material_name || di.product_name}</TableCell>
                                                                <TableCell className="py-1.5 text-right font-semibold">{di.delivery_quantity}</TableCell>
                                                                <TableCell className="py-1.5 text-xs text-gray-500">{di.unit}</TableCell>
                                                                <TableCell className="py-1.5">{di.storage_location}</TableCell>
                                                                <TableCell className="py-1.5 font-mono text-xs">{di.batch}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {handlingUnits.length === 0 ? <p className="text-sm text-gray-500 italic">No handling units created.</p> : null}
                                            {handlingUnits.map((hu: any) => (
                                                <div key={hu.id} className="border p-4 rounded bg-gray-50 flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <div className="font-bold text-lg">{hu.hu_number}</div>
                                                        <div className="text-sm text-gray-600">{hu.packaging_material_name} • {parseFloat(hu.net_weight).toFixed(2)} {hu.weight_unit} Net</div>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <span className="text-gray-500 block mb-1">Contains:</span>
                                                        {hu.items?.map((hi: any) => (
                                                            <div key={hi.id}>{hi.material_code} - {hi.packed_qty}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    {/* LOADING TAB */}
                                    <TabsContent value="loading" className="m-0 space-y-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold text-lg">Loading Information</h4>
                                            {delivery.loading_status === 'COMPLETED' && (
                                                <Badge className="bg-green-100 text-green-800 border-none">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Loading Completed
                                                </Badge>
                                            )}
                                        </div>

                                        {delivery.items && delivery.items.length > 0 && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-4">
                                                <h5 className="text-sm font-semibold text-blue-900 mb-2">Required Handling Equipment</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from(new Set(delivery.items.map((i: any) => i.loading_group).filter(Boolean))).length > 0 ? (
                                                        Array.from(new Set(delivery.items.map((i: any) => i.loading_group).filter(Boolean))).map(lg => (
                                                            <Badge key={lg as string} variant="outline" className="bg-white text-blue-800 border-blue-200">
                                                                Loading Group: {lg as string}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-blue-700 italic">No specific loading equipment required by items.</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-blue-700 mt-2">
                                                    * Equipment requirements are determined automatically from the Material Master's Loading Group.
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                                            <div className="space-y-1">
                                                <Label>Loading Point</Label>
                                                <Input
                                                    value={loadingData.loading_point}
                                                    onChange={e => setLoadingData({ ...loadingData, loading_point: e.target.value })}
                                                    disabled={delivery.loading_status === 'COMPLETED'}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Carrier ID</Label>
                                                <Input
                                                    value={loadingData.carrier_id}
                                                    onChange={e => setLoadingData({ ...loadingData, carrier_id: e.target.value })}
                                                    disabled={delivery.loading_status === 'COMPLETED'}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Start Date</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={loadingData.loading_start_date}
                                                    onChange={e => setLoadingData({ ...loadingData, loading_start_date: e.target.value })}
                                                    disabled={delivery.loading_status === 'COMPLETED'}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Completion Date</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={loadingData.loading_completion_date}
                                                    onChange={e => setLoadingData({ ...loadingData, loading_completion_date: e.target.value })}
                                                    disabled={delivery.loading_status === 'COMPLETED'}
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <Label>Tracking Reference</Label>
                                                <Input
                                                    value={loadingData.tracking_reference}
                                                    onChange={e => setLoadingData({ ...loadingData, tracking_reference: e.target.value })}
                                                    disabled={delivery.loading_status === 'COMPLETED'}
                                                />
                                            </div>
                                        </div>

                                        {delivery.loading_status !== 'COMPLETED' && (
                                            <div className="flex gap-2 pt-4">
                                                <Button variant="outline" onClick={() => saveLoadingMutation.mutate({ id: delivery.id, data: { ...loadingData, is_completed: false } })}>
                                                    Save Draft
                                                </Button>
                                                <Button onClick={() => saveLoadingMutation.mutate({ id: delivery.id, data: { ...loadingData, is_completed: true } })}>
                                                    Complete Loading
                                                </Button>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* PGI TAB */}
                                    {!hidePgiTab && (
                                        <TabsContent value="pgi" className="m-0 space-y-6">
                                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                                <h4 className="font-semibold text-blue-900 flex items-center mb-2">
                                                    <Truck className="w-5 h-5 mr-2" />
                                                    Post Goods Issue
                                                </h4>
                                                <p className="text-sm text-blue-800">
                                                    Posting goods issue will reduce inventory, generate a material document, and complete the delivery process.
                                                    It will then be ready for billing.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 my-6">
                                                <div className="border p-4 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-semibold text-gray-700">Picking</span>
                                                        {delivery.picking_status === 'COMPLETED' ? <Badge className="bg-green-100 text-green-800 border-none">Ready</Badge> : <Badge variant="destructive">Incomplete</Badge>}
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-semibold text-gray-700">Packing</span>
                                                        <span className="text-sm text-gray-500">{delivery.packing_status || 'Optional'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-gray-700">Loading</span>
                                                        <span className="text-sm text-gray-500">{delivery.loading_status || 'Optional'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center items-center p-4">
                                                    {delivery.pgi_status === 'POSTED' ? (
                                                        <div className="text-center">
                                                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                                                            <h3 className="text-xl font-bold text-gray-900">Goods Issue Posted</h3>
                                                            <p className="text-sm text-gray-500 mt-1">Material Doc: {delivery.pgi_document_number}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center w-full">
                                                            <Button
                                                                size="lg"
                                                                className="w-full text-lg h-16"
                                                                disabled={delivery.picking_status !== 'COMPLETED' || postGIMutation.isPending}
                                                                onClick={() => postGIMutation.mutate(delivery.id)}
                                                            >
                                                                Post Goods Issue
                                                            </Button>
                                                            {delivery.picking_status !== 'COMPLETED' && (
                                                                <p className="text-sm text-red-500 mt-2">Cannot post PGI: Picking is incomplete.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}
                                </div>
                            </Tabs>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
