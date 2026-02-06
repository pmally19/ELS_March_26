import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, Factory, Play, Pause, CheckCircle, Clock, AlertTriangle, Monitor } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';

//  Shop Floor Control Type Definitions
interface WorkCenter {
  id: string;
  workCenterCode: string;
  workCenterName: string;
  plant: string;
  capacity: number;
  currentLoad: number;
  status: 'Available' | 'Busy' | 'Maintenance' | 'Breakdown';
  efficiency: number;
  lastUpdate: string;
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  material: string;
  materialDescription: string;
  plannedQuantity: number;
  confirmedQuantity: number;
  workCenter: string;
  startDate: string;
  endDate: string;
  status: 'Released' | 'In Process' | 'Completed' | 'On Hold';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  operationNumber: string;
}

interface QualityAlert {
  id: string;
  orderNumber: string;
  workCenter: string;
  alertType: 'Quality Issue' | 'Material Shortage' | 'Equipment Failure' | 'Safety Concern';
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  reportedBy: string;
  reportedAt: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export default function ShopFloorControl() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("workcenters");

  // Fetch plants for dropdown
  const { data: plantsData = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/plant'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/plant');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Set first plant as default if available
  useEffect(() => {
    if (plantsData.length > 0 && !selectedPlant) {
      setSelectedPlant(plantsData[0].id?.toString() || plantsData[0].code || "");
    }
  }, [plantsData, selectedPlant]);

  // Fetch work centers from database
  const { data: workCentersData, isLoading: workCentersLoading } = useQuery({
    queryKey: ['/api/production/work-centers/list', selectedPlant],
    queryFn: async () => {
      const response = await fetch('/api/production/work-centers/list');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Fetch released production orders from database
  const { data: productionOrdersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/production/orders', selectedPlant],
    queryFn: async () => {
      const response = await fetch('/api/production/orders?status=RELEASED,IN_PROGRESS');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
  });

  // Transform work centers data
  const sapWorkCenters: WorkCenter[] = (workCentersData || []).map((wc: any) => ({
    id: wc.id?.toString() || '',
    workCenterCode: wc.code || '',
    workCenterName: wc.name || '',
    plant: wc.plant_id?.toString() || selectedPlant,
    capacity: wc.capacity || 0,
    currentLoad: 0, // TODO: Calculate from production orders
    status: wc.status === 'ACTIVE' ? 'Available' : (wc.status || 'Available'),
    efficiency: 0, // TODO: Calculate from historical data
    lastUpdate: wc.updated_at || new Date().toISOString()
  }));

  // Transform production orders data
  const sapProductionOrders: ProductionOrder[] = (productionOrdersData || []).map((po: any) => ({
    id: po.id?.toString() || '',
    orderNumber: po.order_number || '',
    material: po.material_code || '',
    materialDescription: po.material_name || po.material_description || '',
    plannedQuantity: parseFloat(po.planned_quantity || 0),
    confirmedQuantity: parseFloat(po.confirmed_quantity || 0),
    workCenter: '', // Will be populated from operations
    startDate: po.planned_start_date || '',
    endDate: po.planned_end_date || '',
    status: po.status === 'RELEASED' ? 'Released' : (po.status === 'IN_PROGRESS' ? 'In Process' : po.status || 'Released'),
    priority: po.priority || 'Medium',
    operationNumber: '0010' // Will be populated from operations
  }));

  // Quality alerts - empty for now (can be added later if quality module exists)
  const sapQualityAlerts: QualityAlert[] = [];

  // Mutation for production confirmations
  const confirmProductionMutation = useMutation({
    mutationFn: async (confirmationData: any) => {
      const response = await fetch(`/api/production/orders/${confirmationData.orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: confirmationData.operationId,
          actualQuantity: confirmationData.quantityConfirmed,
          scrapQuantity: 0
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm operation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production/orders'] });
      refetchOrders();
    }
  });

  const handleRefresh = (): void => {
    refetchOrders();
    queryClient.invalidateQueries({ queryKey: ['/api/production/work-centers/list'] });
  };

  const handleConfirmProduction = async (order: ProductionOrder): Promise<void> => {
    if (!permissions.hasDataModificationRights) {
      alert('You do not have permission to confirm production');
      return;
    }

    // Fetch operations for this order
    try {
      const opsResponse = await fetch(`/api/production/orders/${order.id}/operations`);
      if (!opsResponse.ok) {
        alert('Failed to fetch operations for this order');
        return;
      }
      const opsData = await opsResponse.json();
      const operations = opsData.data || opsData || [];

      if (operations.length === 0) {
        alert('No operations found for this order');
        return;
      }

      // Find first pending operation
      const pendingOp = operations.find((op: any) => op.status === 'PENDING' || op.status === 'CREATED');
      if (!pendingOp) {
        alert('No pending operations found');
        return;
      }

      const confirmationData = {
        orderId: order.id,
        operationId: pendingOp.id,
        quantityConfirmed: order.plannedQuantity - order.confirmedQuantity
      };

      confirmProductionMutation.mutate(confirmationData);
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to confirm production'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Available': 'bg-green-100 text-green-800',
      'Busy': 'bg-yellow-100 text-yellow-800',
      'Maintenance': 'bg-orange-100 text-orange-800',
      'Breakdown': 'bg-red-100 text-red-800',
      'Released': 'bg-blue-100 text-blue-800',
      'In Process': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={priorityColors[priority] || 'bg-gray-100 text-gray-800'}>
        {priority}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Shop Floor Control</h1>
            <p className="text-muted-foreground"> PP-SFC | Real-time production execution and manufacturing control</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            CO15/CO11N
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Manufacturing Control Center
              </CardTitle>
              <CardDescription>
                Monitor and control real-time production activities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {plantsData.length > 0 ? (
                    plantsData.map((plant: any) => (
                      <SelectItem key={plant.id || plant.code} value={plant.id?.toString() || plant.code}>
                        {plant.code} - {plant.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_plants__" disabled>No plants available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchOrders();
                  queryClient.invalidateQueries({ queryKey: ['/api/production/work-centers/list'] });
                }}
                disabled={ordersLoading || workCentersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(ordersLoading || workCentersLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'workcenters', label: 'Work Centers', icon: Factory },
              { id: 'orders', label: 'Production Orders', icon: Play },
              { id: 'alerts', label: 'Quality Alerts', icon: AlertTriangle }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Work Centers Tab */}
          {activeTab === 'workcenters' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Work Centers</p>
                        <p className="text-2xl font-bold">2</p>
                      </div>
                      <Factory className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Efficiency</p>
                        <p className="text-2xl font-bold">90.9%</p>
                      </div>
                      <Monitor className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Capacity</p>
                        <p className="text-2xl font-bold">240</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Center</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Current Load</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sapWorkCenters.map((wc) => (
                      <TableRow key={wc.id}>
                        <TableCell className="font-medium">{wc.workCenterCode}</TableCell>
                        <TableCell>{wc.workCenterName}</TableCell>
                        <TableCell>{wc.capacity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {wc.currentLoad}
                            <div className="w-20 h-2 bg-gray-200 rounded">
                              <div
                                className="h-2 bg-blue-500 rounded"
                                style={{ width: `${(wc.currentLoad / wc.capacity) * 100}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{wc.efficiency}%</TableCell>
                        <TableCell>{getStatusBadge(wc.status)}</TableCell>
                        <TableCell>{wc.lastUpdate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Production Orders Tab */}
          {activeTab === 'orders' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sapProductionOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.material}</div>
                          <div className="text-sm text-muted-foreground">{order.materialDescription}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.workCenter}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{order.confirmedQuantity} / {order.plannedQuantity}</span>
                            <span>{Math.round((order.confirmedQuantity / order.plannedQuantity) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded">
                            <div
                              className="h-2 bg-green-500 rounded"
                              style={{ width: `${(order.confirmedQuantity / order.plannedQuantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmProduction(order)}
                            disabled={order.status === 'Completed'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Quality Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert ID</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sapQualityAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.id}</TableCell>
                      <TableCell>{alert.orderNumber}</TableCell>
                      <TableCell>{alert.workCenter}</TableCell>
                      <TableCell>{alert.alertType}</TableCell>
                      <TableCell>{getPriorityBadge(alert.severity)}</TableCell>
                      <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{alert.reportedBy}</div>
                          <div className="text-xs text-muted-foreground">{alert.reportedAt}</div>
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
    </div>
  );
}