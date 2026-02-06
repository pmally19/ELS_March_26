import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, DollarSign, Calendar, Package } from 'lucide-react';
import { Link } from 'wouter';

interface SalesOrder {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  status: string;
  deliveryDate: string;
  items: number;
  quoteReference?: string;
}

export default function SalesOrderManagement() {
  const { data: ordersData, isLoading } = useQuery<{ data: SalesOrder[] }>({
    queryKey: ['/api/production-transaction-tiles/sales-order-management'],
  });

  const orders = ordersData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Confirmed': 'bg-green-100 text-green-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShoppingCart className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading sales orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Order Management</h1>
          <p className="text-muted-foreground">Order-to-cash processing with availability checking and pricing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              {orders.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              ${orders.reduce((sum: number, order: SalesOrder) => sum + order.amount, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmed Orders</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {orders.filter((order: SalesOrder) => order.status === 'Confirmed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {orders.reduce((sum: number, order: SalesOrder) => sum + order.items, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>
            Complete order processing with availability checking, pricing, and delivery scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Quote Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: SalesOrder) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {order.quoteReference || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {order.amount.toLocaleString()} {order.currency}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      {order.items}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(order.deliveryDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}