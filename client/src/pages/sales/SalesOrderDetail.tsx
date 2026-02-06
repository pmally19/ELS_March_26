
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Truck, CreditCard, User, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function SalesOrderDetail() {
    const [, params] = useRoute("/sales/orders/view/:id");
    const [, setLocation] = useLocation();
    const id = params?.id;

    const { data: orderResponse, isLoading, error } = useQuery({
        queryKey: [`/api/order-to-cash/sales-orders/${id}`],
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading order details...</span>
            </div>
        );
    }

    if (error || !orderResponse?.success) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="text-destructive font-medium">Error loading sales order</div>
                <div className="text-muted-foreground">
                    {(error as Error)?.message || orderResponse?.error || "Order not found or access denied"}
                </div>
                <Button variant="outline" onClick={() => setLocation("/sales/order-to-cash")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sales Orders
                </Button>
            </div>
        );
    }

    const order = orderResponse.data;
    const items = order.items || [];
    const scheduleLines = order.scheduleLines || [];

    return (
        <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/sales/order-to-cash")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            Sales Order {order.orderNumber}
                            <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>
                                {order.status || 'Pending'}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Created on {order.order_date ? format(new Date(order.order_date), "PPP") : "N/A"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        Print Order
                    </Button>
                    <Button>Processing Options</Button>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer Info */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customer</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{order.customer_name}</div>
                        <p className="text-xs text-muted-foreground mt-1">ID: {order.customer_id}</p>
                        <div className="mt-4 space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Email:</span> {order.customer_email || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Phone:</span> {order.customer_phone || 'N/A'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Info */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Financials</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(order.total_amount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total Amount (Gross)</p>
                        <div className="mt-4 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Net Value:</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(order.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax:</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(order.tax_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Status:</span>
                                <Badge variant="outline" className="text-xs">{order.payment_status || 'Pending'}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Info */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {order.delivery_date ? format(new Date(order.delivery_date), "PP") : "Not scheduled"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requested Delivery Date</p>
                        <div className="mt-4 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plant:</span>
                                <span>{order.plant_name || order.plant_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping Point:</span>
                                <span>{order.shipping_point_code || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Incoterms:</span>
                                <span>{order.incoterms || 'N/A'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="items" className="w-full">
                <TabsList>
                    <TabsTrigger value="items">Order Items</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule Lines</TabsTrigger>
                    <TabsTrigger value="partners">Partners</TabsTrigger>
                    <TabsTrigger value="document-flow">Document Flow</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Line Items</CardTitle>
                            <CardDescription>Products and services included in this order</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Item</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="w-[60px]">Unit</TableHead>
                                        <TableHead className="text-right">Net Price</TableHead>
                                        <TableHead className="text-right">Net Value</TableHead>
                                        <TableHead className="text-right">Plant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                                                No items found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item: any, index: number) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">{item.material_code}</TableCell>
                                                <TableCell>{item.material_description || item.material_name}</TableCell>
                                                <TableCell className="text-right">{item.ordered_quantity}</TableCell>
                                                <TableCell>{item.unit_of_measure || item.unit}</TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(item.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(item.net_amount)}
                                                </TableCell>
                                                <TableCell className="text-right">{item.plant_code || item.plant_id}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="schedule">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule Lines</CardTitle>
                            <CardDescription>Delivery schedule and confirmation status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Delivery Date</TableHead>
                                        <TableHead className="text-right">Order Qty</TableHead>
                                        <TableHead className="text-right">Confirmed Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {scheduleLines.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                No schedule lines found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        scheduleLines.map((sl: any) => (
                                            <TableRow key={sl.id}>
                                                <TableCell>
                                                    <Badge variant={sl.confirmation_status === 'CONFIRMED' ? 'default' : 'secondary'} className="text-xs">
                                                        {sl.confirmation_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{sl.delivery_date ? format(new Date(sl.delivery_date), "PP") : "N/A"}</TableCell>
                                                <TableCell className="text-right">{sl.schedule_quantity}</TableCell>
                                                <TableCell className="text-right">{sl.confirmed_quantity}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="partners">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Partners</CardTitle>
                            <CardDescription>Involved parties for this transaction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Sold-To Party</h4>
                                    <div className="p-3 border rounded-md text-sm">
                                        <p className="font-medium">{order.sold_to_name || order.customer_name}</p>
                                        <p className="text-muted-foreground">{order.sold_to_address_text || order.sold_to_city || 'Address not available'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Ship-To Party</h4>
                                    <div className="p-3 border rounded-md text-sm">
                                        <p className="font-medium">{order.ship_to_name || order.customer_name}</p>
                                        <p className="text-muted-foreground">{order.ship_to_address_text || order.ship_to_city || 'Same as Sold-To'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Bill-To Party</h4>
                                    <div className="p-3 border rounded-md text-sm">
                                        <p className="font-medium">{order.bill_to_name || order.customer_name}</p>
                                        <p className="text-muted-foreground">{order.bill_to_address_text || order.bill_to_city || 'Same as Sold-To'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Payer</h4>
                                    <div className="p-3 border rounded-md text-sm">
                                        <p className="font-medium">{order.payer_name || order.customer_name}</p>
                                        <p className="text-muted-foreground">{order.bill_to_address_text || 'Same as Bill-To'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="document-flow">
                    <Card>
                        <CardHeader>
                            <CardTitle>Document Flow</CardTitle>
                            <CardDescription>Related documents in the value chain</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex flex-col items-center">
                                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium">Sales Order</span>
                                    <span className="text-xs text-muted-foreground">{order.orderNumber}</span>
                                </div>
                                <div className="h-0.5 w-10 bg-muted" />
                                {/* Placeholder for flow */}
                                <div className="text-muted-foreground italic">No further documents generated yet</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
