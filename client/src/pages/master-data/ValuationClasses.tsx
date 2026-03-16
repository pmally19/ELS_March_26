import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Eye, Package, DollarSign, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";

interface MaterialType {
  id: number;
  code: string;
  description?: string;
}

interface ValuationClass {
  id: number;
  class_code: string;
  class_name: string | null;
  description: string | null;
  valuation_method: string | null;
  price_control: string | null;
  moving_price: boolean;
  standard_price: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  allowed_material_types: MaterialType[];
  account_category_reference_id: number | null;
  account_category_reference?: {
    id: number;
    code: string;
    name: string;
  } | null;
}

interface NewValuationClass {
  class_code: string;
  class_name?: string;
  description?: string;
  valuation_method?: string;
  price_control?: string;
  moving_price?: boolean;
  standard_price?: boolean;
  allowed_material_types: number[];
  account_category_reference_id?: number | null;
}

export default function ValuationClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuationClass | null>(null);
  const [viewingValuationClass, setViewingValuationClass] = useState<ValuationClass | null>(null);
  const [isValuationClassDetailsOpen, setIsValuationClassDetailsOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewValuationClass>({
    class_code: "",
    class_name: "",
    description: "",
    valuation_method: "",
    price_control: "",
    moving_price: false,
    standard_price: false,
    allowed_material_types: [],
    account_category_reference_id: null
  });

  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Valuation Classes | MallyERP";
  }, []);

  // Fetch valuation classes
  const { data: valuationClasses, isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/valuation-classes'],
  });

  // Fetch material types for the dropdown
  const { data: materialTypes, isLoading: materialTypesLoading } = useQuery({
    queryKey: ['/api/master-data/material-types'],
  });

  // Fetch account category references for the dropdown
  const { data: accountCategoryReferences, isLoading: accountCategoryRefsLoading } = useQuery({
    queryKey: ['/api/master-data/account-category-references'],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: NewValuationClass) =>
      apiRequest('/api/master-data/valuation-classes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/valuation-classes'] });
      setShowCreateDialog(false);
      setNewItem({
        class_code: "",
        class_name: "",
        description: "",
        valuation_method: "",
        price_control: "",
        moving_price: false,
        standard_price: false,
        allowed_material_types: [],
        account_category_reference_id: null
      });
      toast({
        title: "Success",
        description: "Valuation class created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create valuation class",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NewValuationClass> }) =>
      apiRequest(`/api/master-data/valuation-classes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/valuation-classes'] });
      setShowEditDialog(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Valuation class updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update valuation class",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/master-data/valuation-classes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/valuation-classes'] });
      toast({
        title: "Success",
        description: "Valuation class deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete valuation class",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newItem.class_code) {
      toast({
        title: "Validation Error",
        description: "Valuation Class code is required",
        variant: "destructive",
      });
      return;
    }
    if (newItem.class_code.length > 4) {
      toast({
        title: "Validation Error",
        description: "Valuation Class code must be 4 characters or less",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleEdit = (item: ValuationClass) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingItem) return;
    if (editingItem.class_code.length > 4) {
      toast({
        title: "Validation Error",
        description: "Valuation Class code must be 4 characters or less",
        variant: "destructive",
      });
      return;
    }

    const updateData: Partial<NewValuationClass & { is_active?: boolean }> = {
      class_code: editingItem.class_code,
      class_name: editingItem.class_name || "",
      description: editingItem.description || "",
      valuation_method: editingItem.valuation_method || "",
      price_control: editingItem.price_control || "",
      moving_price: editingItem.moving_price,
      standard_price: editingItem.standard_price,
      is_active: editingItem.is_active,
      account_category_reference_id: editingItem.account_category_reference_id,
      allowed_material_types: editingItem.allowed_material_types.map(mt => mt.id)
    };

    updateMutation.mutate({
      id: editingItem.id,
      data: updateData
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this valuation class?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (valuationClass: ValuationClass) => {
    setViewingValuationClass(valuationClass);
    setIsValuationClassDetailsOpen(true);
  };

  const toggleMaterialType = (materialTypeId: number, isEdit: boolean = false) => {
    if (isEdit && editingItem) {
      const currentIds = editingItem.allowed_material_types.map(mt => mt.id);
      const newIds = currentIds.includes(materialTypeId)
        ? currentIds.filter(id => id !== materialTypeId)
        : [...currentIds, materialTypeId];

      // Update the editingItem with new material types
      const updatedMaterialTypes = (materialTypes as MaterialType[])?.filter(mt => newIds.includes(mt.id)) || [];
      setEditingItem({
        ...editingItem,
        allowed_material_types: updatedMaterialTypes
      });
    } else {
      const currentIds = newItem.allowed_material_types;
      const newIds = currentIds.includes(materialTypeId)
        ? currentIds.filter(id => id !== materialTypeId)
        : [...currentIds, materialTypeId];
      setNewItem({ ...newItem, allowed_material_types: newIds });
    }
  };

  const filteredItems = (valuationClasses as ValuationClass[])?.filter(item => {
    // Debug: Log first item to see what we're receiving
    if ((valuationClasses as ValuationClass[])?.indexOf(item) === 0) {
      console.log('Frontend - Sample item received:', {
        class_code: item.class_code,
        is_active: item.is_active,
        is_active_type: typeof item.is_active,
        is_active_value: item.is_active
      });
    }

    const matchesSearch =
      item.class_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.class_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.valuation_method || "").toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/master-data">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Master Data
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Valuation Classes</h1>
          <p className="text-muted-foreground">Manage material valuation categories and pricing methods for inventory management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Valuation Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="class_code">Class Code * (max 4 characters)</Label>
                    <Input
                      id="class_code"
                      value={newItem.class_code}
                      onChange={(e) => setNewItem({ ...newItem, class_code: e.target.value })}
                      placeholder="e.g., 3000"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="class_name">Class Name</Label>
                    <Input
                      id="class_name"
                      value={newItem.class_name}
                      onChange={(e) => setNewItem({ ...newItem, class_name: e.target.value })}
                      placeholder="Enter class name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valuation_method">Valuation Method</Label>
                    <Input
                      id="valuation_method"
                      value={newItem.valuation_method}
                      onChange={(e) => setNewItem({ ...newItem, valuation_method: e.target.value })}
                      placeholder="e.g., Fixed Cost, Average Cost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_control">Price Control Type</Label>
                    <Input
                      id="price_control"
                      value={newItem.price_control}
                      onChange={(e) => setNewItem({ ...newItem, price_control: e.target.value })}
                      placeholder="e.g., Fixed, Variable"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="account_category_reference">Account Category Reference</Label>
                  <Select
                    value={newItem.account_category_reference_id?.toString() || "none"}
                    onValueChange={(value) => setNewItem({ ...newItem, account_category_reference_id: value === "none" ? null : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account category reference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {accountCategoryRefsLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        (accountCategoryReferences as any[])?.map((acr) => (
                          <SelectItem key={acr.id} value={acr.id.toString()}>
                            {acr.code} - {acr.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pricing Options</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="moving_price"
                        checked={newItem.moving_price}
                        onCheckedChange={(checked) => setNewItem({ ...newItem, moving_price: checked === true })}
                      />
                      <Label htmlFor="moving_price" className="text-sm font-normal cursor-pointer">
                        Moving Price
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="standard_price"
                        checked={newItem.standard_price}
                        onCheckedChange={(checked) => setNewItem({ ...newItem, standard_price: checked === true })}
                      />
                      <Label htmlFor="standard_price" className="text-sm font-normal cursor-pointer">
                        Standard Price
                      </Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Allowed Material Types</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                    {materialTypesLoading ? (
                      <div className="text-sm text-muted-foreground">Loading material types...</div>
                    ) : (materialTypes as MaterialType[])?.length > 0 ? (
                      <div className="space-y-2">
                        {(materialTypes as MaterialType[]).map((mt) => (
                          <div key={mt.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mt-${mt.id}`}
                              checked={newItem.allowed_material_types.includes(mt.id)}
                              onCheckedChange={() => toggleMaterialType(mt.id, false)}
                            />
                            <Label
                              htmlFor={`mt-${mt.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {mt.code} {mt.description ? `- ${mt.description}` : ""}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No material types available</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Classes ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading valuation classes...</div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Code</TableHead>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Account Category</TableHead>
                    <TableHead>Valuation Method</TableHead>
                    <TableHead>Price Control Type</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.class_code}</TableCell>
                      <TableCell>{item.class_name || "-"}</TableCell>
                      <TableCell>
                        {item.account_category_reference
                          ? `${item.account_category_reference.code} - ${item.account_category_reference.name}`
                          : "-"}
                      </TableCell>
                      <TableCell>{item.valuation_method || "-"}</TableCell>
                      <TableCell>{item.price_control || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.moving_price && <Badge variant="outline">Moving</Badge>}
                          {item.standard_price && <Badge variant="outline">Standard</Badge>}
                          {!item.moving_price && !item.standard_price && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Convert to boolean if needed
                          const isActive = Boolean(item.is_active);

                          return (
                            <Badge variant={isActive ? "default" : "secondary"}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm ? 'No valuation classes match your search.' : 'No valuation classes found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && editingItem && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Valuation Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_class_code">Class Code * (max 4 characters)</Label>
                  <Input
                    id="edit_class_code"
                    value={editingItem.class_code}
                    onChange={(e) => setEditingItem({ ...editingItem, class_code: e.target.value })}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_class_name">Class Name</Label>
                  <Input
                    id="edit_class_name"
                    value={editingItem.class_name || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, class_name: e.target.value })}
                    placeholder="Enter class name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_valuation_method">Valuation Method</Label>
                  <Input
                    id="edit_valuation_method"
                    value={editingItem.valuation_method || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, valuation_method: e.target.value })}
                    placeholder="e.g., Fixed Cost, Average Cost"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_price_control">Price Control Type</Label>
                  <Input
                    id="edit_price_control"
                    value={editingItem.price_control || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, price_control: e.target.value })}
                    placeholder="e.g., Fixed, Variable"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_account_category_reference">Account Category Reference</Label>
                <Select
                  value={editingItem.account_category_reference_id?.toString() || "none"}
                  onValueChange={(value) => setEditingItem({ ...editingItem, account_category_reference_id: value === "none" ? null : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account category reference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {accountCategoryRefsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      (accountCategoryReferences as any[])?.map((acr) => (
                        <SelectItem key={acr.id} value={acr.id.toString()}>
                          {acr.code} - {acr.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pricing Options</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_moving_price"
                      checked={editingItem.moving_price}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, moving_price: checked === true })}
                    />
                    <Label htmlFor="edit_moving_price" className="text-sm font-normal cursor-pointer">
                      Moving Price
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_standard_price"
                      checked={editingItem.standard_price}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, standard_price: checked === true })}
                    />
                    <Label htmlFor="edit_standard_price" className="text-sm font-normal cursor-pointer">
                      Standard Price
                    </Label>
                  </div>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="edit_is_active"
                    checked={Boolean(editingItem.is_active)}
                    onCheckedChange={(checked) => {
                      setEditingItem({
                        ...editingItem,
                        is_active: Boolean(checked)
                      });
                    }}
                  />
                  <Label htmlFor="edit_is_active" className="text-sm font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
              <div>
                <Label>Allowed Material Types</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  {materialTypesLoading ? (
                    <div className="text-sm text-muted-foreground">Loading material types...</div>
                  ) : (materialTypes as MaterialType[])?.length > 0 ? (
                    <div className="space-y-2">
                      {(materialTypes as MaterialType[]).map((mt) => {
                        const isSelected = editingItem.allowed_material_types.some(amt => amt.id === mt.id);
                        return (
                          <div key={mt.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-mt-${mt.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleMaterialType(mt.id, true)}
                            />
                            <Label
                              htmlFor={`edit-mt-${mt.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {mt.code} {mt.description ? `- ${mt.description}` : ""}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No material types available</div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Valuation Class Details Dialog */}
      <Dialog open={isValuationClassDetailsOpen} onOpenChange={setIsValuationClassDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {viewingValuationClass && (
            <>
              <div className="flex items-center space-x-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsValuationClassDetailsOpen(false)}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Valuation Class Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive information about {viewingValuationClass.class_name || viewingValuationClass.class_code}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 px-1">
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{viewingValuationClass.class_name || viewingValuationClass.class_code}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {viewingValuationClass.class_code}
                      </Badge>
                      <Badge
                        variant={viewingValuationClass.is_active !== false ? "default" : "secondary"}
                        className={viewingValuationClass.is_active !== false ? "bg-green-100 text-green-800" : ""}
                      >
                        {viewingValuationClass.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsValuationClassDetailsOpen(false);
                        handleEdit(viewingValuationClass);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        setIsValuationClassDetailsOpen(false);
                        handleDelete(viewingValuationClass.id);
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
                        <Package className="h-4 w-4 mr-2" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Class Code:</dt>
                          <dd className="text-sm text-gray-900">{viewingValuationClass.class_code}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Class Name:</dt>
                          <dd className="text-sm text-gray-900">{viewingValuationClass.class_name || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Description:</dt>
                          <dd className="text-sm text-gray-900">{viewingValuationClass.description || "—"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Valuation Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Valuation Method:</dt>
                          <dd className="text-sm text-gray-900">{viewingValuationClass.valuation_method || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Price Control:</dt>
                          <dd className="text-sm text-gray-900">{viewingValuationClass.price_control || "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Account Category Ref:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingValuationClass.account_category_reference
                              ? `${viewingValuationClass.account_category_reference.code} - ${viewingValuationClass.account_category_reference.name}`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Pricing Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Moving Price:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingValuationClass.moving_price === true ? "Enabled" : "Disabled"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Standard Price:</dt>
                          <dd className="text-sm text-gray-900">
                            {viewingValuationClass.standard_price === true ? "Enabled" : "Disabled"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Allowed Material Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {viewingValuationClass.allowed_material_types && viewingValuationClass.allowed_material_types.length > 0 ? (
                        <div className="space-y-1">
                          {viewingValuationClass.allowed_material_types.map((mt: any) => (
                            <div key={mt.id} className="flex items-center">
                              <Badge variant="outline" className="text-xs">
                                {mt.code}
                              </Badge>
                              <span className="text-sm text-gray-600 ml-2">{mt.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No material types configured</p>
                      )}
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
