import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Trash2, Globe, Ship, Truck, Plus, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Incoterms = {
  id: number;
  incotermsKey: string;
  description: string;
  category: string;
  applicableVersion: string;
  riskTransferPoint?: string;
  costResponsibility?: string;
  applicableTransport?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CustomerIncotermsDefaults = {
  id: number;
  customerId: number;
  incotermsKey: string;
  incotermsLocation: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function Incoterms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incoterms = [], isLoading, refetch } = useQuery<Incoterms[]>({
    queryKey: ["/api/sales-distribution/incoterms"],
    queryFn: async () => {
      const res = await apiRequest("/api/sales-distribution/incoterms");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerDefaults, setCustomerDefaults] = useState<CustomerIncotermsDefaults[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAllCustomerDefaults, setShowAllCustomerDefaults] = useState(true);
  const [createFormData, setCreateFormData] = useState({
    incotermsKey: "",
    description: "",
    category: "",
    applicableVersion: "2020",
    riskTransferPoint: "",
    costResponsibility: "",
    applicableTransport: "MULTIMODAL",
    isActive: true
  });
  const [customerDefaultsForm, setCustomerDefaultsForm] = useState({
    incotermsKey: "",
    incotermsLocation: ""
  });

  const { data: categoryIncoterms = [] } = useQuery<Incoterms[]>({
    queryKey: ["/api/sales-distribution/incoterms/category", selectedCategory],
    queryFn: async () => {
      if (selectedCategory === "All") {
        return incoterms;
      }
      const res = await apiRequest(`/api/sales-distribution/incoterms/category/${selectedCategory}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedCategory !== "All"
  });

  const { data: customerDefaultsData = [] } = useQuery<CustomerIncotermsDefaults[]>({
    queryKey: ["/api/sales-distribution/incoterms/customer", customerId, "defaults"],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await apiRequest(`/api/sales-distribution/incoterms/customer/${customerId}/defaults`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!customerId
  });

  // Query to get all customer defaults
  const { data: allCustomerDefaultsData = [] } = useQuery<CustomerIncotermsDefaults[]>({
    queryKey: ["/api/sales-distribution/incoterms/all-customer-defaults"],
    queryFn: async () => {
      const res = await apiRequest(`/api/sales-distribution/incoterms/all-customer-defaults`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const setCustomerDefaultsMutation = useMutation({
    mutationFn: async (payload: { incotermsKey: string; incotermsLocation: string }) => {
      const res = await apiRequest(`/api/sales-distribution/incoterms/customer/${customerId}/defaults`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Customer incoterms defaults updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/incoterms/customer", customerId, "defaults"] });
      resetCustomerDefaultsForm();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    }
  });

  const createIncotermsMutation = useMutation({
    mutationFn: async (data: typeof createFormData) => {
      const res = await apiRequest("/api/sales-distribution/incoterms", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Incoterms rule created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/incoterms"] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to create incoterms rule", variant: "destructive" });
    }
  });

  const handleSetCustomerDefaults = () => {
    if (!customerId) {
      toast({ title: "Error", description: "Please enter a customer ID", variant: "destructive" });
      return;
    }
    if (!customerDefaultsForm.incotermsKey) {
      toast({ title: "Error", description: "Please select an incoterms rule", variant: "destructive" });
      return;
    }
    if (!customerDefaultsForm.incotermsLocation) {
      toast({ title: "Error", description: "Please enter a location", variant: "destructive" });
      return;
    }
    setCustomerDefaultsMutation.mutate({ 
      incotermsKey: customerDefaultsForm.incotermsKey, 
      incotermsLocation: customerDefaultsForm.incotermsLocation 
    });
  };

  const resetCustomerDefaultsForm = () => {
    setCustomerDefaultsForm({
      incotermsKey: "",
      incotermsLocation: ""
    });
    setCustomerId("");
  };

  const resetCreateForm = () => {
    setCreateFormData({
      incotermsKey: "",
      description: "",
      category: "",
      applicableVersion: "2020",
      riskTransferPoint: "",
      costResponsibility: "",
      applicableTransport: "MULTIMODAL",
      isActive: true
    });
  };

  const handleCreateIncoterms = () => {
    if (!createFormData.incotermsKey || !createFormData.description || !createFormData.category) {
      toast({ title: "Validation Error", description: "Incoterms key, description, and category are required", variant: "destructive" });
      return;
    }
    createIncotermsMutation.mutate(createFormData);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "All Modes":
        return <Truck className="h-4 w-4 text-blue-600" />;
      case "Sea/Inland Waterway":
        return <Ship className="h-4 w-4 text-green-600" />;
      default:
        return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };

  const categories = ["All", "All Modes", "Sea/Inland Waterway"];
  const displayIncoterms = selectedCategory === "All" ? incoterms : categoryIncoterms;

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
          Master Data → Incoterms
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">International Commercial Terms (Incoterms)</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
        </div>
      </div>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)}
                <span className="ml-2">{category}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Incoterms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create New Incoterms Rule</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Incoterms
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Incoterms Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incotermsKey">Incoterms Key *</Label>
                      <Input
                        id="incotermsKey"
                        value={createFormData.incotermsKey}
                        onChange={(e) => setCreateFormData({ ...createFormData, incotermsKey: e.target.value })}
                        placeholder="e.g., FOB, CIF, EXW"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        value={createFormData.description}
                        onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                        placeholder="e.g., Free On Board"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={createFormData.category} onValueChange={(value) => setCreateFormData({ ...createFormData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Modes">All Modes</SelectItem>
                          <SelectItem value="Sea/Inland Waterway">Sea/Inland Waterway</SelectItem>
                          <SelectItem value="Air Transport">Air Transport</SelectItem>
                          <SelectItem value="Land Transport">Land Transport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicableVersion">Applicable Version</Label>
                      <Input
                        id="applicableVersion"
                        value={createFormData.applicableVersion}
                        onChange={(e) => setCreateFormData({ ...createFormData, applicableVersion: e.target.value })}
                        placeholder="e.g., 2020"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="riskTransferPoint">Risk Transfer Point</Label>
                    <Input
                      id="riskTransferPoint"
                      value={createFormData.riskTransferPoint}
                      onChange={(e) => setCreateFormData({ ...createFormData, riskTransferPoint: e.target.value })}
                      placeholder="e.g., At seller's premises"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costResponsibility">Cost Responsibility</Label>
                    <Textarea
                      id="costResponsibility"
                      value={createFormData.costResponsibility}
                      onChange={(e) => setCreateFormData({ ...createFormData, costResponsibility: e.target.value })}
                      placeholder="e.g., Seller pays all costs to destination"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicableTransport">Applicable Transport</Label>
                      <Select value={createFormData.applicableTransport} onValueChange={(value) => setCreateFormData({ ...createFormData, applicableTransport: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEA">Sea</SelectItem>
                          <SelectItem value="LAND">Land</SelectItem>
                          <SelectItem value="AIR">Air</SelectItem>
                          <SelectItem value="MULTIMODAL">Multimodal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Active Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={createFormData.isActive}
                          onCheckedChange={(checked) => setCreateFormData({ ...createFormData, isActive: checked })}
                        />
                        <Label htmlFor="isActive">{createFormData.isActive ? "Active" : "Inactive"}</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateIncoterms}
                      disabled={createIncotermsMutation.isPending}
                    >
                      {createIncotermsMutation.isPending ? "Creating..." : "Create Incoterms"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Customer Defaults Management */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Incoterms Defaults</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set default incoterms rules for specific customers. These will be automatically suggested when creating sales orders.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer ID</Label>
              <Input 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)} 
                placeholder="Enter customer ID" 
              />
            </div>
            <div className="space-y-2">
              <Label>Incoterms Rule *</Label>
              <Select 
                value={customerDefaultsForm.incotermsKey} 
                onValueChange={(value) => setCustomerDefaultsForm({ ...customerDefaultsForm, incotermsKey: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incoterms rule" />
                </SelectTrigger>
                <SelectContent>
                  {incoterms.map((incoterm) => (
                    <SelectItem key={incoterm.id} value={incoterm.incotermsKey}>
                      {incoterm.incotermsKey} - {incoterm.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input 
                value={customerDefaultsForm.incotermsLocation}
                onChange={(e) => setCustomerDefaultsForm({ ...customerDefaultsForm, incotermsLocation: e.target.value })}
                placeholder="Enter port or location" 
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <Button 
              onClick={handleSetCustomerDefaults}
              disabled={!customerId || !customerDefaultsForm.incotermsKey || !customerDefaultsForm.incotermsLocation || setCustomerDefaultsMutation.isPending}
            >
              {setCustomerDefaultsMutation.isPending ? "Saving..." : "Set Customer Defaults"}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetCustomerDefaultsForm}
              disabled={setCustomerDefaultsMutation.isPending}
            >
              Reset Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display All Customer Defaults */}
      {allCustomerDefaultsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Customer Incoterms Defaults</CardTitle>
            <p className="text-sm text-muted-foreground">
              Customer-specific incoterms defaults that will be automatically suggested in sales orders.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Code</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Incoterms Rule</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomerDefaultsData.map((defaults) => (
                    <TableRow key={defaults.id}>
                      <TableCell className="font-medium">{defaults.customerCode || 'N/A'}</TableCell>
                      <TableCell>{defaults.customerName || 'Unknown Customer'}</TableCell>
                      <TableCell>{defaults.customerCountry || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{defaults.incotermsKey}</Badge>
                      </TableCell>
                      <TableCell>{defaults.incotermsLocation}</TableCell>
                      <TableCell>
                        <Badge variant={defaults.isActive ? "default" : "secondary"}>
                          {defaults.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {new Date(defaults.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Display Customer Defaults for specific customer */}
      {customerDefaultsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Customer Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customerDefaultsData.map((defaults) => (
                <div key={defaults.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{defaults.incotermsKey}</Badge>
                    <span className="text-sm text-muted-foreground">{defaults.incotermsLocation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={defaults.isActive ? "default" : "secondary"}>
                      {defaults.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(defaults.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoterms List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Incoterms Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Risk Transfer</TableHead>
                  <TableHead>Cost Responsibility</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayIncoterms.map((incoterm) => (
                  <TableRow key={incoterm.id}>
                    <TableCell className="font-medium">{incoterm.incotermsKey}</TableCell>
                    <TableCell>{incoterm.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(incoterm.category)}
                        <span>{incoterm.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>{incoterm.applicableVersion}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {incoterm.riskTransferPoint || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {incoterm.costResponsibility || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {incoterm.applicableTransport || 'MULTIMODAL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={incoterm.isActive}
                        onCheckedChange={async (val) => {
                          try {
                            // This would need an update endpoint
                            toast({ title: 'Info', description: 'Update functionality not implemented yet' });
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to update', variant: 'destructive' });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{new Date(incoterm.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {displayIncoterms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No incoterms found for the selected category
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Defaults Display */}
      {customerDefaultsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Customer {customerId} Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incoterms Rule</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerDefaultsData.map((defaults) => (
                    <TableRow key={defaults.id}>
                      <TableCell className="font-medium">{defaults.incotermsKey}</TableCell>
                      <TableCell>{defaults.incotermsLocation}</TableCell>
                      <TableCell>
                        <Switch checked={defaults.isActive} />
                      </TableCell>
                      <TableCell>{new Date(defaults.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
