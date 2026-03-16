import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Download, Upload, Search, RotateCcw, Edit, Trash2, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface BankMaster {
  id: number;
  bankKey: string;
  bankName: string;
  bankNumber: string;
  swiftCode?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  apiEndpoint?: string;
  companyCodeId?: number;
  companyCode?: string;
  companyName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewBankMaster {
  bankKey: string;
  bankName: string;
  bankNumber: string;
  swiftCode?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  apiEndpoint?: string;
  companyCodeId?: number;
  isActive: boolean;
}

export default function BankMaster() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BankMaster | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<NewBankMaster>({
    bankKey: "",
    bankName: "",
    bankNumber: "",
    swiftCode: "",
    countryCode: "",
    region: "",
    city: "",
    address: "",
    apiEndpoint: "",
    companyCodeId: undefined,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
    queryKey: ["/api/master-data/company-code"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/company-code");
      if (!response.ok) throw new Error("Failed to fetch company codes");
      return response.json();
    },
  });

  const { data: bankMasters = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/master-data/bank-master"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/bank-master");
      if (!response.ok) throw new Error("Failed to fetch bank master data");
      const raw = await response.json();
      const rows: any[] = Array.isArray(raw) ? raw : (raw?.rows || raw?.data || []);
      return rows.map((r: any) => ({
        id: r.id,
        bankKey: r.bank_key || r.bankKey || "",
        bankName: r.bank_name || r.bankName || "",
        bankNumber: r.bank_number || r.bankNumber || "",
        swiftCode: r.swift_code || r.swiftCode || "",
        countryCode: r.country_code || r.countryCode || "",
        region: r.region || "",
        city: r.city || "",
        address: r.address || "",
        apiEndpoint: r.api_endpoint || r.apiEndpoint || "",
        companyCodeId: r.company_code_id || r.companyCodeId || undefined,
        companyCode: r.company_code || r.companyCode || "",
        companyName: r.company_name || r.companyName || "",
        isActive: typeof r.is_active === "boolean" ? r.is_active : !!(r.isActive ?? true),
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewBankMaster) => {
      const response = await fetch("/api/master-data/bank-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to create bank master";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bank-master"] });
      setShowCreateDialog(false);
      setNewItem({
        bankKey: "",
        bankName: "",
        bankNumber: "",
        swiftCode: "",
        countryCode: "",
        region: "",
        city: "",
        address: "",
        apiEndpoint: "",
        companyCodeId: undefined,
        isActive: true
      });
      toast({
        title: "Success",
        description: "Bank master created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bank master",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewBankMaster> }) => {
      const response = await fetch(`/api/master-data/bank-master/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let msg = "Failed to update bank master";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bank-master"] });
      setShowEditDialog(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Bank master updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bank master",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/bank-master/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let msg = "Failed to delete bank master";
        try {
          const err = await response.json();
          msg = err?.message || err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/bank-master"] });
      setShowDeleteDialog(false);
      setDeletingItemId(null);
      toast({
        title: "Success",
        description: "Bank master deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bank master",
        variant: "destructive",
      });
    },
  });

  const filteredData = bankMasters.filter((item) => {
    const matchesSearch =
      item.bankKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bankNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.swiftCode && item.swiftCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.countryCode && item.countryCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (item: BankMaster) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const dataToExport = filteredData.map(item => ({
      "Bank Key": item.bankKey,
      "Bank Name": item.bankName,
      "Bank Number": item.bankNumber,
      "Company Code": item.companyCode || "",
      "Company Name": item.companyName || "",
      "SWIFT Code": item.swiftCode || "",
      "Country Code": item.countryCode || "",
      "Region": item.region || "",
      "City": item.city || "",
      "Address": item.address || "",
      "API Endpoint": item.apiEndpoint || "",
      "Status": item.isActive ? "Active" : "Inactive",
      "Created At": new Date(item.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank Master");
    XLSX.writeFile(wb, `bank-master-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: `Exported ${dataToExport.length} bank master records`,
    });
  };

  useEffect(() => {
    document.title = "Bank Master | MallyERP";
  }, []);

  return (
    <div className="space-y-6 p-6">
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
          Master Data → Bank Master
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Bank Master
          </h1>
          <p className="text-gray-600 mt-2">
            Manage bank master data for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by bank key, name, number, SWIFT code, or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Master Records</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredData.length} bank${filteredData.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bank master data...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Error loading bank master data. Please try again.
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bank master records found. Create your first bank master record.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Bank Key</th>
                    <th className="text-left p-3 font-semibold">Bank Name</th>
                    <th className="text-left p-3 font-semibold">Bank Number</th>
                    <th className="text-left p-3 font-semibold">Company Code</th>
                    <th className="text-left p-3 font-semibold">SWIFT Code</th>
                    <th className="text-left p-3 font-semibold">Country</th>
                    <th className="text-left p-3 font-semibold">Region</th>
                    <th className="text-left p-3 font-semibold">City</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{item.bankKey}</td>
                      <td className="p-3">{item.bankName}</td>
                      <td className="p-3 font-mono text-sm">{item.bankNumber}</td>
                      <td className="p-3">
                        {item.companyCode ? (
                          <div>
                            <div className="font-semibold">{item.companyCode}</div>
                            {item.companyName && (
                              <div className="text-xs text-gray-500">{item.companyName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-sm">{item.swiftCode || "-"}</td>
                      <td className="p-3">{item.countryCode || "-"}</td>
                      <td className="p-3">{item.region || "-"}</td>
                      <td className="p-3">{item.city || "-"}</td>
                      <td className="p-3">
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Bank Master</DialogTitle>
            <DialogDescription>
              Add a new bank master record to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankKey">Bank Key *</Label>
                <Input
                  id="bankKey"
                  value={newItem.bankKey}
                  onChange={(e) => setNewItem({ ...newItem, bankKey: e.target.value })}
                  placeholder="e.g., BNK001"
                />
              </div>
              <div>
                <Label htmlFor="bankNumber">Bank Number *</Label>
                <Input
                  id="bankNumber"
                  value={newItem.bankNumber}
                  onChange={(e) => setNewItem({ ...newItem, bankNumber: e.target.value })}
                  placeholder="e.g., 123456789"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={newItem.bankName}
                onChange={(e) => setNewItem({ ...newItem, bankName: e.target.value })}
                placeholder="e.g., First National Bank"
              />
            </div>
            <div>
              <Label htmlFor="companyCode">Company Code</Label>
              <Select
                value={newItem.companyCodeId?.toString() || "none"}
                onValueChange={(value) => setNewItem({ ...newItem, companyCodeId: value === "none" ? undefined : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companyCodes.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="swiftCode">SWIFT Code</Label>
                <Input
                  id="swiftCode"
                  value={newItem.swiftCode}
                  onChange={(e) => setNewItem({ ...newItem, swiftCode: e.target.value })}
                  placeholder="e.g., CHASUS33"
                />
              </div>
              <div>
                <Label htmlFor="countryCode">Country Code</Label>
                <Input
                  id="countryCode"
                  value={newItem.countryCode}
                  onChange={(e) => setNewItem({ ...newItem, countryCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., US"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={newItem.region}
                  onChange={(e) => setNewItem({ ...newItem, region: e.target.value })}
                  placeholder="e.g., North America"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newItem.city}
                  onChange={(e) => setNewItem({ ...newItem, city: e.target.value })}
                  placeholder="e.g., New York"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newItem.address}
                onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                placeholder="Full address"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                value={newItem.apiEndpoint}
                onChange={(e) => setNewItem({ ...newItem, apiEndpoint: e.target.value })}
                placeholder="e.g., https://api.bank.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newItem.isActive}
                onCheckedChange={(checked) => setNewItem({ ...newItem, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newItem.bankKey || !newItem.bankName || !newItem.bankNumber) {
                    toast({
                      title: "Validation Error",
                      description: "Please fill in all required fields",
                      variant: "destructive",
                    });
                    return;
                  }
                  createMutation.mutate(newItem);
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bank Master</DialogTitle>
            <DialogDescription>
              Update bank master record details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-bankKey">Bank Key *</Label>
                  <Input
                    id="edit-bankKey"
                    value={editingItem.bankKey}
                    onChange={(e) => setEditingItem({ ...editingItem, bankKey: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bankNumber">Bank Number *</Label>
                  <Input
                    id="edit-bankNumber"
                    value={editingItem.bankNumber}
                    onChange={(e) => setEditingItem({ ...editingItem, bankNumber: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-bankName">Bank Name *</Label>
                <Input
                  id="edit-bankName"
                  value={editingItem.bankName}
                  onChange={(e) => setEditingItem({ ...editingItem, bankName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-companyCode">Company Code</Label>
                <Select
                  value={editingItem.companyCodeId?.toString() || "none"}
                  onValueChange={(value) => setEditingItem({ ...editingItem, companyCodeId: value === "none" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companyCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-swiftCode">SWIFT Code</Label>
                  <Input
                    id="edit-swiftCode"
                    value={editingItem.swiftCode || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, swiftCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-countryCode">Country Code</Label>
                  <Input
                    id="edit-countryCode"
                    value={editingItem.countryCode || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, countryCode: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-region">Region</Label>
                  <Input
                    id="edit-region"
                    value={editingItem.region || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, region: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editingItem.city || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={editingItem.address || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-apiEndpoint">API Endpoint</Label>
                <Input
                  id="edit-apiEndpoint"
                  value={editingItem.apiEndpoint || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, apiEndpoint: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingItem.isActive}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editingItem.bankKey || !editingItem.bankName || !editingItem.bankNumber) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in all required fields",
                        variant: "destructive",
                      });
                      return;
                    }
                    updateMutation.mutate({ id: editingItem.id, data: editingItem });
                  }}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Master</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank master record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingItemId) {
                  deleteMutation.mutate(deletingItemId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

