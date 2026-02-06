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
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CreditLimitGroups from '@/pages/master-data/CreditLimitGroups';
import BusinessArea from '@/pages/master-data/BusinessArea';

interface UnifiedMasterDataTileProps {
  tileId: string;
}

// Tile configurations - this should match the configuration in MasterData.tsx
const tileConfigurations: Record<string, any> = {
  'warehouse-types': {
    title: 'Warehouse Types',
    apiEndpoint: '/api/master-data/warehouse-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['AMBIENT', 'REFRIGERATED', 'FROZEN', 'HAZMAT'], required: true },
      { key: 'temperatureRange', label: 'Temperature Range', type: 'text' },
      { key: 'specialRequirements', label: 'Special Requirements', type: 'text' },
      { key: 'handlingEquipment', label: 'Handling Equipment', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'movement-types': {
    title: 'Movement Types',
    apiEndpoint: '/api/master-data/movement-types',
    fields: [
      { key: 'code', label: 'Movement Code', type: 'text', required: true },
      { key: 'name', label: 'Movement Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'movementCategory', label: 'Movement Category', type: 'select', options: ['GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'ADJUSTMENT'] },
      { key: 'stockImpact', label: 'Stock Impact', type: 'select', options: ['INCREASE', 'DECREASE', 'NEUTRAL'] },
      { key: 'requiresApproval', label: 'Requires Approval', type: 'checkbox' }
    ]
  },
  'material-types': {
    title: 'Material Types',
    apiEndpoint: '/api/master-data/material-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'typeCategory', label: 'Type Category', type: 'select', options: ['RAW', 'FINISHED', 'SEMI_FINISHED', 'SERVICES'] },
      { key: 'inventoryManaged', label: 'Inventory Managed', type: 'checkbox' },
      { key: 'procurementType', label: 'Procurement Type', type: 'select', options: ['In-house production', 'External procurement', 'Both'] }
    ]
  },
  'business-areas': {
    title: 'Business Areas',
    apiEndpoint: '/api/master-data/business-areas',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'company_code_id', label: 'Company Code', type: 'select', options: [] },
      { key: 'parent_business_area_code', label: 'Parent Business Area Code', type: 'text' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]
  }
};

function GenericMasterDataTile({ tileId }: { tileId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const config = tileConfigurations[tileId];
  
  // Fetch company codes for business areas dropdown
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        if (!response.ok) return [];
        return response.json();
      } catch {
        return [];
      }
    },
    enabled: tileId === 'business-areas',
  });
  
  if (!config) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {tileId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          <p className="text-gray-600 mb-4">
            Configuration not found for this master data tile.
          </p>
          <p className="text-sm text-gray-500">
            Tile ID: {tileId}
          </p>
        </div>
      </div>
    );
  }

  // Fetch data
  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: [config.apiEndpoint],
    queryFn: async () => {
      const response = await apiRequest(config.apiEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${config.title}`);
      }
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter items based on search term
  const filteredItems = items?.filter((item: any) => {
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
      description: `${config.title} data has been refreshed.`,
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await apiRequest(`${config.apiEndpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      await queryClient.invalidateQueries({ queryKey: [config.apiEndpoint] });
      toast({
        title: "Item deleted",
        description: "The item has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the item.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const isEditing = !!editingItem;
      const url = isEditing ? `${config.apiEndpoint}/${editingItem.id}` : config.apiEndpoint;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save item');
      }

      await queryClient.invalidateQueries({ queryKey: [config.apiEndpoint] });
      setIsDialogOpen(false);
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: `The ${config.title.toLowerCase()} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save the item.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (field: any) => {
    const value = formData[field.key] || '';
    
    // Handle dynamic options for company_code_id
    let options = field.options || [];
    if (field.key === 'company_code_id' && tileId === 'business-areas' && companyCodes.length > 0) {
      options = companyCodes.map((cc: any) => ({
        value: cc.id?.toString() || cc.code,
        label: `${cc.code || ''} - ${cc.name || cc.description || ''}`.trim()
      }));
    }
    
    switch (field.type) {
      case 'select':
        // Handle dynamic options (array of objects with value/label)
        if (options.length > 0 && typeof options[0] === 'object' && 'value' in options[0]) {
          return (
            <Select value={value?.toString()} onValueChange={(val) => handleInputChange(field.key, field.key === 'company_code_id' ? parseInt(val) : val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        // Handle static string options
        return (
          <Select value={value?.toString()} onValueChange={(val) => handleInputChange(field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {config.title}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error loading {config.title}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-gray-600">Manage {config.title.toLowerCase()} data</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Search ${config.title.toLowerCase()}...`}
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {config.fields.slice(0, 4).map((field: any) => (
                    <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {config.fields.slice(0, 4).map((field: any) => (
                      <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {field.type === 'checkbox' ? (
                          <Badge variant={item[field.key] ? 'default' : 'secondary'}>
                            {item[field.key] ? 'Active' : 'Inactive'}
                          </Badge>
                        ) : field.key === 'company_code_id' && (item.company_code || item.company_name) ? (
                          `${item.company_code || ''}${item.company_code && item.company_name ? ' - ' : ''}${item.company_name || ''}`.trim() || String(item[field.key] || '-')
                        ) : (
                          String(item[field.key] || '-')
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
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
              {searchTerm ? 'No items found matching your search.' : `No ${config.title.toLowerCase()} found.`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit ${config.title.slice(0, -1)}` : `Create New ${config.title.slice(0, -1)}`}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the information below.' : 'Fill in the information below to create a new item.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.fields.map((field: any) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
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

export default function UnifiedMasterDataTile({ tileId }: UnifiedMasterDataTileProps) {
  // Route to specific components based on tileId
  switch (tileId) {
    case 'credit-limit-groups':
      return <CreditLimitGroups />;
    
    case 'business-areas':
      return <BusinessArea />;
    
    // Use generic component for configured tiles
    case 'warehouse-types':
    case 'movement-types':
    case 'material-types':
      return <GenericMasterDataTile tileId={tileId} />;
    
    // Add more cases for other master data tiles as needed
    default:
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {tileId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-gray-600 mb-4">
              This master data tile is not yet implemented.
            </p>
            <p className="text-sm text-gray-500">
              Tile ID: {tileId}
            </p>
          </div>
        </div>
      );
  }
}