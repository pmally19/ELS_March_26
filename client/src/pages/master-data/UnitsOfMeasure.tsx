import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit2, Trash2, ArrowLeft, RefreshCw, Ruler, Upload, Download, MoreHorizontal, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
// import UOMExcelImport from "@/components/master-data/UOMExcelImport"; // REMOVED: File does not exist

interface UOM {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: string;
  isBase: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UnitsOfMeasure() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUOM, setEditingUOM] = useState<UOM | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "Other",
    isBase: false,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uoms = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/master-data/units-of-measure"],
  });

  // Filter UOMs based on search term
  const filteredUOMs = uoms.filter((uom: UOM) =>
    uom.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uom.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (uom.description && uom.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createMutation = useMutation({
    mutationFn: async (data: Omit<UOM, "id" | "created_at" | "updated_at">) => {
      const response = await apiRequest("/api/master-data/units-of-measure", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/units-of-measure"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "UOM created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<UOM>) => {
      const response = await apiRequest(`/api/master-data/units-of-measure/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/units-of-measure"] });
      setEditingUOM(null);
      resetForm();
      toast({ title: "Success", description: "UOM updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/units-of-measure/${id}`, {
        method: "DELETE"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/units-of-measure"] });
      toast({ title: "Success", description: "UOM deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category: "Other",
      isBase: false,
      isActive: true
    });
    setEditingUOM(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUOM) {
      updateMutation.mutate({ id: editingUOM.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (uom: UOM) => {
    setEditingUOM(uom);
    setFormData({
      code: uom.code,
      name: uom.name,
      description: uom.description || "",
      category: uom.category,
      isBase: uom.isBase,
      isActive: uom.isActive
    });
    setIsDialogOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data refreshed",
        description: "Units of Measure data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh UOM data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['UOM Code', 'Name', 'Description', 'Category', 'Base Unit', 'Active', 'Created At'];
    const csvData = filteredUOMs.map((uom: UOM) => [
      uom.code,
      uom.name,
      uom.description || '',
      uom.category,
      uom.isBase ? 'Yes' : 'No',
      uom.isActive ? 'Yes' : 'No',
      new Date(uom.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `uoms-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export completed",
      description: `Exported ${filteredUOMs.length} UOMs to CSV file.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/master-data">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Master Data
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Units of Measure</h1>
              <p className="text-muted-foreground">
                Manage measurement units with conversion factors
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search UOMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredUOMs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="uoms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uoms">UOM Data</TabsTrigger>
          <TabsTrigger value="import">Import UOMs</TabsTrigger>
        </TabsList>

        <TabsContent value="uoms" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredUOMs.length} of {uoms.length} UOMs
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add UOM
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingUOM ? "Edit UOM" : "Add New UOM"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">UOM Code</label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isBase"
                        checked={formData.isBase}
                        onChange={(e) => setFormData({ ...formData, isBase: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="isBase" className="text-sm font-medium">Base Unit</label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingUOM ? "Update" : "Create"} UOM
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredUOMs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Ruler className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {searchTerm ? 'No UOMs match your search' : 'No UOMs found'}
                  </h3>
                  <p className="text-gray-500 text-center mb-4">
                    {searchTerm
                      ? 'Try adjusting your search criteria or clear the search to see all UOMs.'
                      : 'Get started by creating your first Unit of Measure.'
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First UOM
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredUOMs.map((uom: UOM) => (
                  <Card key={uom.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold">{uom.code}</h3>
                            <span className="text-lg text-gray-600">{uom.name}</span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {uom.category}
                            </span>
                            {uom.isBase && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Base Unit
                              </span>
                            )}
                          </div>
                          {uom.description && (
                            <div className="text-sm text-gray-600">{uom.description}</div>
                          )}
                          <div className="text-sm text-gray-600">
                            Status: {uom.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(uom)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit UOM
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate(uom.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete UOM
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Units of Measure</CardTitle>
              <CardDescription>Excel import functionality coming soon</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500">Excel import feature is under development</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}