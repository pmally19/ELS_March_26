import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Download, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Release Order Button Component
function ReleaseOrderButton({ orderId, orderNumber }: { orderId: number; orderNumber: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReleasing, setIsReleasing] = useState(false);

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      const response = await apiRequest(`/api/production/orders/${orderId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released_by: 1 }), // TODO: Get from auth context
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || 'Failed to release order');
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/production/orders'] });
      toast({
        title: "Order Released",
        description: `Production order ${orderNumber} has been released successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to release production order",
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRelease}
      disabled={isReleasing}
    >
      {isReleasing ? "Releasing..." : "Release"}
    </Button>
  );
}

interface Material {
  id: number;
  code?: string;
  material_code?: string;
  name?: string;
  description?: string;
  base_uom?: string;
  base_unit?: string;
}

interface Plant {
  id: number;
  code: string;
  name: string;
}

interface WorkCenter {
  id: number;
  code: string;
  name: string;
}

export default function OrdersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<any | null>(null);
  const [newOrder, setNewOrder] = useState({
    material_id: "",
    plant_id: "",
    production_version_id: "",
    order_type: "",
    planned_quantity: "",
    planned_start_date: "",
    planned_end_date: "",
    work_center_id: "",
    unit_of_measure: "",
    priority: "",
    notes: "",
    // NEW: Demand-driven fields
    sales_order_id: "",
    demand_source: "", // No default - user must select
    delivery_priority: "NORMAL",
    customer_name: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch production orders from API
  const { data: productionOrders = [], isLoading } = useQuery({
    queryKey: ['/api/production/orders'],
    queryFn: async () => {
      const response = await apiRequest('/api/production/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch production orders');
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    }
  });

  // Fetch unique statuses for filter
  const { data: statuses = [] } = useQuery<string[]>({
    queryKey: ['/api/production/orders/statuses'],
    queryFn: async () => {
      const response = await apiRequest('/api/production/orders/statuses');
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch materials for dropdown
  const { data: materials = [], isLoading: materialsLoading } = useQuery<Material[]>({
    queryKey: ['/api/master-data/materials'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/materials');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }
      // Transform API response to match our interface
      return data
        .filter((item: any) => {
          // First filter: only process items with valid id
          if (!item || !item.id || typeof item.id !== 'number') {
            return false;
          }

          // Get and validate code
          const code = String(item.material_code || item.code || '').trim();
          if (!code || code.length === 0) {
            return false;
          }

          // Get and validate name
          const name = String(item.description || item.name || '').trim();
          if (!name || name.length === 0) {
            return false;
          }

          return true;
        })
        .map((item: any) => ({
          id: item.id,
          code: String(item.material_code || item.code || '').trim(),
          name: String(item.description || item.name || '').trim(),
          description: String(item.description || item.name || '').trim(),
          base_uom: String(item.base_unit || item.base_uom || '').trim(),
        }));
    },
  });

  // Fetch plants for dropdown
  const { data: plants = [], isLoading: plantsLoading } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plants'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/plants');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }
      // Transform API response to match our interface
      return data.map((item: any) => ({
        id: item.id,
        code: item.code || '',
        name: item.name || item.description || '',
      })).filter((item: Plant) => item.id && item.code && item.name);
    },
  });

  // Fetch work centers for dropdown
  const { data: workCenters = [], isLoading: workCentersLoading } = useQuery<WorkCenter[]>({
    queryKey: ['/api/production/work-centers/list'],
    queryFn: async () => {
      const response = await apiRequest('/api/production/work-centers/list');
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch production versions when material and plant are selected
  const { data: productionVersions = [] } = useQuery({
    queryKey: ['/api/master-data/production-versions', newOrder.material_id, newOrder.plant_id],
    queryFn: async () => {
      if (!newOrder.material_id || !newOrder.plant_id) return [];
      const response = await apiRequest(
        `/api/master-data/production-versions?materialId=${newOrder.material_id}&plantId=${newOrder.plant_id}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!newOrder.material_id && !!newOrder.plant_id,
  });

  // Fetch order types from database
  const { data: orderTypes = [] } = useQuery({
    queryKey: ['/api/master-data/production-order-types'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/production-order-types');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
  });

  // Fetch sales orders from database for demand linking
  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery({
    queryKey: ['/api/sales/orders'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales/orders');
      if (!response.ok) return [];
      const data = await response.json();

      // Filter sales orders that are eligible for production order creation
      // Exclude: CANCELLED, COMPLETED, DELIVERED, and orders with production already created
      const orders = data.data || data || [];
      return Array.isArray(orders) ? orders.filter((so: any) => {
        // Exclude cancelled, completed, and delivered orders (case-insensitive)
        const status = (so.status || '').toUpperCase();
        const excludedStatuses = ['CANCELLED', 'COMPLETED', 'DELIVERED', 'CLOSED', 'SHIPPED'];
        if (excludedStatuses.includes(status)) return false;

        // Optionally: Exclude orders that already have production order created
        // Uncomment the line below to hide orders that already have production
        // if (so.production_order_created === true) return false;

        return true;
      }) : [];
    },
  });



  // Create production order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: typeof newOrder) => {
      // Prepare order data, only include production_version_id if it's set
      const orderPayload: any = {
        material_id: parseInt(orderData.material_id),
        plant_id: parseInt(orderData.plant_id),
        order_type: orderData.order_type,
        planned_quantity: parseFloat(orderData.planned_quantity),
        planned_start_date: orderData.planned_start_date,
        planned_end_date: orderData.planned_end_date,
        unit_of_measure: orderData.unit_of_measure || undefined,
        work_center_id: orderData.work_center_id ? parseInt(orderData.work_center_id) : undefined,
        priority: orderData.priority || undefined,
        notes: orderData.notes || undefined,
        // NEW: Demand-driven fields
        sales_order_id: orderData.sales_order_id ? parseInt(orderData.sales_order_id) : undefined,
        demand_source: orderData.demand_source || 'MANUAL',
        delivery_priority: orderData.delivery_priority || undefined,
        customer_name: orderData.customer_name || undefined,
      };

      if (orderData.production_version_id) {
        orderPayload.production_version_id = parseInt(orderData.production_version_id);
      }

      const response = await apiRequest('/api/production/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || 'Failed to create production order');
      }
      return json;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/production/orders'] });
      setLastCalculation(result?.calculation || null);

      // Show ATP check result if available
      if (result?.calculation?.atp_check) {
        if (result.calculation.atp_check.all_available === false) {
          toast({
            title: "ATP Check Warning",
            description: "Some materials may not be available",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Production Order Created",
        description: result?.message || "Production order created successfully",
      });
      setShowNewOrderForm(false);
      setNewOrder({
        material_id: "",
        plant_id: "",
        production_version_id: "",
        order_type: "",
        planned_quantity: "",
        planned_start_date: "",
        planned_end_date: "",
        work_center_id: "",
        unit_of_measure: "",
        priority: "",
        notes: "",
        sales_order_id: "",
        demand_source: "", // No default - user must select
        delivery_priority: "NORMAL",
        customer_name: "",
      });
    },
    onError: (error: Error) => {
      setLastCalculation(null);
      toast({
        title: "Error",
        description: error.message || "Failed to create production order",
        variant: "destructive",
      });
    },
  });

  // Handle material selection to auto-fill unit of measure
  const handleMaterialChange = (materialId: string) => {
    setNewOrder({ ...newOrder, material_id: materialId });
    const selectedMaterial = materials.find((m: Material) => m.id === parseInt(materialId));
    if (selectedMaterial) {
      const uom = selectedMaterial.base_uom || selectedMaterial.base_unit || "";
      if (uom) {
        setNewOrder(prev => ({ ...prev, unit_of_measure: uom }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newOrder.material_id || !newOrder.plant_id || !newOrder.order_type ||
      !newOrder.planned_quantity || !newOrder.planned_start_date || !newOrder.planned_end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Material, Plant, Order Type, Quantity, and Dates)",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(newOrder.planned_quantity) <= 0) {
      toast({
        title: "Validation Error",
        description: "Planned quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (new Date(newOrder.planned_end_date) < new Date(newOrder.planned_start_date)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate(newOrder);
  };

  const filteredOrders = productionOrders.filter(order => {
    const matchesSearch =
      (order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (order.status?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === "all" || order.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case 'planned':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Planned</Badge>;
      case 'released':
        return <Badge variant="default" className="bg-green-500 text-white">Released</Badge>;
      case 'in progress':
        return <Badge variant="default" className="bg-blue-500 text-white">In Progress</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-purple-500 text-white">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-gray-500 text-white">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Last calculation summary */}
      {lastCalculation && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="text-sm">Last Production Order Calculation</CardTitle>
            <CardDescription className="text-xs">
              Material {lastCalculation.material?.code} – {lastCalculation.material?.name} &middot;
              Quantity {lastCalculation.material?.quantity} {lastCalculation.material?.unit_of_measure}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastCalculation.bom?.components?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Component Requirements (from BOM)</p>
                <ul className="text-xs space-y-0.5">
                  {lastCalculation.bom.components.map((comp: any) => (
                    <li key={`${comp.component_code}-${comp.material_id}`}>
                      {comp.component_code} – {comp.component_name}: {comp.required_quantity} {comp.unit_of_measure || ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lastCalculation.routing && (
              <div className="text-xs">
                <p className="font-semibold mb-1">Routing Time (from operations)</p>
                <p>
                  Total time: {typeof lastCalculation.routing.total_time === 'number'
                    ? lastCalculation.routing.total_time.toFixed(2)
                    : lastCalculation.routing.total_time}{" "}
                  {lastCalculation.routing.time_unit || 'MIN'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search production orders..."
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredOrders.length === 0) {
                toast({
                  title: "No Data",
                  description: "No production orders to export",
                  variant: "destructive",
                });
                return;
              }

              const csvContent = filteredOrders.map(order => ({
                OrderNumber: order.order_number || "",
                Product: order.product_name || "",
                Quantity: order.quantity || 0,
                StartDate: formatDate(order.start_date),
                EndDate: formatDate(order.end_date),
                Status: order.status || ""
              }));

              const csvString = [
                Object.keys(csvContent[0]).join(','),
                ...csvContent.map(row => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'production-orders.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filteredOrders.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showNewOrderForm} onOpenChange={setShowNewOrderForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Production Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material_id">Material *</Label>
                    <Select
                      value={newOrder.material_id}
                      onValueChange={handleMaterialChange}
                      disabled={materialsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {materialsLoading ? (
                          <SelectItem value="loading" disabled>Loading materials...</SelectItem>
                        ) : materials.length === 0 ? (
                          <SelectItem value="no-data" disabled>No materials available</SelectItem>
                        ) : (
                          materials.map((material: Material) => (
                            <SelectItem key={material.id} value={material.id.toString()}>
                              {material.code} - {material.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plant_id">Plant *</Label>
                    <Select
                      value={newOrder.plant_id}
                      onValueChange={(value) => setNewOrder({ ...newOrder, plant_id: value })}
                      disabled={plantsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {plantsLoading ? (
                          <SelectItem value="loading" disabled>Loading plants...</SelectItem>
                        ) : plants.length === 0 ? (
                          <SelectItem value="no-data" disabled>No plants available</SelectItem>
                        ) : (
                          plants.map((plant: Plant) => (
                            <SelectItem key={plant.id} value={plant.id.toString()}>
                              {plant.code} - {plant.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="order_type">Order Type *</Label>
                    <Select
                      value={newOrder.order_type}
                      onValueChange={(value) => setNewOrder({ ...newOrder, order_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select order type" />
                      </SelectTrigger>
                      <SelectContent>
                        {orderTypes.length > 0 ? (
                          orderTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.order_type_code}>
                              {type.order_type_code} - {type.description || 'No description'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>No order types available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planned_quantity">Planned Quantity *</Label>
                    <Input
                      id="planned_quantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={newOrder.planned_quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, planned_quantity: e.target.value })}
                      placeholder="Enter quantity"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                    <Input
                      id="unit_of_measure"
                      value={newOrder.unit_of_measure}
                      onChange={(e) => setNewOrder({ ...newOrder, unit_of_measure: e.target.value })}
                      placeholder="e.g., PC, KG"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newOrder.priority || undefined}
                      onValueChange={(value) => setNewOrder({ ...newOrder, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="planned_start_date">Planned Start Date *</Label>
                    <Input
                      id="planned_start_date"
                      type="date"
                      value={newOrder.planned_start_date}
                      onChange={(e) => setNewOrder({ ...newOrder, planned_start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planned_end_date">Planned End Date *</Label>
                    <Input
                      id="planned_end_date"
                      type="date"
                      value={newOrder.planned_end_date}
                      onChange={(e) => setNewOrder({ ...newOrder, planned_end_date: e.target.value })}
                      min={newOrder.planned_start_date}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_center_id">Work Center</Label>
                  <Select
                    value={newOrder.work_center_id || undefined}
                    onValueChange={(value) => setNewOrder({ ...newOrder, work_center_id: value })}
                    disabled={workCentersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work center (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((wc: WorkCenter) => (
                        <SelectItem key={wc.id} value={wc.id.toString()}>
                          {wc.code} - {wc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* NEW: Demand Source Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="demand_source">Demand Source *</Label>
                    <Select
                      value={newOrder.demand_source}
                      onValueChange={(value) => setNewOrder({ ...newOrder, demand_source: value, sales_order_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select demand source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual Order (No Link)</SelectItem>
                        <SelectItem value="SALES_ORDER">From Sales Order</SelectItem>
                        <SelectItem value="STOCK_REPLENISHMENT">Stock Replenishment</SelectItem>
                        <SelectItem value="FORECAST">From Forecast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newOrder.demand_source === 'SALES_ORDER' && (
                    <div className="space-y-2">
                      <Label htmlFor="sales_order_id">Sales Order *</Label>
                      <Select
                        value={newOrder.sales_order_id}
                        onValueChange={(value) => {
                          const selectedSO = salesOrders.find((so: any) => so.id === parseInt(value));
                          setNewOrder({
                            ...newOrder,
                            sales_order_id: value,
                            customer_name: selectedSO?.customer_name || ""
                          });
                        }}
                        disabled={salesOrdersLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales order" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesOrdersLoading ? (
                            <SelectItem value="loading" disabled>Loading sales orders...</SelectItem>
                          ) : salesOrders.length === 0 ? (
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
                  )}
                  {newOrder.demand_source !== 'SALES_ORDER' && <div></div>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    placeholder="Additional notes or instructions"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewOrderForm(false);
                      setNewOrder({
                        material_id: "",
                        plant_id: "",
                        production_version_id: "",
                        order_type: "",
                        planned_quantity: "",
                        planned_start_date: "",
                        planned_end_date: "",
                        work_center_id: "",
                        unit_of_measure: "",
                        priority: "",
                        notes: "",
                        sales_order_id: "",
                        demand_source: "MANUAL",
                        delivery_priority: "NORMAL",
                        customer_name: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Order"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status.toLowerCase()}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading production orders...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Demand Source</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales Order</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number || "N/A"}</TableCell>
                      <TableCell>{order.material_name || order.product_name || "N/A"}</TableCell>
                      <TableCell>
                        {order.actual_quantity || 0} / {order.planned_quantity || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={order.demand_source === 'MANUAL' ? 'outline' : 'default'}
                          className={
                            order.demand_source === 'SALES_ORDER' ? 'bg-blue-500 text-white' :
                              order.demand_source === 'FORECAST' ? 'bg-purple-500 text-white' :
                                order.demand_source === 'STOCK_REPLENISHMENT' ? 'bg-orange-500 text-white' : ''
                          }
                        >
                          {order.demand_source || 'MANUAL'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{order.customer_name || '-'}</TableCell>
                      <TableCell>
                        {order.sales_order_number ? (
                          <a
                            href={`/sales/orders/${order.sales_order_id}`}
                            className="text-blue-600 hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.sales_order_number}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(order.planned_start_date || order.start_date)}</TableCell>
                      <TableCell>{formatDate(order.planned_end_date || order.end_date)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.status === 'Planned' || order.status === 'CREATED' ? (
                          <ReleaseOrderButton orderId={order.id} orderNumber={order.order_number} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm || statusFilter !== "all"
                ? 'No production orders match your filters.'
                : 'No production orders found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}