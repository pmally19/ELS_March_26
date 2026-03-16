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
  XCircle
} from "lucide-react";
import * as XLSX from 'xlsx';

interface CurrencyDenomination {
  id: number;
  code: string;
  description: string;
  currency: string;
  denomination: string;
  denominationType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CurrencyDenominationForm {
  code: string;
  description: string;
  currency: string;
  denomination: string;
  denominationType: string;
  isActive: boolean;
}

export default function CurrencyDenominationNew() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CurrencyDenomination | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CurrencyDenominationForm>({
    code: "",
    description: "",
    currency: "",
    denomination: "",
    denominationType: "Note",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Currency Denominations
  const { data: currencyDenominations = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/currency-denomination'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/currency-denomination');
      if (!response.ok) throw new Error('Failed to fetch currency denominations');
      return response.json() as Promise<CurrencyDenomination[]>;
    }
  });

  // Create Currency Denomination
  const createMutation = useMutation({
    mutationFn: async (data: CurrencyDenominationForm) => {
      const response = await fetch('/api/master-data/currency-denomination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create currency denomination');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency-denomination'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Currency denomination created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create currency denomination", variant: "destructive" });
    }
  });

  // Update Currency Denomination
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CurrencyDenominationForm> }) => {
      const response = await fetch(`/api/master-data/currency-denomination/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update currency denomination');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency-denomination'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Currency denomination updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update currency denomination", variant: "destructive" });
    }
  });

  // Delete Currency Denomination
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/currency-denomination/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete currency denomination');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/currency-denomination'] });
      toast({ title: "Success", description: "Currency denomination deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete currency denomination", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      currency: "",
      denomination: "",
      denominationType: "Note",
      isActive: true
    });
    setSelectedItem(null);
  };

  const handleEdit = (item: CurrencyDenomination) => {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      description: item.description,
      currency: item.currency,
      denomination: item.denomination,
      denominationType: item.denominationType,
      isActive: item.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (item: CurrencyDenomination) => {
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
    if (currencyDenominations.length === 0) {
      toast({ title: "Warning", description: "No data to export", variant: "destructive" });
      return;
    }

    const csvData = currencyDenominations.map(item => ({
      Code: item.code,
      Description: item.description,
      Currency: item.currency,
      Denomination: item.denomination,
      'Denomination Type': item.denominationType,
      Active: item.isActive ? 'Yes' : 'No',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
      'Updated At': new Date(item.updatedAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Currency Denominations');
    XLSX.writeFile(workbook, 'currency_denominations.xlsx');
    
    toast({ title: "Success", description: "Data exported successfully" });
  };

  const filteredData = currencyDenominations.filter(item =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Currency Denominations</h1>
          <p className="text-muted-foreground">Manage currency denomination types and values</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Currency Denomination List</TabsTrigger>
          <TabsTrigger value="import">Excel Import</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">Currency Denominations</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search currency denominations..."
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
                  disabled={currencyDenominations.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Currency Denomination
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Currency Denomination</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Code*</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="e.g., USD001"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description*</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="e.g., 1 Dollar Bill"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency*</Label>
                        <Input
                          id="currency"
                          value={formData.currency}
                          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                          placeholder="e.g., USD"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="denomination">Denomination*</Label>
                        <Input
                          id="denomination"
                          value={formData.denomination}
                          onChange={(e) => setFormData(prev => ({ ...prev, denomination: e.target.value }))}
                          placeholder="e.g., 1.00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="denominationType">Denomination Type*</Label>
                        <Select 
                          value={formData.denominationType} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, denominationType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Note">Note</SelectItem>
                            <SelectItem value="Coin">Coin</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <TableHead>Currency</TableHead>
                      <TableHead>Denomination</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No currency denominations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.currency}</TableCell>
                          <TableCell>{item.denomination}</TableCell>
                          <TableCell>{item.denominationType}</TableCell>
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
                    Select an Excel file containing currency denomination data
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
                    <li>• Column C: Currency (required)</li>
                    <li>• Column D: Denomination (required)</li>
                    <li>• Column E: Denomination Type (Note/Coin)</li>
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
              <DialogTitle>Edit Currency Denomination</DialogTitle>
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
              <Label htmlFor="edit-currency">Currency*</Label>
              <Input
                id="edit-currency"
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-denomination">Denomination*</Label>
              <Input
                id="edit-denomination"
                value={formData.denomination}
                onChange={(e) => setFormData(prev => ({ ...prev, denomination: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-denominationType">Denomination Type*</Label>
              <Select 
                value={formData.denominationType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, denominationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Note">Note</SelectItem>
                  <SelectItem value="Coin">Coin</SelectItem>
                </SelectContent>
              </Select>
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
              <DialogTitle>Currency Denomination Details</DialogTitle>
            </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Code</Label>
                  <p className="text-sm">{selectedItem.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency</Label>
                  <p className="text-sm">{selectedItem.currency}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm">{selectedItem.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Denomination</Label>
                  <p className="text-sm">{selectedItem.denomination}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm">{selectedItem.denominationType}</p>
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