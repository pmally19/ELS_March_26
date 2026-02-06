import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Package, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreateWarehouseDialog from "./CreateWarehouseDialog";
import { apiGet } from "@/lib/apiClient";

interface Warehouse {
  id: number;
  code: string;
  name: string;
  description: string;
  plant_id: number;
  plant_name: string;
  plant_code: string;
  company_code_name: string;
  company_code: string;
  storage_type: string;
  location_type?: 'warehouse' | 'storage_location'; // New field to distinguish warehouses from storage locations
  is_mrp_relevant: boolean;
  is_negative_stock_allowed: boolean;
  is_goods_receipt_relevant: boolean;
  is_goods_issue_relevant: boolean;
  is_interim_storage: boolean;
  is_transit_storage: boolean;
  is_restricted_use: boolean;
  status: string;
  is_active: boolean;
  total_materials: number;
  total_quantity: number;
  total_available: number;
  total_reserved: number;
  total_value: number;
}

export default function WarehousesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationTypeFilter, setLocationTypeFilter] = useState("all"); // Filter for warehouse vs storage location
  
  const { data: warehouses, isLoading, isError, refetch } = useQuery<Warehouse[]>({
    queryKey: ['/api/inventory/warehouses'],
    queryFn: async () => {
      const data = await apiGet('/api/inventory/warehouses');
      return Array.isArray(data) ? data : [];
    },
  });

  const filteredWarehouses = warehouses?.filter(warehouse => {
    const matchesSearch = warehouse.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      warehouse.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.plant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.plant_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && warehouse.is_active) ||
      (statusFilter === "inactive" && !warehouse.is_active);
    
    const matchesType = typeFilter === "all" || warehouse.storage_type === typeFilter;
    
    const matchesLocationType = locationTypeFilter === "all" || 
      (locationTypeFilter === "warehouse" && warehouse.location_type === 'warehouse') ||
      (locationTypeFilter === "storage_location" && warehouse.location_type === 'storage_location');
    
    return matchesSearch && matchesStatus && matchesType && matchesLocationType;
  });

  const formatStorageType = (type: string) => {
    const typeMap: Record<string, string> = {
      'raw_material': 'Raw Material',
      'finished_goods': 'Finished Goods',
      'work_in_process': 'Work in Process',
      'semi_finished': 'Semi-Finished',
      'packaging': 'Packaging',
      'spare_parts': 'Spare Parts',
      'scrap': 'Scrap',
      'other': 'Other'
    };
    return typeMap[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Warehouses & Storage Locations</h2>
          <p className="text-sm text-muted-foreground">
            Manage warehouses and storage locations, warehouse types, and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Warehouses List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Warehouses & Storage Locations Overview</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search warehouses..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={locationTypeFilter} onValueChange={setLocationTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Location Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="warehouse">Warehouses Only</SelectItem>
                  <SelectItem value="storage_location">Storage Locations Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="finished_goods">Finished Goods</SelectItem>
                  <SelectItem value="work_in_process">Work in Process</SelectItem>
                  <SelectItem value="semi_finished">Semi-Finished</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('Export warehouses clicked');
                  // Add export functionality
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading warehouses...</div>
          ) : isError ? (
            <div className="text-center py-4 text-red-500">Error loading warehouse data. Please try again.</div>
          ) : filteredWarehouses && filteredWarehouses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Materials</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell>
                        <Badge 
                          variant={warehouse.location_type === 'warehouse' ? 'default' : 'secondary'}
                          className={warehouse.location_type === 'warehouse' ? 'bg-blue-500' : ''}
                        >
                          {warehouse.location_type === 'warehouse' ? 'Warehouse' : 'Storage Location'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{warehouse.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warehouse.name}</div>
                          {warehouse.description && (
                            <div className="text-xs text-muted-foreground">{warehouse.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatStorageType(warehouse.storage_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warehouse.plant_name}</div>
                          <div className="text-xs text-muted-foreground">{warehouse.plant_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{warehouse.company_code_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {warehouse.total_materials || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(warehouse.total_quantity || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={Number(warehouse.total_available || 0) > 0 ? 'text-green-600' : 'text-gray-500'}>
                          {Number(warehouse.total_available || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(warehouse.total_reserved || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(warehouse.total_value || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {warehouse.is_mrp_relevant && (
                            <Badge variant="outline" className="text-xs">MRP</Badge>
                          )}
                          {warehouse.is_goods_receipt_relevant && (
                            <Badge variant="outline" className="text-xs">GR</Badge>
                          )}
                          {warehouse.is_goods_issue_relevant && (
                            <Badge variant="outline" className="text-xs">GI</Badge>
                          )}
                          {warehouse.is_interim_storage && (
                            <Badge variant="outline" className="text-xs">Interim</Badge>
                          )}
                          {warehouse.is_transit_storage && (
                            <Badge variant="outline" className="text-xs">Transit</Badge>
                          )}
                          {warehouse.is_restricted_use && (
                            <Badge variant="outline" className="text-xs">Restricted</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {warehouse.is_active && warehouse.status === 'active' ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : warehouse.status === 'maintenance' ? (
                          <Badge variant="secondary" className="bg-yellow-500">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Maintenance
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4">
              {searchTerm ? 'No warehouses match your search.' : 'No warehouse data available.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <CreateWarehouseDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
      />
    </div>
  );
}