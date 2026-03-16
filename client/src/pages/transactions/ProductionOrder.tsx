import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Factory, Calendar, CheckCircle, Clock, AlertTriangle, Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  materialNumber: string;
  materialDescription: string;
  plant: string;
  workCenter: string;
  orderQuantity: number;
  unitOfMeasure: string;
  startDate: string;
  finishDate: string;
  actualStartDate: string;
  actualFinishDate: string;
  confirmedQuantity: number;
  scrapQuantity: number;
  remainingQuantity: number;
  orderStatus: string;
  systemStatus: string;
  userStatus: string;
  costCenter: string;
  profitCenter: string;
  salesOrder: string;
  reservationNumber: string;
  bom: string;
  routing: string;
  priority: number;
  responsiblePerson: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface ApiResponse {
  data: ProductionOrder[];
}

export default function ProductionOrder() {
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orderData, isLoading, refetch } = useQuery<ApiResponse>({
    queryKey: ['/api/production/orders', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all'
        ? '/api/production/orders'
        : `/api/production/orders?status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch production orders');
      return response.json();
    },
  });

  const orders = orderData?.data || [];

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.materialDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Created': return 'bg-gray-100 text-gray-800';
      case 'Released': return 'bg-blue-100 text-blue-800';
      case 'In Production': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
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

  const formatQuantity = (quantity: number, uom: string): string => {
    return `${quantity.toLocaleString()} ${uom}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header Section */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Production Order
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manufacturing order management (SAP CO01/CO02)</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">Live Data</Badge>
        </div>
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by order number or material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Created">Created</SelectItem>
              <SelectItem value="Released">Released</SelectItem>
              <SelectItem value="In Production">In Production</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-indigo-500">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Factory className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                <p className="text-xs text-gray-500 font-medium">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {orders.filter(order => order.orderStatus === 'Released' || order.orderStatus === 'In Production').length}
                </div>
                <p className="text-xs text-gray-500 font-medium">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Calendar className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {orders.reduce((sum, order) => sum + order.orderQuantity, 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 font-medium">Total Quantity</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-rose-500">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle className="h-7 w-7 text-rose-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {orders.filter(order => order.priority >= 1 && order.priority <= 2).length}
                </div>
                <p className="text-xs text-gray-500 font-medium">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Production Orders</TabsTrigger>
          <TabsTrigger value="confirmations">Confirmations</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="shadow-sm border-t-2 border-t-indigo-500">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="text-xl font-semibold">Production Orders (CO03)</CardTitle>
              <CardDescription className="text-gray-600">Manufacturing orders and production planning</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <TableHead className="font-semibold text-gray-700">Order Number</TableHead>
                      <TableHead className="font-semibold text-gray-700">Material</TableHead>
                      <TableHead className="font-semibold text-gray-700">Plant/Work Center</TableHead>
                      <TableHead className="font-semibold text-gray-700">Order Quantity</TableHead>
                      <TableHead className="font-semibold text-gray-700">Confirmed</TableHead>
                      <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                      <TableHead className="font-semibold text-gray-700">Start Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Finish Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700">Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      if (isLoading) {
                        return (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              Loading production orders...
                            </TableCell>
                          </TableRow>
                        );
                      }
                      if (filteredOrders.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              {searchTerm || statusFilter !== 'all'
                                ? 'No production orders match your filters.'
                                : 'No production orders found. Create your first order!'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredOrders.map((order, index) => (
                        <TableRow key={order.id} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100 last:border-0">
                          <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono font-bold">{order.materialNumber}</div>
                              <div className="text-sm text-gray-600">{order.materialDescription}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono">{order.plant}</div>
                              <div className="text-sm text-gray-600">{order.workCenter}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono font-bold">{formatQuantity(order.orderQuantity, order.unitOfMeasure)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono text-green-600">{formatQuantity(order.confirmedQuantity, order.unitOfMeasure)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono text-orange-600">{formatQuantity(order.remainingQuantity, order.unitOfMeasure)}</div>
                          </TableCell>
                          <TableCell>{order.startDate}</TableCell>
                          <TableCell>{order.finishDate}</TableCell>
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
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmations">
          <Card>
            <CardHeader>
              <CardTitle>Production Confirmations</CardTitle>
              <CardDescription>Production activity confirmation and reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Factory className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Operation Confirmation</h3>
                        <p className="text-sm text-gray-600">Confirm operation completion</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Goods Receipt</h3>
                        <p className="text-sm text-gray-600">Post finished goods to stock</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Exception Handling</h3>
                        <p className="text-sm text-gray-600">Manage scrap and variances</p>
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