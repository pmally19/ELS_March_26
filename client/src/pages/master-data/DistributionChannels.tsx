import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Upload, Download, Edit2, Trash2, ArrowLeft, MoreHorizontal, Eye, Building, Globe } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

interface DistributionChannel {
  id: number;
  code: string;
  name?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DistributionChannelFormData {
  code: string;
  description: string;
  isActive: boolean;
}

export default function DistributionChannels() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDistributionChannel, setEditingDistributionChannel] = useState<DistributionChannel | null>(null);
  const [viewingChannel, setViewingChannel] = useState<DistributionChannel | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [formData, setFormData] = useState<DistributionChannelFormData>({
    code: "",
    description: "",
    channelType: "",
    salesOrganization: "",
    isActive: true
  });

  const queryClient = useQueryClient();
  const permissions = useAgentPermissions();



  // Fetch distribution channels with real-time updates
  const { data: distributionChannels = [], isLoading, refetch } = useQuery<DistributionChannel[]>({
    queryKey: ["/api/master-data/distribution-channels"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/master-data/distribution-channels");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching distribution channels:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Create distribution channel mutation
  const createMutation = useMutation({
    mutationFn: async (data: DistributionChannelFormData) => {
      // Map UI fields to API fields (description becomes name in database)
      const payload = {
        code: data.code,
        name: data.description, // Use description as name (primary field)
        description: data.description, // Also send as description
        isActive: data.isActive
      };
      const response = await apiRequest("/api/master-data/distribution-channels", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/distribution-channels"] });
      setIsCreateDialogOpen(false);
      setEditingDistributionChannel(null);
      resetForm();
      toast({ title: "Success", description: "Distribution channel created successfully." });
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      // Use error message (which now includes details if available) or fallback
      const errorMessage = error?.errorData?.details || error?.message || "Failed to create distribution channel.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Update distribution channel mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DistributionChannelFormData> }) => {
      // Map UI fields to API fields (description becomes name in database)
      const payload = {
        code: data.code,
        name: data.description, // Use description as name (primary field)
        description: data.description, // Also send as description
        isActive: data.isActive
      };
      const response = await apiRequest(`/api/master-data/distribution-channels/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update distribution channel");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master-data/distribution-channels"] });
      setIsCreateDialogOpen(false);
      setEditingDistributionChannel(null);
      resetForm();
      toast({ title: "Success", description: "Distribution channel updated successfully." });
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update distribution channel.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Delete distribution channel mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/distribution-channels/${id}`, {
        method: "DELETE"
      });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/distribution-channels"] });
      toast({ title: "Success", description: "Distribution channel deleted successfully." });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete distribution channel.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest("/api/master-data/distribution-channels/import", {
        method: "POST",
        body: formData
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/distribution-channels"] });
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} distribution channels. ${data.errors?.length || 0} errors.`
      });
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Failed to import Excel file.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) {
      toast({ title: "Validation Error", description: "Code and description are required.", variant: "destructive" });
      return;
    }

    if (editingDistributionChannel) {
      updateMutation.mutate({ id: editingDistributionChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (distributionChannel: DistributionChannel) => {
    setEditingDistributionChannel(distributionChannel);
    setFormData({
      code: distributionChannel.code,
      description: distributionChannel.description,
      isActive: distributionChannel.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Code", "Description", "Active", "Created At"].join(","),
      ...filteredDistributionChannels.map(dc => [
        dc.code,
        dc.description,
        dc.isActive ? "Yes" : "No",
        new Date(dc.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "distribution_channels.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (channel: DistributionChannel) => {
    setViewingChannel(channel);
    setIsViewDetailsOpen(true);
  };


  const filteredDistributionChannels = distributionChannels.filter(dc =>
    dc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Distribution Channels</h1>
            <p className="text-sm text-muted-foreground">
              Manage sales distribution channels and customer reach
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingDistributionChannel(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingDistributionChannel(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Distribution Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDistributionChannel ? "Edit Distribution Channel" : "Create New Distribution Channel"}</DialogTitle>
                <DialogDescription>
                  {editingDistributionChannel ? "Update distribution channel information." : "Add a new distribution channel to the system."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="10, 20, 30"
                      disabled={!!editingDistributionChannel}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Direct Sales, Retail, Online"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                      setEditingDistributionChannel(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Processing..." : editingDistributionChannel ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar with Refresh Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search distribution channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          title="Refresh distribution channels data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Distribution Channels Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-md">
            <div className="relative max-h-[600px] overflow-auto">
              {isLoading ? (
                <div className="text-center py-8">Loading distribution channels...</div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Description</TableHead>

                      <TableHead className="w-[100px] text-center">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDistributionChannels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {distributionChannels.length === 0
                            ? "No distribution channels found. Create your first distribution channel to get started."
                            : `No distribution channels match "${searchTerm}"`
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDistributionChannels.map((distributionChannel) => (
                        <TableRow
                          key={distributionChannel.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleViewDetails(distributionChannel)}
                        >
                          <TableCell className="font-medium">{distributionChannel.code}</TableCell>
                          <TableCell>{distributionChannel.description || distributionChannel.name || "-"}</TableCell>

                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${distributionChannel.isActive !== false
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {distributionChannel.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(distributionChannel)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(distributionChannel)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete distribution channel "${distributionChannel.code}"?`)) {
                                      deleteMutation.mutate(distributionChannel.id);
                                    }
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingChannel && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewDetailsOpen(false)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>Distribution Channel Details</DialogTitle>
                    <DialogDescription>
                      Comprehensive information about {viewingChannel.description || viewingChannel.code}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingChannel.description || viewingChannel.name || viewingChannel.code}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingChannel.code}
                      </Badge>
                      <Badge
                        variant={viewingChannel.isActive !== false ? "default" : "secondary"}
                        className={viewingChannel.isActive !== false ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingChannel.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsViewDetailsOpen(false);
                        handleEdit(viewingChannel);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsViewDetailsOpen(false);
                        if (window.confirm(`Are you sure you want to delete distribution channel "${viewingChannel.code}"?`)) {
                          deleteMutation.mutate(viewingChannel.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingChannel.code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Description:</dt>
                          <dd className="text-sm text-gray-900">{viewingChannel.description || viewingChannel.name || "—"}</dd>
                        </div>

                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 capitalize">
                            {viewingChannel.isActive !== false ? "Active" : "Inactive"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        System Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Created:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingChannel.createdAt ? new Date(viewingChannel.createdAt).toLocaleDateString() : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Updated:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingChannel.updatedAt ? new Date(viewingChannel.updatedAt).toLocaleDateString() : "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}