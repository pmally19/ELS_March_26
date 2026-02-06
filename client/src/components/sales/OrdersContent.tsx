import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Eye, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

interface SalesOrder {
    id: number;
    order_number: string;
    customer_name: string;
    order_date: string;
    delivery_date: string;
    status: string;
    total_amount: number;
    currency: string;
}

export default function OrdersContent() {
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch sales orders from the API
    const { data: orders = [], isLoading } = useQuery<SalesOrder[]>({
        queryKey: ['/api/sales/orders'],
        queryFn: async () => {
            const response = await fetch('/api/sales/orders');
            if (!response.ok) {
                throw new Error('Failed to fetch sales orders');
            }
            return response.json();
        },
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status: string) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower.includes('completed') || statusLower.includes('delivered')) {
            return <Badge className="bg-green-500">Completed</Badge>;
        } else if (statusLower.includes('pending') || statusLower.includes('open')) {
            return <Badge className="bg-yellow-500">Pending</Badge>;
        } else if (statusLower.includes('processing') || statusLower.includes('in progress')) {
            return <Badge className="bg-blue-500">Processing</Badge>;
        } else if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
            return <Badge className="bg-red-500">Cancelled</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
    };

    // Filter orders based on search term
    const filteredOrders = orders.filter((order) =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Header with Search and Create Button */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Button asChild>
                    <Link href="/sales/orders/new-with-incoterms">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Sales Order
                    </Link>
                </Button>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Orders ({filteredOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">Loading orders...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                                {searchTerm ? 'No orders found matching your search' : 'No sales orders yet'}
                            </p>
                            <Button asChild variant="outline">
                                <Link href="/sales/orders/new-with-incoterms">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Your First Order
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order Number</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Order Date</TableHead>
                                        <TableHead>Delivery Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.order_number}</TableCell>
                                            <TableCell>{order.customer_name}</TableCell>
                                            <TableCell>{formatDate(order.order_date)}</TableCell>
                                            <TableCell>{formatDate(order.delivery_date)}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell className="text-right">
                                                {order.currency} {order.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" asChild className="justify-start">
                            <Link href="/sales/order-to-cash">
                                Order-to-Cash Process
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="justify-start">
                            <Link href="/sales/configuration">
                                Sales Configuration
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
