import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Factory, Settings, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MRPArea {
  id: number;
  mrp_area: string;
  description: string;
  plant_id: number;
  mrp_controller: string;
  created_at: string;
}

interface MRPAreaFormData {
  mrpArea: string;
  description: string;
  plantId: number;
  mrpController: string;
}

export default function MRPAreasConfiguration() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<MRPArea | null>(null);
  const [formData, setFormData] = useState<MRPAreaFormData>({
    mrpArea: "",
    description: "",
    plantId: 1,
    mrpController: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch MRP areas
  const { data: mrpAreas, isLoading } = useQuery({
    queryKey: ["/api/production-planning/mrp-areas"],
    queryFn: async () => {
      const response = await fetch("/api/production-planning/mrp-areas");
      if (!response.ok) throw new Error("Failed to fetch MRP areas");
      const result = await response.json();
      return result.data as MRPArea[];
    },
  });

  // Create MRP area mutation
  const createMutation = useMutation({
    mutationFn: async (data: MRPAreaFormData) => {
      const response = await fetch("/api/production-planning/mrp-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create MRP area");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/mrp-areas"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "MRP area created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create MRP area",
        variant: "destructive",
      });
    },
  });

  // Update MRP area mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MRPAreaFormData> }) => {
      const response = await fetch(`/api/production-planning/mrp-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update MRP area");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/mrp-areas"] });
      setIsEditDialogOpen(false);
      setEditingArea(null);
      resetForm();
      toast({
        title: "Success",
        description: "MRP area updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update MRP area",
        variant: "destructive",
      });
    },
  });

  // Delete MRP area mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/production-planning/mrp-areas/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete MRP area");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/mrp-areas"] });
      toast({
        title: "Success",
        description: "MRP area deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete MRP area",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      mrpArea: "",
      description: "",
      plantId: 1,
      mrpController: "",
    });
  };

  const handleEdit = (area: MRPArea) => {
    setEditingArea(area);
    setFormData({
      mrpArea: area.mrp_area,
      description: area.description,
      plantId: area.plant_id,
      mrpController: area.mrp_controller,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this MRP area?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">MRP Areas Configuration</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add MRP Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New MRP Area</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mrpArea">MRP Area Code</Label>
                <Input
                  id="mrpArea"
                  value={formData.mrpArea}
                  onChange={(e) => setFormData({ ...formData, mrpArea: e.target.value })}
                  placeholder="e.g., 004"
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Quality Control Area"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="plantId">Plant ID</Label>
                <Input
                  id="plantId"
                  type="number"
                  value={formData.plantId}
                  onChange={(e) => setFormData({ ...formData, plantId: parseInt(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mrpController">MRP Controller</Label>
                <Input
                  id="mrpController"
                  value={formData.mrpController}
                  onChange={(e) => setFormData({ ...formData, mrpController: e.target.value })}
                  placeholder="e.g., MP04"
                  maxLength={10}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRP Areas</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mrpAreas?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Configured production areas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Controllers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mrpAreas?.map(area => area.mrp_controller)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique MRP controllers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plant Coverage</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mrpAreas?.map(area => area.plant_id)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Plants with MRP areas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MRP Areas Table */}
      <Card>
        <CardHeader>
          <CardTitle>MRP Areas List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading MRP areas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRP Area</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Plant ID</TableHead>
                  <TableHead>MRP Controller</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mrpAreas?.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <Badge variant="outline">{area.mrp_area}</Badge>
                    </TableCell>
                    <TableCell>{area.description}</TableCell>
                    <TableCell>{area.plant_id}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{area.mrp_controller}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(area.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(area)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(area.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit MRP Area</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="editMrpArea">MRP Area Code</Label>
              <Input
                id="editMrpArea"
                value={formData.mrpArea}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                MRP Area code cannot be changed
              </p>
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Quality Control Area"
                maxLength={100}
                required
              />
            </div>
            <div>
              <Label htmlFor="editPlantId">Plant ID</Label>
              <Input
                id="editPlantId"
                type="number"
                value={formData.plantId}
                onChange={(e) => setFormData({ ...formData, plantId: parseInt(e.target.value) })}
                min={1}
                required
              />
            </div>
            <div>
              <Label htmlFor="editMrpController">MRP Controller</Label>
              <Input
                id="editMrpController"
                value={formData.mrpController}
                onChange={(e) => setFormData({ ...formData, mrpController: e.target.value })}
                placeholder="e.g., MP04"
                maxLength={10}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}