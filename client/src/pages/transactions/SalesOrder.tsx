import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingBag, DollarSign, User, Calendar, CheckCircle } from 'lucide-react';

interface SalesOrder {
  id: string;
  salesOrderNumber: string;
  documentType: string;
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  customerNumber: string;
  customerName: string;
  orderDate: string;
  requestedDeliveryDate: string;
  confirmedDeliveryDate: string;
  paymentTerms: string;
  currency: string;
  netValue: number;
  taxValue: number;
  grossValue: number;
  orderStatus: string;
  deliveryStatus: string;
  billingStatus: string;
  creditStatus: string;
  salesOffice: string;
  salesGroup: string;
  soldToParty: string;
  shipToParty: string;
  billToParty: string;
  payerParty: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function SalesOrder() {
  const [activeTab, setActiveTab] = useState<string>("orders");

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/sales-order'],
  });

  const orders = orderData?.data || [];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Process': return 'bg-yellow-100 text-yellow-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Sales Order</h1>
          <Badge variant="secondary">SAP VA01/VA02</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-gray-600">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(orders.reduce((sum, order) => sum + order.grossValue, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {orders.filter(order => order.orderStatus === 'Open' || order.orderStatus === 'In Process').length}
                </div>
                <p className="text-xs text-gray-600">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {new Set(orders.map(order => order.customerNumber)).size}
                </div>
                <p className="text-xs text-gray-600">Unique Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Sales Orders</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders (VA03)</CardTitle>
              <CardDescription>Customer orders and sales documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Net Value</TableHead>
                    <TableHead>Gross Value</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Billing Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold">{order.salesOrderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono">{order.customerNumber}</div>
                          <div className="text-sm text-gray-600">{order.customerName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.orderDate}</TableCell>
                      <TableCell>{order.requestedDeliveryDate}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(order.netValue)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(order.grossValue)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.orderStatus)}>
                          {order.orderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.deliveryStatus)}>
                          {order.deliveryStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.billingStatus)}>
                          {order.billingStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Schedule</CardTitle>
              <CardDescription>Order fulfillment and delivery planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Planned Deliveries</h3>
                        <p className="text-sm text-gray-600">Scheduled delivery processing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <ShoppingBag className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">In Progress</h3>
                        <p className="text-sm text-gray-600">Orders being processed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Completed</h3>
                        <p className="text-sm text-gray-600">Successfully delivered orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}