import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Upload, 
  MoreHorizontal, 
  Edit,
  Trash2,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Star
} from "lucide-react";
import * as XLSX from 'xlsx';

interface ExchangeRateType {
  id: number;
  code: string;
  description: string;
  rateType: string;
  baseMultiplier: string;
  isDefaultType: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExchangeRateTypeForm {
  code: string;
  description: string;
  rateType: string;
  baseMultiplier: string;
  isDefaultType: boolean;
  isActive: boolean;
}

export default function ExchangeRateTypeNew() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExchangeRateType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ExchangeRateTypeForm>({
    code: "",
    description: "",
    rateType: "Current",
    baseMultiplier: "1.000000",
    isDefaultType: false,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Exchange Rate Types
  const { data: exchangeRateTypes = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/exchange-rate-type'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/exchange-rate-type');
      if (!response.ok) throw new Error('Failed to fetch exchange rate types');
      return response.json() as Promise<ExchangeRateType[]>;
    }
  });

  // Create Exchange Rate Type
  const createMutation = useMutation({
    mutationFn: async (data: ExchangeRateTypeForm) => {
      const response = await fetch('/api/master-data/exchange-rate-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create exchange rate type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/exchange-rate-type'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Exchange rate type created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create exchange rate type", variant: "destructive" });
    }
  });

  // Update Exchange Rate Type
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExchangeRateTypeForm> }) => {
      const response = await fetch(`/api/master-data/exchange-rate-type/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update exchange rate type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/exchange-rate-type'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Exchange rate type updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update exchange rate type", variant: "destructive" });
    }
  });

  // Delete Exchange Rate Type
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/exchange-rate-type/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete exchange rate type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/exchange-rate-type'] });
      toast({ title: "Success", description: "Exchange rate type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete exchange rate type", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      rateType: "Current",
      baseMultiplier: "1.000000",
      isDefaultType: false,
      isActive: true
    });
    setSelectedItem(null);
  };

  const handleEdit = (item: ExchangeRateType) => {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      description: item.description,
      rateType: item.rateType,
      baseMultiplier: item.baseMultiplier,
      isDefaultType: item.isDefaultType,
      isActive: item.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (item: ExchangeRateType) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportToCSV = () => {
    if (exchangeRateTypes.length === 0) {
      toast({ title: "Warning", description: "No data to export", variant: "destructive" });
      return;
    }

    const csvData = exchangeRateTypes.map(item => ({
      Code: item.code,
      Description: item.description,
      'Rate Type': item.rateType,
      'Base Multiplier': item.baseMultiplier,
      'Default Type': item.isDefaultType ? 'Yes' : 'No',
      Active: item.isActive ? 'Yes' : 'No',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
      'Updated At': new Date(item.updatedAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exchange Rate Types');
    XLSX.writeFile(workbook, 'exchange_rate_types.xlsx');
    
    toast({ title: "Success", description: "Data exported successfully" });
  };

  const filteredData = exchangeRateTypes.filter(item =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.rateType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exchange Rate Types</h1>
          <p className="text-muted-foreground">Manage different exchange rate calculation methods</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Exchange Rate Type List</TabsTrigger>
          <TabsTrigger value="import">Excel Import</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">Exchange Rate Types</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exchange rate types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToCSV}
                  disabled={exchangeRateTypes.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exchange Rate Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Exchange Rate Type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Code*</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="e.g., SPOT"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description*</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="e.g., Spot Exchange Rate"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rateType">Rate Type*</Label>
                        <Select 
                          value={formData.rateType} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, rateType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Current">Current</SelectItem>
                            <SelectItem value="Historical">Historical</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseMultiplier">Base Multiplier*</Label>
                        <Input
                          id="baseMultiplier"
                          value={formData.baseMultiplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, baseMultiplier: e.target.value }))}
                          placeholder="e.g., 1.000000"
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefaultType"
                          checked={formData.isDefaultType}
                          onChange={(e) => setFormData(prev => ({ ...prev, isDefaultType: e.target.checked }))}
                        />
                        <Label htmlFor="isDefaultType">Default Type</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rate Type</TableHead>
                      <TableHead>Base Multiplier</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No exchange rate types found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.rateType}</TableCell>
                          <TableCell>{item.baseMultiplier}</TableCell>
                          <TableCell>
                            {item.isDefaultType && (
                              <Badge variant="secondary">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(item)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(item.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Excel Import</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2">Upload Excel File</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Select an Excel file containing exchange rate type data
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById('excel-upload')?.click()}
                    className="mb-2"
                  >
                    Choose File
                  </Button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Excel Format Requirements
                  </h4>
                  <ul className="text-sm space-y-1 text-blue-700">
                    <li>• Column A: Code (required)</li>
                    <li>• Column B: Description (required)</li>
                    <li>• Column C: Rate Type (Current/Historical/Average/Fixed)</li>
                    <li>• Column D: Base Multiplier (default: 1.000000)</li>
                    <li>• Column E: Default Type (Yes/No, default: No)</li>
                    <li>• Column F: Active (Yes/No, default: Yes)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Exchange Rate Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code*</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description*</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rateType">Rate Type*</Label>
              <Select 
                value={formData.rateType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, rateType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Historical">Historical</SelectItem>
                  <SelectItem value="Average">Average</SelectItem>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-baseMultiplier">Base Multiplier*</Label>
              <Input
                id="edit-baseMultiplier"
                value={formData.baseMultiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, baseMultiplier: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isDefaultType"
                checked={formData.isDefaultType}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefaultType: e.target.checked }))}
              />
              <Label htmlFor="edit-isDefaultType">Default Type</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exchange Rate Type Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Code</Label>
                  <p className="text-sm">{selectedItem.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Rate Type</Label>
                  <p className="text-sm">{selectedItem.rateType}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm">{selectedItem.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Base Multiplier</Label>
                  <p className="text-sm">{selectedItem.baseMultiplier}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Default Type</Label>
                  <Badge variant={selectedItem.isDefaultType ? "default" : "secondary"}>
                    {selectedItem.isDefaultType ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedItem.isActive ? "default" : "secondary"}>
                    {selectedItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}