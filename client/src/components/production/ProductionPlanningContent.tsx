import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, TrendingUp, Package, Calendar, Settings, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlanningAreasConfiguration from "./MRPAreasConfiguration";
import PlanningRequirementsManagement from "./MRPRequirementsManagement";

// Interfaces for type safety
interface PlannedOrder {
  id: number;
  orderNumber: string;
  materialId: number;
  materialDescription: string;
  plantId: number;
  plantName: string;
  plannedQuantity: string;
  unitOfMeasure: string;
  plannedStartDate: string;
  plannedFinishDate: string;
  requirementDate: string;
  orderType: string;
  conversionStatus: string;
  planningController?: string;
  mrpController?: string; // Legacy field name for backward compatibility
  planningStrategy: string;
  createdBy: string;
  createdAt: string;
}

interface PurchaseRequisition {
  id: number;
  requisition_number: string;
  requestor_name: string;
  request_date: string;
  required_date: string;
  plant_name: string;
  priority: string;
  status: string;
  approval_status: string;
  total_estimated_value: string;
  currency: string;
  business_justification: string;
  created_by: string;
}

function ProductionPlanningContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);
  const [selectedPlanningArea, setSelectedPlanningArea] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch plants from database
  const { data: plantsData } = useQuery<Array<{ id: number; code: string; name: string; description?: string; is_active: boolean }>>({
    queryKey: ["/api/production-planning/plants"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/plants");
      if (!response.ok) throw new Error("Failed to fetch plants");
      const result = await response.json();
      return result.data || [];
    },
  });

  // Fetch planning areas from database
  const { data: planningAreasData } = useQuery<Array<{ id: number; mrp_area?: string; planning_area?: string; description?: string; plant_id?: number }>>({
    queryKey: ["/api/production-planning/planning-areas", selectedPlantId],
    queryFn: async () => {
      const url = selectedPlantId 
        ? `/api/production-planning/planning-areas?plantId=${selectedPlantId}`
        : "/api/production-planning/planning-areas";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch planning areas");
      const result = await response.json();
      return result.data || [];
    },
    enabled: true,
  });

  // Fetch planning horizon from database
  const { data: planningHorizonData } = useQuery<number | null>({
    queryKey: ["/api/production-planning/planning-horizon"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/planning-horizon");
      if (!response.ok) throw new Error("Failed to fetch planning horizon");
      const result = await response.json();
      return result.data?.planningHorizon || null;
    },
  });

  // Fetch planned orders
  const { data: plannedOrdersData, isLoading: isLoadingOrders } = useQuery<{ data: PlannedOrder[]; totalPlannedOrders?: number; openPlannedOrders?: number }>({
    queryKey: ["/api/production-planning/planned-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/planned-orders");
      if (!response.ok) throw new Error("Failed to fetch planned orders");
      return response.json();
    },
    enabled: true,
  });

  // Fetch purchase requisitions
  const { data: requisitionsData, isLoading: isLoadingReq } = useQuery<{ data: PurchaseRequisition[]; totalRequisitions?: number; pendingRequisitions?: number }>({
    queryKey: ["/api/production-planning/purchase-requisitions"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/purchase-requisitions");
      if (!response.ok) throw new Error("Failed to fetch purchase requisitions");
      return response.json();
    },
    enabled: true,
  });

  // Material Planning Run mutation
  const materialPlanningRunMutation = useMutation({
    mutationFn: async (data: { plantId: number; planningArea?: string; planningHorizon?: number }) => {
      const response = await fetch("/api/production-planning/material-planning/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to run material planning");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Material Planning Completed",
        description: "Material planning has been executed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/planned-orders"] });
    },
    onError: (error) => {
      toast({
        title: "Material Planning Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRunMaterialPlanning = () => {
    if (!selectedPlantId) {
      toast({
        title: "Plant Required",
        description: "Please select a plant before running material planning.",
        variant: "destructive",
      });
      return;
    }

    materialPlanningRunMutation.mutate({
      plantId: selectedPlantId,
      planningArea: selectedPlanningArea || undefined,
      planningHorizon: planningHorizonData || undefined,
    });
  };

  // Set default plant when plants are loaded
  useEffect(() => {
    if (plantsData && plantsData.length > 0 && !selectedPlantId) {
      setSelectedPlantId(plantsData[0].id);
    }
  }, [plantsData, selectedPlantId]);

  const plannedOrders = plannedOrdersData?.data || [];
  const requisitions = requisitionsData?.data || [];

  const getStatusBadge = (status: string, type: "conversion" | "approval" | "priority") => {
    const statusConfig = {
      conversion: {
        open: { variant: "secondary" as const, label: "Open" },
        converted: { variant: "default" as const, label: "Converted" },
        cancelled: { variant: "destructive" as const, label: "Cancelled" },
      },
      approval: {
        pending: { variant: "secondary" as const, label: "Pending" },
        approved: { variant: "default" as const, label: "Approved" },
        rejected: { variant: "destructive" as const, label: "Rejected" },
      },
      priority: {
        urgent: { variant: "destructive" as const, label: "Urgent" },
        high: { variant: "default" as const, label: "High" },
        normal: { variant: "secondary" as const, label: "Normal" },
        medium: { variant: "secondary" as const, label: "Medium" },
        low: { variant: "outline" as const, label: "Low" },
      },
    };

    const config = statusConfig[type]?.[status.toLowerCase()] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter functions
  const filteredPlannedOrders = plannedOrders.filter((order: PlannedOrder) => {
    const matchesSearch = order.materialDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.conversionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRequisitions = requisitions.filter((req: PurchaseRequisition) => {
    const matchesSearch = req.business_justification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.requisition_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Planning</h2>
          <p className="text-sm text-muted-foreground">
            Material Planning, Purchase Requisitions, and Production Scheduling
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedPlantId?.toString() || undefined}
            onValueChange={(value) => {
              setSelectedPlantId(value ? parseInt(value) : null);
              setSelectedPlanningArea(null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select plant" />
            </SelectTrigger>
            <SelectContent>
              {plantsData?.map((plant: any) => (
                <SelectItem key={plant.id} value={plant.id.toString()}>
                  {plant.code} - {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRunMaterialPlanning} 
            disabled={materialPlanningRunMutation.isPending || !selectedPlantId}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {materialPlanningRunMutation.isPending ? "Running Material Planning..." : "Run Material Planning"}
          </Button>
        </div>
      </div>

      {/* Production Planning Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="planned-orders">Planned Orders</TabsTrigger>
          <TabsTrigger value="requisitions">Purchase Requisitions</TabsTrigger>
          <TabsTrigger value="planning-areas">Planning Areas</TabsTrigger>
          <TabsTrigger value="planning-requirements">Planning Requirements</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Planned Orders */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Planned Orders</span>
                </div>
                <div className="text-2xl font-bold">{plannedOrdersData?.totalPlannedOrders || plannedOrders.length}</div>
              </CardContent>
            </Card>

            {/* Open Planned Orders */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Open Orders</span>
                </div>
                <div className="text-2xl font-bold">{plannedOrdersData?.openPlannedOrders || plannedOrders.filter((o: PlannedOrder) => o.conversionStatus === 'open').length}</div>
              </CardContent>
            </Card>

            {/* Total Requisitions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Purchase Requisitions</span>
                </div>
                <div className="text-2xl font-bold">{requisitionsData?.totalRequisitions || requisitions.length}</div>
              </CardContent>
            </Card>

            {/* Pending Requisitions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pending Approval</span>
                </div>
                <div className="text-2xl font-bold">{requisitionsData?.pendingRequisitions || requisitions.filter((r: PurchaseRequisition) => r.approval_status === 'pending').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Planning Activity</CardTitle>
              <CardDescription>Latest production planning updates and actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requisitions.slice(0, 3).map((req: PurchaseRequisition) => (
                  <div key={req.id} className="flex items-center space-x-4 border-b pb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{req.requisition_number}</p>
                      <p className="text-xs text-muted-foreground">{req.business_justification}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{req.currency} {req.total_estimated_value}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.request_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planned Orders Tab */}
        <TabsContent value="planned-orders" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search planned orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingOrders ? (
                <div className="p-8 text-center">Loading planned orders...</div>
              ) : filteredPlannedOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Plant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Planning Controller</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlannedOrders.map((order: PlannedOrder) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.materialDescription}</div>
                            <div className="text-xs text-muted-foreground">ID: {order.materialId}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.plantName}</TableCell>
                        <TableCell>{order.plannedQuantity} {order.unitOfMeasure}</TableCell>
                        <TableCell>{new Date(order.plannedStartDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.conversionStatus, "conversion")}</TableCell>
                        <TableCell>{order.planningController || order.mrpController}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm || statusFilter !== "all" ? "No planned orders match your filters." : "No planned orders found."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search requisitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingReq ? (
                <div className="p-8 text-center">Loading purchase requisitions...</div>
              ) : filteredRequisitions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisition #</TableHead>
                      <TableHead>Requestor</TableHead>
                      <TableHead>Plant</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Required Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequisitions.map((req: PurchaseRequisition) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.requisition_number}</TableCell>
                        <TableCell>{req.requestor_name}</TableCell>
                        <TableCell>{req.plant_name}</TableCell>
                        <TableCell>{getStatusBadge(req.priority, "priority")}</TableCell>
                        <TableCell>{getStatusBadge(req.status, "conversion")}</TableCell>
                        <TableCell>{getStatusBadge(req.approval_status, "approval")}</TableCell>
                        <TableCell>{req.currency} {parseFloat(req.total_estimated_value).toLocaleString()}</TableCell>
                        <TableCell>{new Date(req.required_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm || statusFilter !== "all" ? "No requisitions match your filters." : "No purchase requisitions found."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning Areas Tab */}
        <TabsContent value="planning-areas" className="space-y-4">
          <PlanningAreasConfiguration />
        </TabsContent>

        <TabsContent value="planning-requirements" className="space-y-4">
          <PlanningRequirementsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProductionPlanningContent;