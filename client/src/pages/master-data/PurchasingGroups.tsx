import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PurchasingGroup, InsertPurchasingGroup } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Upload, Download, RefreshCw, Edit2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function PurchasingGroups() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PurchasingGroup | null>(null);
  const [newGroup, setNewGroup] = useState<Partial<InsertPurchasingGroup>>({
    code: "",
    description: "",
    responsibleBuyer: "",
    telephoneNumber: "",
    emailAddress: "",
    isActive: true
  });

  // Fetch purchasing groups
  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/master-data/purchasing-group'],
    queryFn: () => fetch('/api/master-data/purchasing-group').then(res => res.json())
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: InsertPurchasingGroup) => 
      apiRequest('/api/master-data/purchasing-group', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-group'] });
      setIsCreateDialogOpen(false);
      setNewGroup({ code: "", description: "", responsibleBuyer: "", telephoneNumber: "", emailAddress: "", isActive: true });
      toast({ title: "Success", description: "Purchasing group created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create purchasing group", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPurchasingGroup> }) =>
      apiRequest(`/api/master-data/purchasing-group/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-group'] });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      toast({ title: "Success", description: "Purchasing group updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update purchasing group", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/purchasing-group/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-group'] });
      toast({ title: "Success", description: "Purchasing group deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete purchasing group", variant: "destructive" });
    }
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: (data: InsertPurchasingGroup[]) =>
      apiRequest('/api/master-data/purchasing-group/bulk-import', 'POST', { groups: data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/purchasing-group'] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${result.imported} purchasing groups, ${result.errors} errors` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
  });

  const filteredGroups = groups.filter((group: PurchasingGroup) =>
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.responsibleBuyer && group.responsibleBuyer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = () => {
    if (!newGroup.code || !newGroup.description) {
      toast({ title: "Validation Error", description: "Code and description are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newGroup as InsertPurchasingGroup);
  };

  const handleEdit = (group: PurchasingGroup) => {
    setEditingGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingGroup) return;
    updateMutation.mutate({ id: editingGroup.id, data: editingGroup });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this purchasing group?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const importData: InsertPurchasingGroup[] = jsonData.map(row => ({
          code: row.Code || row.code || '',
          description: row.Description || row.description || '',
          responsibleBuyer: row['Responsible Buyer'] || row.responsibleBuyer || '',
          telephoneNumber: row['Telephone Number'] || row.telephoneNumber || '',
          emailAddress: row['Email Address'] || row.emailAddress || '',
          isActive: row['Is Active'] !== undefined ? Boolean(row['Is Active']) : true
        }));

        bulkImportMutation.mutate(importData);
      } catch (error) {
        toast({ title: "Import Error", description: "Failed to parse Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleExcelExport = () => {
    const exportData = filteredGroups.map(group => ({
      Code: group.code,
      Description: group.description,
      'Responsible Buyer': group.responsibleBuyer || '',
      'Telephone Number': group.telephoneNumber || '',
      'Email Address': group.emailAddress || '',
      'Is Active': group.isActive
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchasing Groups');
    XLSX.writeFile(workbook, 'purchasing_groups.xlsx');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchasing Groups</h1>
            <p className="text-gray-500">Manage procurement team assignments and responsibilities</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Purchasing Groups List</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Purchasing Groups ({filteredGroups.length})</CardTitle>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search purchasing groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Purchasing Group</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="code">Code *</Label>
                          <Input
                            id="code"
                            value={newGroup.code}
                            onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })}
                            placeholder="e.g., PG001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={newGroup.description}
                            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                            placeholder="Enter description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="buyer">Responsible Buyer</Label>
                          <Input
                            id="buyer"
                            value={newGroup.responsibleBuyer}
                            onChange={(e) => setNewGroup({ ...newGroup, responsibleBuyer: e.target.value })}
                            placeholder="Buyer name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telephone Number</Label>
                          <Input
                            id="phone"
                            value={newGroup.telephoneNumber}
                            onChange={(e) => setNewGroup({ ...newGroup, telephoneNumber: e.target.value })}
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newGroup.emailAddress}
                            onChange={(e) => setNewGroup({ ...newGroup, emailAddress: e.target.value })}
                            placeholder="buyer@company.com"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="active"
                            checked={newGroup.isActive}
                            onCheckedChange={(checked) => setNewGroup({ ...newGroup, isActive: checked })}
                          />
                          <Label htmlFor="active">Active</Label>
                        </div>
                        <Button 
                          onClick={handleCreate} 
                          className="w-full"
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending ? "Creating..." : "Create Group"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading purchasing groups...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Responsible Buyer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group: PurchasingGroup) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.code}</TableCell>
                        <TableCell>{group.description}</TableCell>
                        <TableCell>{group.responsibleBuyer || '-'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {group.telephoneNumber && <div>{group.telephoneNumber}</div>}
                            {group.emailAddress && <div className="text-blue-600">{group.emailAddress}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(group)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(group.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Purchasing Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="excel-import">Import from Excel</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="excel-import"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      disabled={bulkImportMutation.isPending}
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Export to Excel</Label>
                  <Button onClick={handleExcelExport} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Groups
                  </Button>
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
            <DialogTitle>Edit Purchasing Group</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-code">Code *</Label>
                <Input
                  id="edit-code"
                  value={editingGroup.code}
                  onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editingGroup.description}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-buyer">Responsible Buyer</Label>
                <Input
                  id="edit-buyer"
                  value={editingGroup.responsibleBuyer || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, responsibleBuyer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telephone Number</Label>
                <Input
                  id="edit-phone"
                  value={editingGroup.telephoneNumber || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, telephoneNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  value={editingGroup.emailAddress || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, emailAddress: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editingGroup.isActive}
                  onCheckedChange={(checked) => setEditingGroup({ ...editingGroup, isActive: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
              <Button 
                onClick={handleUpdate} 
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Group"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}