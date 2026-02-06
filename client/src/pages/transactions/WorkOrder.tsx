import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Wrench, Calendar, CheckCircle, Clock, AlertTriangle, Settings } from 'lucide-react';

interface WorkOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  equipment: string;
  equipmentDescription: string;
  functionalLocation: string;
  plant: string;
  workCenter: string;
  priority: number;
  orderDescription: string;
  systemStatus: string;
  userStatus: string;
  orderStatus: string;
  plannedStartDate: string;
  plannedFinishDate: string;
  actualStartDate: string;
  actualFinishDate: string;
  basicStartDate: string;
  basicFinishDate: string;
  estimatedCosts: number;
  actualCosts: number;
  currency: string;
  responsiblePerson: string;
  plannerGroup: string;
  workOrderType: string;
  maintenanceActivityType: string;
  breakdown: boolean;
  plannedMaintenance: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function WorkOrder() {
  const [activeTab, setActiveTab] = useState<string>("orders");

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['/api/work-orders'],
    queryFn: async () => {
      const res = await fetch('/api/work-orders', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch work orders');
      return res.json();
    },
  });

  const orders = Array.isArray(orderData?.data) ? orderData.data : [];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Created': return 'bg-gray-100 text-gray-800';
      case 'Released': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'On Hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 1 && priority <= 2) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    } else if (priority >= 3 && priority <= 4) {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />;
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
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <Badge variant="secondary">Maintenance Management</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-gray-600">Total Work Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {orders.filter(order => order.breakdown).length}
                </div>
                <p className="text-xs text-gray-600">Breakdown Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {orders.filter(order => order.plannedMaintenance).length}
                </div>
                <p className="text-xs text-gray-600">Planned Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">$</span>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(orders.reduce((sum, order) => sum + order.actualCosts, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Work Orders</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Types</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
              <CardDescription>Maintenance orders and equipment service</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading work orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-4">No work orders found. Create one to get started.</div>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Planned Start</TableHead>
                    <TableHead>Planned Finish</TableHead>
                    <TableHead>Estimated Costs</TableHead>
                    <TableHead>Actual Costs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono font-bold">{order.equipment}</div>
                          <div className="text-sm text-gray-600">{order.equipmentDescription}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.orderDescription}</TableCell>
                      <TableCell className="font-mono">{order.workCenter}</TableCell>
                      <TableCell>{order.plannedStartDate}</TableCell>
                      <TableCell>{order.plannedFinishDate}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(order.estimatedCosts)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(order.actualCosts)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.orderStatus)}>
                          {order.orderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getPriorityIcon(order.priority)}
                          <span className="font-mono">{order.priority}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Types</CardTitle>
              <CardDescription>Different types of maintenance activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold">Breakdown Maintenance</h3>
                        <p className="text-sm text-gray-600">Emergency repairs and unplanned maintenance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Planned Maintenance</h3>
                        <p className="text-sm text-gray-600">Scheduled preventive maintenance activities</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Predictive Maintenance</h3>
                        <p className="text-sm text-gray-600">Condition-based maintenance strategies</p>
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