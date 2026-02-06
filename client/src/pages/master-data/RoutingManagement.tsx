import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronRight, X, ArrowLeft } from "lucide-react";
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
import { Link } from "wouter";

interface RoutingMaster {
  id: number;
  material_code: string;
  material_description?: string;
  plant_code: string;
  plant_name?: string;
  routing_group_code: string;
  base_quantity: string;
  base_unit: string;
  description?: string;
  status?: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
  operations_count?: number;
}

interface RoutingOperation {
  id: number;
  routing_master_id: number;
  operation_number: string;
  operation_description: string;
  work_center_id?: number;
  work_center_code?: string;
  work_center_name?: string;
  setup_time_minutes: number;
  machine_time_minutes: string;
  labor_time_minutes: string;
  sequence_order: number;
  is_active: boolean;
  components_count?: number;
}

interface RoutingComponent {
  id: number;
  routing_operation_id: number;
  material_code: string;
  material_description?: string;
  quantity: string;
  unit: string;
  is_active: boolean;
}

export default function RoutingManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRoutings, setExpandedRoutings] = useState<Set<number>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<number>>(new Set());
  const [selectedRoutingForOperations, setSelectedRoutingForOperations] = useState<number | null>(null);
  const [selectedOperationForComponents, setSelectedOperationForComponents] = useState<number | null>(null);
  
  // Dialog states
  const [showRoutingDialog, setShowRoutingDialog] = useState(false);
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [showComponentDialog, setShowComponentDialog] = useState(false);
  const [editingRouting, setEditingRouting] = useState<RoutingMaster | null>(null);
  const [editingOperation, setEditingOperation] = useState<RoutingOperation | null>(null);
  const [editingComponent, setEditingComponent] = useState<RoutingComponent | null>(null);
  
  // Form states
  const [routingForm, setRoutingForm] = useState({
    materialCode: "",
    plantCode: "",
    routingGroupCode: "",
    baseQuantity: "1",
    baseUnit: "PC",
    description: "",
    status: "ACTIVE",
    validFrom: "",
    validTo: "",
    isActive: true,
  });
  
  const [operationForm, setOperationForm] = useState({
    operationNumber: "",
    operationDescription: "",
    workCenterCode: "",
    setupTimeMinutes: 0,
    machineTimeMinutes: 0,
    laborTimeMinutes: 0,
    sequenceOrder: 10,
    isActive: true,
  });
  
  const [componentForm, setComponentForm] = useState({
    materialCode: "",
    quantity: "1",
    unit: "PC",
    isActive: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch routing masters
  const { data: routings = [], isLoading: routingsLoading, refetch: refetchRoutings } = useQuery<RoutingMaster[]>({
    queryKey: ["/api/master-data/routing"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/routing");
      if (!response.ok) {
        throw new Error("Failed to fetch routings");
      }
      return await response.json();
    },
  });

  // Fetch operations for selected routing
  const { data: operations = [], isLoading: operationsLoading } = useQuery<RoutingOperation[]>({
    queryKey: ["/api/master-data/routing/operations", selectedRoutingForOperations],
    queryFn: async () => {
      if (!selectedRoutingForOperations) return [];
      const response = await apiRequest(`/api/master-data/routing/${selectedRoutingForOperations}/operations`);
      if (!response.ok) {
        throw new Error("Failed to fetch operations");
      }
      return await response.json();
    },
    enabled: selectedRoutingForOperations !== null,
  });

  // Fetch components for selected operation
  const { data: components = [], isLoading: componentsLoading } = useQuery<RoutingComponent[]>({
    queryKey: ["/api/master-data/routing/components", selectedOperationForComponents],
    queryFn: async () => {
      if (!selectedOperationForComponents) return [];
      const response = await apiRequest(`/api/master-data/routing/operations/${selectedOperationForComponents}/components`);
      if (!response.ok) {
        throw new Error("Failed to fetch components");
      }
      return await response.json();
    },
    enabled: selectedOperationForComponents !== null,
  });

  // Fetch materials for dropdowns
  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/material"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/material");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Fetch plants for dropdown
  const { data: plants = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/plant"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/plant");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Fetch work centers for dropdown
  const { data: workCenters = [] } = useQuery<any[]>({
    queryKey: ["/api/master-data/work-center"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/work-center?full=1");
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
  });

  // Filter routings
  const filteredRoutings = routings.filter((routing) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      routing.material_code?.toLowerCase().includes(searchLower) ||
      routing.routing_group_code?.toLowerCase().includes(searchLower) ||
      routing.plant_code?.toLowerCase().includes(searchLower) ||
      routing.description?.toLowerCase().includes(searchLower)
    );
  });

  // Toggle routing expansion
  const toggleRoutingExpansion = (routingId: number) => {
    const newExpanded = new Set(expandedRoutings);
    if (newExpanded.has(routingId)) {
      newExpanded.delete(routingId);
      setSelectedRoutingForOperations(null);
      setExpandedOperations(new Set());
    } else {
      newExpanded.add(routingId);
      setSelectedRoutingForOperations(routingId);
    }
    setExpandedRoutings(newExpanded);
  };

  // Toggle operation expansion
  const toggleOperationExpansion = (operationId: number) => {
    const newExpanded = new Set(expandedOperations);
    if (newExpanded.has(operationId)) {
      newExpanded.delete(operationId);
      setSelectedOperationForComponents(null);
    } else {
      newExpanded.add(operationId);
      setSelectedOperationForComponents(operationId);
    }
    setExpandedOperations(newExpanded);
  };

  // Create/Update Routing Master
  const createRoutingMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingRouting 
        ? `/api/master-data/routing/${editingRouting.id}`
        : "/api/master-data/routing";
      const method = editingRouting ? "PUT" : "POST";
      
      const response = await apiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save routing");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing"] });
      setShowRoutingDialog(false);
      setEditingRouting(null);
      setRoutingForm({
        materialCode: "",
        plantCode: "",
        routingGroupCode: "",
        baseQuantity: "1",
        baseUnit: "PC",
        description: "",
        status: "ACTIVE",
        validFrom: "",
        validTo: "",
        isActive: true,
      });
      toast({
        title: "Success",
        description: editingRouting ? "Routing updated successfully" : "Routing created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save routing",
        variant: "destructive",
      });
    },
  });

  // Create/Update Operation
  const createOperationMutation = useMutation({
    mutationFn: async (data: any) => {
      const routingMasterId = editingOperation 
        ? operations.find(op => op.id === editingOperation.id)?.routing_master_id
        : selectedRoutingForOperations;
      
      if (!routingMasterId) throw new Error("Routing master ID is required");
      
      const url = editingOperation
        ? `/api/master-data/routing/operations/${editingOperation.id}`
        : `/api/master-data/routing/${routingMasterId}/operations`;
      const method = editingOperation ? "PUT" : "POST";
      
      const response = await apiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save operation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing/operations"] });
      setShowOperationDialog(false);
      setEditingOperation(null);
      setOperationForm({
        operationNumber: "",
        operationDescription: "",
        workCenterCode: "",
        setupTimeMinutes: 0,
        machineTimeMinutes: 0,
        laborTimeMinutes: 0,
        sequenceOrder: 10,
        isActive: true,
      });
      toast({
        title: "Success",
        description: editingOperation ? "Operation updated successfully" : "Operation created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save operation",
        variant: "destructive",
      });
    },
  });

  // Create/Update Component
  const createComponentMutation = useMutation({
    mutationFn: async (data: any) => {
      const operationId = editingComponent
        ? editingComponent.routing_operation_id
        : selectedOperationForComponents;
      
      if (!operationId) throw new Error("Operation ID is required");
      
      const url = editingComponent
        ? `/api/master-data/routing/components/${editingComponent.id}`
        : `/api/master-data/routing/operations/${operationId}/components`;
      const method = editingComponent ? "PUT" : "POST";
      
      const response = await apiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save component");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing/components"] });
      setShowComponentDialog(false);
      setEditingComponent(null);
      setComponentForm({
        materialCode: "",
        quantity: "1",
        unit: "PC",
        isActive: true,
      });
      toast({
        title: "Success",
        description: editingComponent ? "Component updated successfully" : "Component created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save component",
        variant: "destructive",
      });
    },
  });

  // Delete Routing
  const deleteRoutingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/routing/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete routing");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing"] });
      toast({
        title: "Success",
        description: "Routing deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete routing",
        variant: "destructive",
      });
    },
  });

  // Delete Operation
  const deleteOperationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/routing/operations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete operation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing/operations"] });
      toast({
        title: "Success",
        description: "Operation deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete operation",
        variant: "destructive",
      });
    },
  });

  // Delete Component
  const deleteComponentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/routing/components/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete component");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/routing/components"] });
      toast({
        title: "Success",
        description: "Component deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete component",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateRouting = () => {
    setEditingRouting(null);
    setRoutingForm({
      materialCode: "",
      plantCode: "",
      routingGroupCode: "",
      baseQuantity: "1",
      baseUnit: "PC",
      description: "",
      status: "ACTIVE",
      validFrom: "",
      validTo: "",
      isActive: true,
    });
    setShowRoutingDialog(true);
  };

  const handleEditRouting = (routing: RoutingMaster) => {
    setEditingRouting(routing);
    setRoutingForm({
      materialCode: routing.material_code || "",
      plantCode: routing.plant_code || "",
      routingGroupCode: routing.routing_group_code || "",
      baseQuantity: routing.base_quantity || "1",
      baseUnit: routing.base_unit || "PC",
      description: routing.description || "",
      status: routing.status || "ACTIVE",
      validFrom: routing.valid_from || "",
      validTo: routing.valid_to || "",
      isActive: routing.is_active ?? true,
    });
    setShowRoutingDialog(true);
  };

  const handleCreateOperation = (routingId: number) => {
    setSelectedRoutingForOperations(routingId);
    setEditingOperation(null);
    setOperationForm({
      operationNumber: "",
      operationDescription: "",
      workCenterCode: "",
      setupTimeMinutes: 0,
      machineTimeMinutes: 0,
      laborTimeMinutes: 0,
      sequenceOrder: 10,
      isActive: true,
    });
    setShowOperationDialog(true);
  };

  const handleEditOperation = (operation: RoutingOperation) => {
    setEditingOperation(operation);
    setOperationForm({
      operationNumber: operation.operation_number || "",
      operationDescription: operation.operation_description || "",
      workCenterCode: operation.work_center_code || "",
      setupTimeMinutes: operation.setup_time_minutes || 0,
      machineTimeMinutes: Number(operation.machine_time_minutes) || 0,
      laborTimeMinutes: Number(operation.labor_time_minutes) || 0,
      sequenceOrder: operation.sequence_order || 10,
      isActive: operation.is_active ?? true,
    });
    setShowOperationDialog(true);
  };

  const handleCreateComponent = (operationId: number) => {
    setSelectedOperationForComponents(operationId);
    setEditingComponent(null);
    setComponentForm({
      materialCode: "",
      quantity: "1",
      unit: "PC",
      isActive: true,
    });
    setShowComponentDialog(true);
  };

  const handleEditComponent = (component: RoutingComponent) => {
    setEditingComponent(component);
    setComponentForm({
      materialCode: component.material_code || "",
      quantity: component.quantity || "1",
      unit: component.unit || "PC",
      isActive: component.is_active ?? true,
    });
    setShowComponentDialog(true);
  };

  const handleDeleteRouting = (routing: RoutingMaster) => {
    if (!confirm(`Are you sure you want to delete routing "${routing.routing_group_code}"?`)) {
      return;
    }
    deleteRoutingMutation.mutate(routing.id);
  };

  const handleDeleteOperation = (operation: RoutingOperation) => {
    if (!confirm(`Are you sure you want to delete operation "${operation.operation_number}"?`)) {
      return;
    }
    deleteOperationMutation.mutate(operation.id);
  };

  const handleDeleteComponent = (component: RoutingComponent) => {
    if (!confirm(`Are you sure you want to delete component "${component.material_code}"?`)) {
      return;
    }
    deleteComponentMutation.mutate(component.id);
  };

  if (routingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading routings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Master Data
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Routing Management</h1>
            <p className="text-gray-600">Manage manufacturing routing sequences</p>
          </div>
        </div>
        <Button onClick={handleCreateRouting}>
          <Plus className="h-4 w-4 mr-2" />
          Create Routing
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by material code, routing group, plant code..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Routings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Routings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Material Code</TableHead>
                <TableHead>Plant Code</TableHead>
                <TableHead>Routing Group</TableHead>
                <TableHead>Base Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No routings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutings.map((routing) => (
                  <React.Fragment key={routing.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRoutingExpansion(routing.id)}
                        >
                          {expandedRoutings.has(routing.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>{routing.material_code}</TableCell>
                      <TableCell>{routing.plant_code}</TableCell>
                      <TableCell>{routing.routing_group_code}</TableCell>
                      <TableCell>
                        {routing.base_quantity} {routing.base_unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={routing.is_active ? "default" : "secondary"}>
                          {routing.status || (routing.is_active ? "ACTIVE" : "INACTIVE")}
                        </Badge>
                      </TableCell>
                      <TableCell>{routing.operations_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRouting(routing)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRouting(routing)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRoutings.has(routing.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-gray-50 p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">Operations</h3>
                              <Button
                                size="sm"
                                onClick={() => handleCreateOperation(routing.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Operation
                              </Button>
                            </div>
                            {operationsLoading ? (
                              <div className="text-center py-4">Loading operations...</div>
                            ) : operations.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                No operations found
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {operations.map((operation) => (
                                  <div key={operation.id} className="border rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleOperationExpansion(operation.id)}
                                        >
                                          {expandedOperations.has(operation.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </Button>
                                        <span className="font-medium">
                                          {operation.operation_number} - {operation.operation_description}
                                        </span>
                                        <Badge variant="outline">
                                          Seq: {operation.sequence_order}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditOperation(operation)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteOperation(operation)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-sm text-gray-600">
                                      <div>WC: {operation.work_center_code || "N/A"}</div>
                                      <div>Setup: {operation.setup_time_minutes} min</div>
                                      <div>Machine: {operation.machine_time_minutes} min</div>
                                      <div>Labor: {operation.labor_time_minutes} min</div>
                                    </div>
                                    {expandedOperations.has(operation.id) && (
                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-medium text-sm">Components</h4>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCreateComponent(operation.id)}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Component
                                          </Button>
                                        </div>
                                        {componentsLoading ? (
                                          <div className="text-sm text-gray-500">Loading components...</div>
                                        ) : components.length === 0 ? (
                                          <div className="text-sm text-gray-500">No components</div>
                                        ) : (
                                          <div className="space-y-1">
                                            {components.map((component) => (
                                              <div
                                                key={component.id}
                                                className="flex items-center justify-between p-2 bg-white rounded border"
                                              >
                                                <div>
                                                  <span className="font-medium">{component.material_code}</span>
                                                  <span className="text-sm text-gray-600 ml-2">
                                                    Qty: {component.quantity} {component.unit}
                                                  </span>
                                                </div>
                                                <div className="flex gap-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditComponent(component)}
                                                  >
                                                    <Edit className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteComponent(component)}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Routing Dialog */}
      <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRouting ? "Edit Routing" : "Create New Routing"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Material Code *</Label>
                <Select
                  value={routingForm.materialCode}
                  onValueChange={(value) => setRoutingForm({ ...routingForm, materialCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material: any) => (
                      <SelectItem key={material.id} value={material.code || material.material_code}>
                        {material.code || material.material_code} - {material.description || material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plant Code *</Label>
                <Select
                  value={routingForm.plantCode}
                  onValueChange={(value) => setRoutingForm({ ...routingForm, plantCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant: any) => (
                      <SelectItem key={plant.id} value={plant.code}>
                        {plant.code} - {plant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Routing Group Code *</Label>
                <Input
                  value={routingForm.routingGroupCode}
                  onChange={(e) => setRoutingForm({ ...routingForm, routingGroupCode: e.target.value })}
                  placeholder="e.g., CHAIR-R01"
                />
              </div>
              <div>
                <Label>Base Quantity *</Label>
                <Input
                  type="number"
                  value={routingForm.baseQuantity}
                  onChange={(e) => setRoutingForm({ ...routingForm, baseQuantity: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div>
                <Label>Base Unit</Label>
                <Input
                  value={routingForm.baseUnit}
                  onChange={(e) => setRoutingForm({ ...routingForm, baseUnit: e.target.value })}
                  placeholder="PC"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={routingForm.status}
                  onValueChange={(value) => setRoutingForm({ ...routingForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={routingForm.validFrom}
                  onChange={(e) => setRoutingForm({ ...routingForm, validFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Valid To</Label>
                <Input
                  type="date"
                  value={routingForm.validTo}
                  onChange={(e) => setRoutingForm({ ...routingForm, validTo: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={routingForm.description}
                onChange={(e) => setRoutingForm({ ...routingForm, description: e.target.value })}
                placeholder="Routing description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoutingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRoutingMutation.mutate(routingForm)}
              disabled={createRoutingMutation.isPending}
            >
              {createRoutingMutation.isPending ? "Saving..." : editingRouting ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Dialog */}
      <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? "Edit Operation" : "Create New Operation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Operation Number *</Label>
                <Input
                  value={operationForm.operationNumber}
                  onChange={(e) => setOperationForm({ ...operationForm, operationNumber: e.target.value })}
                  placeholder="e.g., 0010"
                />
              </div>
              <div>
                <Label>Sequence Order *</Label>
                <Input
                  type="number"
                  value={operationForm.sequenceOrder}
                  onChange={(e) => setOperationForm({ ...operationForm, sequenceOrder: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                />
              </div>
              <div className="col-span-2">
                <Label>Operation Description *</Label>
                <Input
                  value={operationForm.operationDescription}
                  onChange={(e) => setOperationForm({ ...operationForm, operationDescription: e.target.value })}
                  placeholder="e.g., Sawing & Cutting"
                />
              </div>
              <div>
                <Label>Work Center Code</Label>
                <Select
                  value={operationForm.workCenterCode}
                  onValueChange={(value) => setOperationForm({ ...operationForm, workCenterCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work center" />
                  </SelectTrigger>
                  <SelectContent>
                    {workCenters.map((wc: any) => (
                      <SelectItem key={wc.id} value={wc.code || wc.work_center_code}>
                        {wc.code || wc.work_center_code} - {wc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setup Time (Minutes)</Label>
                <Input
                  type="number"
                  value={operationForm.setupTimeMinutes}
                  onChange={(e) => setOperationForm({ ...operationForm, setupTimeMinutes: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Machine Time (Minutes)</Label>
                <Input
                  type="number"
                  value={operationForm.machineTimeMinutes}
                  onChange={(e) => setOperationForm({ ...operationForm, machineTimeMinutes: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Labor Time (Minutes)</Label>
                <Input
                  type="number"
                  value={operationForm.laborTimeMinutes}
                  onChange={(e) => setOperationForm({ ...operationForm, laborTimeMinutes: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOperationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createOperationMutation.mutate(operationForm)}
              disabled={createOperationMutation.isPending}
            >
              {createOperationMutation.isPending ? "Saving..." : editingOperation ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Component Dialog */}
      <Dialog open={showComponentDialog} onOpenChange={setShowComponentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingComponent ? "Edit Component" : "Add Component"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Code *</Label>
              <Select
                value={componentForm.materialCode}
                onValueChange={(value) => setComponentForm({ ...componentForm, materialCode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material: any) => (
                    <SelectItem key={material.id} value={material.code || material.material_code}>
                      {material.code || material.material_code} - {material.description || material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={componentForm.quantity}
                  onChange={(e) => setComponentForm({ ...componentForm, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={componentForm.unit}
                  onChange={(e) => setComponentForm({ ...componentForm, unit: e.target.value })}
                  placeholder="PC"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComponentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createComponentMutation.mutate(componentForm)}
              disabled={createComponentMutation.isPending}
            >
              {createComponentMutation.isPending ? "Saving..." : editingComponent ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
