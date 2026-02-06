import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Factory, Package, Calendar, Settings } from 'lucide-react';
import { Link } from 'wouter';

interface ProductionOrder {
  id: string;
  material: string;
  quantity: number;
  unit: string;
  status: string;
  startDate: string;
  endDate: string;
  workCenter: string;
}

export default function ProductionOrderManagement() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/production-transaction-tiles/production-order-management'],
  });

  const orders = ordersData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Released': 'bg-green-100 text-green-800',
      'Created': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-purple-100 text-purple-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Factory className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading production orders...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Production Order Management</h1>
          <p className="text-muted-foreground">Manufacturing order lifecycle from creation to completion</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Factory className="h-5 w-5 mr-2" />
              {orders.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Quantity</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {orders.reduce((sum: number, order: ProductionOrder) => sum + order.quantity, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Released Orders</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {orders.filter((order: ProductionOrder) => order.status === 'Released').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Work Centers</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {new Set(orders.map((order: ProductionOrder) => order.workCenter)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Production Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Orders</CardTitle>
          <CardDescription>
            Manufacturing order lifecycle with material consumption tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Work Center</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: ProductionOrder) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      {order.material}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.quantity.toLocaleString()} {order.unit}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      {order.workCenter}
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
                      {new Date(order.startDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(order.endDate).toLocaleDateString()}
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