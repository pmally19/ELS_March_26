import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, RefreshCw, Download, Upload, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface ToleranceGroup {
  id: number;
  code: string;
  description: string;
  toleranceType: string;
  currency: string;
  smallAmountLimit: number;
  percentageLimit: number;
  absoluteLimit: number;
  companyCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewToleranceGroup {
  code: string;
  description: string;
  toleranceType: string;
  currency: string;
  smallAmountLimit: number;
  percentageLimit: number;
  absoluteLimit: number;
  companyCode?: string;
  isActive: boolean;
}

export default function ToleranceGroupsNew() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ToleranceGroup | null>(null);
  const [newGroup, setNewGroup] = useState<NewToleranceGroup>({
    code: "",
    description: "",
    toleranceType: "Employee",
    currency: "USD",
    smallAmountLimit: 0.00,
    percentageLimit: 0.00,
    absoluteLimit: 0.00,
    companyCode: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: toleranceGroups = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/master-data/tolerance-groups"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/tolerance-groups");
      if (!response.ok) throw new Error("Failed to fetch tolerance groups");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewToleranceGroup) => {
      const response = await fetch("/api/master-data/tolerance-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create tolerance group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tolerance-groups"] });
      setIsCreateDialogOpen(false);
      setNewGroup({
        code: "",
        description: "",
        toleranceType: "Employee",
        currency: "USD",
        smallAmountLimit: 0.00,
        percentageLimit: 0.00,
        absoluteLimit: 0.00,
        companyCode: "",
        isActive: true
      });
      toast({ title: "Success", description: "Tolerance group created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create tolerance group", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: NewToleranceGroup }) => {
      const response = await fetch(`/api/master-data/tolerance-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update tolerance group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tolerance-groups"] });
      setEditingGroup(null);
      toast({ title: "Success", description: "Tolerance group updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update tolerance group", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/tolerance-groups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete tolerance group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tolerance-groups"] });
      toast({ title: "Success", description: "Tolerance group deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to delete tolerance group", variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (groups: NewToleranceGroup[]) => {
      const response = await fetch("/api/master-data/tolerance-groups/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });
      if (!response.ok) throw new Error("Failed to import tolerance groups");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/tolerance-groups"] });
      toast({ title: "Success", description: "Tolerance groups imported successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to import tolerance groups", variant: "destructive" });
    },
  });

  const filteredGroups = toleranceGroups.filter((item: ToleranceGroup) => {
    const searchLower = searchTerm.toLowerCase();
    return item.code.toLowerCase().includes(searchLower) ||
           item.description.toLowerCase().includes(searchLower) ||
           item.toleranceType.toLowerCase().includes(searchLower) ||
           item.currency.toLowerCase().includes(searchLower);
  });

  const handleEdit = (item: ToleranceGroup) => {
    setEditingGroup(item);
  };

  const handleExportCSV = () => {
    const csvData = filteredGroups.map(group => ({
      Code: group.code,
      Description: group.description,
      "Tolerance Type": group.toleranceType,
      Currency: group.currency,
      "Small Amount Limit": group.smallAmountLimit,
      "Percentage Limit": group.percentageLimit,
      "Absolute Limit": group.absoluteLimit,
      "Company Code": group.companyCode || "",
      Active: group.isActive ? "Yes" : "No"
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tolerance Groups");
    XLSX.writeFile(wb, "tolerance_groups.xlsx");
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importData = jsonData.map((row: any) => ({
          code: row.Code || "",
          description: row.Description || "",
          toleranceType: row["Tolerance Type"] || "Employee",
          currency: row.Currency || "USD",
          smallAmountLimit: parseFloat(row["Small Amount Limit"]) || 0.00,
          percentageLimit: parseFloat(row["Percentage Limit"]) || 0.00,
          absoluteLimit: parseFloat(row["Absolute Limit"]) || 0.00,
          companyCode: row["Company Code"] || "",
          isActive: row.Active === "Yes" || row.Active === true
        }));

        bulkImportMutation.mutate(importData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading tolerance groups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tolerance Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
              id="excel-import"
            />
            <Button variant="outline" onClick={() => document.getElementById('excel-import')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Tolerance Groups List</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tolerance groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tolerance Groups ({filteredGroups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Small Amount</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Absolute</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((item: ToleranceGroup) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.toleranceType}</TableCell>
                      <TableCell>{item.currency}</TableCell>
                      <TableCell>{item.smallAmountLimit}</TableCell>
                      <TableCell>{item.percentageLimit}%</TableCell>
                      <TableCell>{item.absoluteLimit}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
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
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Tolerance Group</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={newGroup.code}
                    onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })}
                    placeholder="Tolerance group code"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="Tolerance group description"
                  />
                </div>
                <div>
                  <Label htmlFor="toleranceType">Tolerance Type</Label>
                  <Select value={newGroup.toleranceType} onValueChange={(value) => setNewGroup({ ...newGroup, toleranceType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tolerance type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={newGroup.currency} onValueChange={(value) => setNewGroup({ ...newGroup, currency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="smallAmountLimit">Small Amount Limit</Label>
                  <Input
                    id="smallAmountLimit"
                    type="number"
                    step="0.01"
                    value={newGroup.smallAmountLimit}
                    onChange={(e) => setNewGroup({ ...newGroup, smallAmountLimit: parseFloat(e.target.value) || 0.00 })}
                    placeholder="Small amount limit"
                  />
                </div>
                <div>
                  <Label htmlFor="percentageLimit">Percentage Limit (%)</Label>
                  <Input
                    id="percentageLimit"
                    type="number"
                    step="0.01"
                    value={newGroup.percentageLimit}
                    onChange={(e) => setNewGroup({ ...newGroup, percentageLimit: parseFloat(e.target.value) || 0.00 })}
                    placeholder="Percentage limit"
                  />
                </div>
                <div>
                  <Label htmlFor="absoluteLimit">Absolute Limit</Label>
                  <Input
                    id="absoluteLimit"
                    type="number"
                    step="0.01"
                    value={newGroup.absoluteLimit}
                    onChange={(e) => setNewGroup({ ...newGroup, absoluteLimit: parseFloat(e.target.value) || 0.00 })}
                    placeholder="Absolute limit"
                  />
                </div>
                <div>
                  <Label htmlFor="companyCode">Company Code (Optional)</Label>
                  <Input
                    id="companyCode"
                    value={newGroup.companyCode}
                    onChange={(e) => setNewGroup({ ...newGroup, companyCode: e.target.value })}
                    placeholder="Company code"
                  />
                </div>
              </div>
              <Button onClick={() => createMutation.mutate(newGroup)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Tolerance Group
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingGroup && (
        <Dialog open={true} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tolerance Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    value={editingGroup.code}
                    onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingGroup.description}
                    onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-toleranceType">Tolerance Type</Label>
                  <Select value={editingGroup.toleranceType} onValueChange={(value) => setEditingGroup({ ...editingGroup, toleranceType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select value={editingGroup.currency} onValueChange={(value) => setEditingGroup({ ...editingGroup, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-smallAmountLimit">Small Amount Limit</Label>
                  <Input
                    id="edit-smallAmountLimit"
                    type="number"
                    step="0.01"
                    value={editingGroup.smallAmountLimit}
                    onChange={(e) => setEditingGroup({ ...editingGroup, smallAmountLimit: parseFloat(e.target.value) || 0.00 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-percentageLimit">Percentage Limit (%)</Label>
                  <Input
                    id="edit-percentageLimit"
                    type="number"
                    step="0.01"
                    value={editingGroup.percentageLimit}
                    onChange={(e) => setEditingGroup({ ...editingGroup, percentageLimit: parseFloat(e.target.value) || 0.00 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-absoluteLimit">Absolute Limit</Label>
                  <Input
                    id="edit-absoluteLimit"
                    type="number"
                    step="0.01"
                    value={editingGroup.absoluteLimit}
                    onChange={(e) => setEditingGroup({ ...editingGroup, absoluteLimit: parseFloat(e.target.value) || 0.00 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-companyCode">Company Code</Label>
                  <Input
                    id="edit-companyCode"
                    value={editingGroup.companyCode || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, companyCode: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateMutation.mutate({
                    id: editingGroup.id,
                    data: {
                      code: editingGroup.code,
                      description: editingGroup.description,
                      toleranceType: editingGroup.toleranceType,
                      currency: editingGroup.currency,
                      smallAmountLimit: editingGroup.smallAmountLimit,
                      percentageLimit: editingGroup.percentageLimit,
                      absoluteLimit: editingGroup.absoluteLimit,
                      companyCode: editingGroup.companyCode,
                      isActive: editingGroup.isActive
                    }
                  })}
                  className="flex-1"
                >
                  Update Tolerance Group
                </Button>
                <Button variant="outline" onClick={() => setEditingGroup(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}