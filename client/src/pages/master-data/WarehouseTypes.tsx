import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, RefreshCw, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

interface WarehouseType {
  id: number;
  code: string;
  name: string;
  plantId?: number;
  plantCode?: string;
  plantName?: string;
  description?: string;
  storageType?: string;
  temperatureRange?: string;
  specialRequirements?: string;
  handlingEquipment?: string;
  isActive?: boolean;
}

interface Plant {
  id: number;
  code: string;
  name: string;
  isActive?: boolean;
}

export default function WarehouseTypes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch plants for dropdown
  const { data: plants, isLoading: plantsLoading } = useQuery<Plant[]>({
    queryKey: ['/api/master-data/plant'],
    queryFn: async () => {
      return await apiGet<Plant[]>('/api/master-data/plant');
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch data
  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/master-data/warehouse-types'],
    queryFn: async () => {
      return await apiGet<WarehouseType[]>('/api/master-data/warehouse-types');
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter items based on search term
  const filteredItems = items?.filter((item: WarehouseType) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "Warehouse types data has been refreshed.",
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (item: WarehouseType) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse type?')) return;

    try {
      await apiDelete(`/api/master-data/warehouse-types/${id}`);

      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/warehouse-types'] });
      toast({
        title: "Warehouse type deleted",
        description: "The warehouse type has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the warehouse type.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const isEditing = !!editingItem;
      
      if (isEditing) {
        await apiPut(`/api/master-data/warehouse-types/${editingItem.id}`, formData);
      } else {
        await apiPost('/api/master-data/warehouse-types', formData);
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/warehouse-types'] });
      setIsDialogOpen(false);
      toast({
        title: isEditing ? "Warehouse type updated" : "Warehouse type created",
        description: `The warehouse type has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save the warehouse type.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (field: any) => {
    const value = formData[field.key] || '';
    
    switch (field.type) {
      case 'plant-select':
        return (
          <Select 
            value={value ? String(value) : ''} 
            onValueChange={(val) => handleInputChange(field.key, parseInt(val))}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={plantsLoading ? "Loading plants..." : `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {plantsLoading && <SelectItem value="loading" disabled>Loading plants...</SelectItem>}
              {plants && plants.filter(p => p.isActive !== false).map((plant: Plant) => (
                <SelectItem key={plant.id} value={String(plant.id)}>
                  {plant.name} ({plant.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleInputChange(field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => handleInputChange(field.key, checked)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      default:
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  const fields = [
    { key: 'plantId', label: 'Plant', type: 'plant-select', required: true },
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'storageType', label: 'Storage Type', type: 'select', options: ['AMBIENT', 'REFRIGERATED', 'FROZEN', 'HAZMAT'], required: true },
    { key: 'temperatureRange', label: 'Temperature Range', type: 'text' },
    { key: 'specialRequirements', label: 'Special Requirements', type: 'text' },
    { key: 'handlingEquipment', label: 'Handling Equipment', type: 'text' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading warehouse types...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: isLoading = {String(isLoading)}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error loading warehouse types</p>
        <p className="text-sm text-gray-500 mb-4">Debug: {String(error)}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Warehouse Types
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Types</h1>
          <p className="text-gray-600">Storage facility classifications</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>


      {/* Search and Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search warehouse types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Types ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item: WarehouseType) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.plantName ? `${item.plantName} (${item.plantCode})` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.storageType || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.temperatureRange || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                          title="Edit warehouse type"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
                          title="Delete warehouse type"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No warehouse types found matching your search.' : 'No warehouse types found.'}
              <div className="mt-4">
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Warehouse Type
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Warehouse Type' : 'Create New Warehouse Type'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the warehouse type information below.' : 'Fill in the information below to create a new warehouse type.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


