import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface WorkCenter {
  id: number;
  code: string;
  name: string;
  description: string | null;
  capacity: number | null;
  capacity_uom: string | null;
  status: string;
  plant_name: string | null;
  plant_code: string | null;
  cost_center_name: string | null;
  responsible_person_name: string | null;
  responsible_person_email: string | null;
}

export default function WorkCentersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewWorkCenterForm, setShowNewWorkCenterForm] = useState(false);
  const [newWorkCenter, setNewWorkCenter] = useState({
    code: "",
    name: "",
    description: "",
    plant_id: "",
    capacity: "",
    capacity_unit: "",
    cost_center_id: "",
    status: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch work centers
  const { data: workCenters = [], isLoading: workCentersLoading, refetch: refetchWorkCenters } = useQuery<WorkCenter[]>({
    queryKey: ["/api/production/work-centers"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/work-centers");
      if (!response.ok) {
        throw new Error("Failed to fetch work centers");
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch unique statuses for filter
  const { data: statuses = [] } = useQuery<string[]>({
    queryKey: ["/api/production/work-centers/statuses"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/work-centers/statuses");
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Create work center mutation
  const createWorkCenterMutation = useMutation({
    mutationFn: async (workCenterData: {
      code: string;
      name: string;
      description?: string;
      plant_id?: number;
      capacity?: number;
      capacity_unit?: string;
      cost_center_id?: number;
      status?: string;
    }) => {
      const response = await apiRequest("/api/production/work-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workCenterData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create work center");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/work-centers"] });
      toast({
        title: "Success",
        description: "Work center created successfully",
      });
      setShowNewWorkCenterForm(false);
      setNewWorkCenter({
        code: "",
        name: "",
        description: "",
        plant_id: "",
        capacity: "",
        capacity_unit: "",
        cost_center_id: "",
        status: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work center",
        variant: "destructive",
      });
    },
  });

  const filteredWorkCenters = workCenters.filter(wc => {
    const matchesSearch =
      (wc.code?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (wc.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (wc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (wc.responsible_person_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (wc.status?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === "all" || wc.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 text-white">Active</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Maintenance</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const handleCreateWorkCenter = () => {
    if (!newWorkCenter.code || !newWorkCenter.name) {
      toast({
        title: "Validation Error",
        description: "Code and name are required fields",
        variant: "destructive",
      });
      return;
    }

    createWorkCenterMutation.mutate({
      code: newWorkCenter.code,
      name: newWorkCenter.name,
      description: newWorkCenter.description || undefined,
      plant_id: newWorkCenter.plant_id ? parseInt(newWorkCenter.plant_id) : undefined,
      capacity: newWorkCenter.capacity ? parseFloat(newWorkCenter.capacity) : undefined,
      capacity_unit: newWorkCenter.capacity_unit || undefined,
      cost_center_id: newWorkCenter.cost_center_id ? parseInt(newWorkCenter.cost_center_id) : undefined,
      status: newWorkCenter.status || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work centers..."
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
              if (filteredWorkCenters.length === 0) {
                toast({
                  title: "No Data",
                  description: "No work centers to export",
                  variant: "destructive",
                });
                return;
              }

              const csvContent = filteredWorkCenters.map(wc => ({
                Code: wc.code || "",
                Name: wc.name || "",
                Description: wc.description || "",
                Capacity: wc.capacity && wc.capacity_uom ? `${wc.capacity} ${wc.capacity_uom}` : (wc.capacity || ""),
                Plant: wc.plant_name || wc.plant_code || "",
                Responsible: wc.responsible_person_name || wc.responsible_person_email || "",
                Status: wc.status || ""
              }));

              const csvString = [
                Object.keys(csvContent[0]).join(','),
                ...csvContent.map(row => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'work-centers.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filteredWorkCenters.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showNewWorkCenterForm} onOpenChange={setShowNewWorkCenterForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Work Center
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Work Center</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={newWorkCenter.code}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, code: e.target.value })}
                    placeholder="Enter work center code"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newWorkCenter.name}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, name: e.target.value })}
                    placeholder="Enter work center name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newWorkCenter.description}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <Label htmlFor="plant_id">Plant ID</Label>
                  <Input
                    id="plant_id"
                    type="number"
                    value={newWorkCenter.plant_id}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, plant_id: e.target.value })}
                    placeholder="Enter plant ID"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newWorkCenter.capacity}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, capacity: e.target.value })}
                    placeholder="Enter capacity"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity_unit">Capacity Unit</Label>
                  <Input
                    id="capacity_unit"
                    value={newWorkCenter.capacity_unit}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, capacity_unit: e.target.value })}
                    placeholder="Enter capacity unit"
                  />
                </div>
                <div>
                  <Label htmlFor="cost_center_id">Cost Center ID</Label>
                  <Input
                    id="cost_center_id"
                    type="number"
                    value={newWorkCenter.cost_center_id}
                    onChange={(e) => setNewWorkCenter({ ...newWorkCenter, cost_center_id: e.target.value })}
                    placeholder="Enter cost center ID"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newWorkCenter.status}
                    onValueChange={(value) => setNewWorkCenter({ ...newWorkCenter, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status.toLowerCase()}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewWorkCenterForm(false);
                      setNewWorkCenter({
                        code: "",
                        name: "",
                        description: "",
                        plant_id: "",
                        capacity: "",
                        capacity_unit: "",
                        cost_center_id: "",
                        status: ""
                      });
                    }}
                    disabled={createWorkCenterMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWorkCenter}
                    disabled={createWorkCenterMutation.isPending}
                  >
                    {createWorkCenterMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Work Center"
                    )}
                  </Button>
                </div>
              </div>
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

      {/* Work Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Centers</CardTitle>
        </CardHeader>
        <CardContent>
          {workCentersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading work centers...</p>
            </div>
          ) : filteredWorkCenters.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkCenters.map((wc) => (
                    <TableRow key={wc.id}>
                      <TableCell className="font-medium">{wc.code || "N/A"}</TableCell>
                      <TableCell>{wc.name || "N/A"}</TableCell>
                      <TableCell>{wc.description || "N/A"}</TableCell>
                      <TableCell>
                        {wc.capacity && wc.capacity_uom
                          ? `${wc.capacity} ${wc.capacity_uom}`
                          : wc.capacity || "N/A"}
                      </TableCell>
                      <TableCell>{wc.plant_name || wc.plant_code || "N/A"}</TableCell>
                      <TableCell>{wc.responsible_person_name || wc.responsible_person_email || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(wc.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm || statusFilter !== "all"
                ? 'No work centers match your filters.'
                : 'No work centers found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}