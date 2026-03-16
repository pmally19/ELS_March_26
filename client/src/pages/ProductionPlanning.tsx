import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Factory, ClipboardList, Settings, Play, Plus, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface PlannedOrder {
  id: number;
  plannedOrderNumber: string;
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
  mrpController: string;
  planningStrategy: string;
  createdBy: string;
  createdAt: string;
}

interface PurchaseRequisition {
  id: number;
  requisitionNumber: string;
  requestorName: string;
  requestDate: string;
  requiredDate: string;
  plantName: string;
  priority: string;
  status: string;
  approvalStatus: string;
  totalEstimatedValue: string;
  currency: string;
  businessJustification: string;
  createdBy: string;
}

interface Analytics {
  totalPlannedOrders: number;
  totalRequisitions: number;
  openPlannedOrders: number;
  pendingRequisitions: number;
}

const ProductionPlanning = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isCreatePODialogOpen, setIsCreatePODialogOpen] = useState(false);
  const [isCreateReqDialogOpen, setIsCreateReqDialogOpen] = useState(false);
  const [isMrpDialogOpen, setIsMrpDialogOpen] = useState(false);

  // Fetch analytics
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/production-planning/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const result = await response.json();
      return result.data;
    },
    enabled: true,
  });

  // Fetch planned orders
  const { data: plannedOrdersData, isLoading: isLoadingPO } = useQuery<{ data: PlannedOrder[] }>({
    queryKey: ["/api/production-planning/planned-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/planned-orders");
      if (!response.ok) throw new Error("Failed to fetch planned orders");
      return response.json();
    },
    enabled: true,
  });

  // Fetch purchase requisitions
  const { data: requisitionsData, isLoading: isLoadingReq } = useQuery<{ data: PurchaseRequisition[] }>({
    queryKey: ["/api/production-planning/purchase-requisitions"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/purchase-requisitions");
      if (!response.ok) throw new Error("Failed to fetch purchase requisitions");
      return response.json();
    },
    enabled: true,
  });

  // Material Planning Run mutation
  const mrpRunMutation = useMutation({
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
        title: "Material Planning Complete",
        description: "Material planning executed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/planned-orders"] });
      setIsMrpDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Material Planning Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Fetch plants from database
  const { data: plantsData } = useQuery<Array<{ id: number; code: string; name: string }>>({
    queryKey: ["/api/production-planning/plants"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/plants");
      if (!response.ok) throw new Error("Failed to fetch plants");
      const result = await response.json();
      return result.data || [];
    },
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

  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);

  // Set default plant when plants are loaded
  useEffect(() => {
    if (plantsData && plantsData.length > 0 && !selectedPlantId) {
      setSelectedPlantId(plantsData[0].id);
    }
  }, [plantsData, selectedPlantId]);

  const handleRunMaterialPlanning = () => {
    if (!selectedPlantId) {
      toast({
        title: "Plant Required",
        description: "Please select a plant before running material planning.",
        variant: "destructive",
      });
      return;
    }

    mrpRunMutation.mutate({
      plantId: selectedPlantId,
      planningArea: undefined,
      planningHorizon: planningHorizonData || undefined,
    });
  };

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
        low: { variant: "outline" as const, label: "Low" },
      },
    };

    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]];
    return (
      <Badge variant={config?.variant || "secondary"}>
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="bg-primary/10 p-2 rounded-md">
            <Factory className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Production Planning</h1>
            <p className="text-muted-foreground">Manage planned orders, purchase requisitions, and material planning</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isMrpDialogOpen} onOpenChange={setIsMrpDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Run Material Planning
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
            <DialogTitle>Run Material Planning</DialogTitle>
            <DialogDescription>
              Execute material planning to create planned orders and purchase requisitions based on material requirements.
            </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plant</Label>
                    <Select
                      value={selectedPlantId?.toString() || undefined}
                      onValueChange={(value) => setSelectedPlantId(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {plantsData?.map((plant) => (
                          <SelectItem key={plant.id} value={plant.id.toString()}>
                            {plant.code} - {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Planning Horizon (Days)</Label>
                    <Input 
                      type="number" 
                      value={planningHorizonData || ""} 
                      placeholder="From database settings"
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMrpDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRunMaterialPlanning}
                  disabled={mrpRunMutation.isPending || !selectedPlantId}
                >
                  {mrpRunMutation.isPending ? "Running..." : "Execute Material Planning"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planned Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalPlannedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Production & purchase plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Planned Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.openPlannedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Requisitions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalRequisitions || 0}</div>
            <p className="text-xs text-muted-foreground">Total requisitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.pendingRequisitions || 0}</div>
            <p className="text-xs text-muted-foreground">Require approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planned-orders">Planned Orders</TabsTrigger>
          <TabsTrigger value="requisitions">Purchase Requisitions</TabsTrigger>
          <TabsTrigger value="planning-areas">Planning Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Planned Orders</CardTitle>
                <CardDescription>Latest production and purchase plans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plannedOrders.slice(0, 5).map((order: PlannedOrder) => (
                    <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.plannedOrderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.materialDescription}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{order.plannedQuantity} {order.unitOfMeasure}</p>
                        {getStatusBadge(order.conversionStatus, "conversion")}
                      </div>
                    </div>
                  ))}
                  {plannedOrders.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No planned orders found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Purchase Requisitions</CardTitle>
                <CardDescription>Latest procurement requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requisitions.slice(0, 5).map((req: PurchaseRequisition) => (
                    <div key={req.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{req.requisitionNumber}</p>
                        <p className="text-sm text-muted-foreground">By {req.requestorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{req.totalEstimatedValue} {req.currency}</p>
                        {getStatusBadge(req.approvalStatus, "approval")}
                      </div>
                    </div>
                  ))}
                  {requisitions.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No requisitions found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="planned-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Planned Orders</CardTitle>
                  <CardDescription>Production and purchase planning orders from MRP</CardDescription>
                </div>
                <Button onClick={() => setIsCreatePODialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Planned Order
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Order Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPO ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : plannedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No planned orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    plannedOrders.map((order: PlannedOrder) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.plannedOrderNumber}</TableCell>
                        <TableCell>{order.materialDescription}</TableCell>
                        <TableCell>{order.plantName}</TableCell>
                        <TableCell>{order.plannedQuantity} {order.unitOfMeasure}</TableCell>
                        <TableCell>
                          <Badge variant={order.orderType === "production" ? "default" : "secondary"}>
                            {order.orderType}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.plannedStartDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.conversionStatus, "conversion")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">Convert</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Purchase Requisitions</CardTitle>
                  <CardDescription>Purchase requests requiring approval and conversion</CardDescription>
                </div>
                <Button onClick={() => setIsCreateReqDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Requisition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition Number</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Required Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReq ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : requisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No purchase requisitions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requisitions.map((req: PurchaseRequisition) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.requisitionNumber}</TableCell>
                        <TableCell>{req.requestorName}</TableCell>
                        <TableCell>{req.plantName}</TableCell>
                        <TableCell>{new Date(req.requiredDate).toLocaleDateString()}</TableCell>
                        <TableCell>{req.totalEstimatedValue} {req.currency}</TableCell>
                        <TableCell>{getStatusBadge(req.priority, "priority")}</TableCell>
                        <TableCell>{getStatusBadge(req.approvalStatus, "approval")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">Approve</Button>
                            <Button size="sm" variant="outline">Convert</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning-areas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planning Areas Configuration</CardTitle>
              <CardDescription>Material planning area settings and controllers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Planning Areas Configuration</h3>
                <p className="text-muted-foreground mb-4">
                  Configure planning areas, planning horizons, and lot sizing strategies for optimal material planning.
                </p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Planning Areas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionPlanning;