import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Edit, Trash2, ArrowLeft, X, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MRPController {
  id: number;
  controller_code: string;
  controller_name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function MRPControllers() {
  const { toast } = useToast();
  const [items, setItems] = useState<MRPController[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MRPController | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    controller_code: '',
    controller_name: '',
    description: '',
    is_active: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/master-data/mrp-controllers');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load MRP Controllers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.controller_code.toLowerCase().includes(searchLower) ||
      item.controller_name.toLowerCase().includes(searchLower) ||
      (item.description || '').toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "MRP Controllers data has been refreshed.",
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      controller_code: '',
      controller_name: '',
      description: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: MRPController) => {
    setEditingItem(item);
    setFormData({
      controller_code: item.controller_code,
      controller_name: item.controller_name,
      description: item.description || '',
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (!item.is_active) {
      // Reactivate if inactive
      const confirmMessage = `Are you sure you want to reactivate MRP Controller "${item.controller_code} - ${item.controller_name}"?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      try {
        const response = await fetch(`/api/master-data/mrp-controllers/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: true }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to reactivate MRP Controller');
        }

        await loadData();
        toast({
          title: "Success",
          description: "MRP Controller reactivated successfully",
        });
      } catch (error: any) {
        console.error('Error reactivating MRP Controller:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to reactivate MRP Controller",
          variant: "destructive",
        });
      }
    } else {
      // Deactivate if active
      const confirmMessage = `Are you sure you want to deactivate MRP Controller "${item.controller_code} - ${item.controller_name}"?\n\nThis will make it unavailable for use in new materials.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      try {
        const response = await fetch(`/api/master-data/mrp-controllers/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: false }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to deactivate MRP Controller');
        }

        await loadData();
        toast({
          title: "Success",
          description: "MRP Controller deactivated successfully",
        });
      } catch (error: any) {
        console.error('Error deactivating MRP Controller:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to deactivate MRP Controller",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const confirmMessage = `Are you sure you want to permanently delete MRP Controller "${item.controller_code} - ${item.controller_name}"?\n\nThis action cannot be undone and will remove the controller from the database.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/master-data/mrp-controllers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete MRP Controller');
      }

      await loadData();
      toast({
        title: "Success",
        description: "MRP Controller deleted permanently",
      });
    } catch (error: any) {
      console.error('Error deleting MRP Controller:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete MRP Controller",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const code = formData.controller_code.trim().toUpperCase();
    const name = formData.controller_name.trim();
    
    if (!code) {
      toast({
        title: "Validation Error",
        description: "Controller code is required",
        variant: "destructive",
      });
      return;
    }
    
    if (code.length > 3) {
      toast({
        title: "Validation Error",
        description: "Controller code must be 3 characters or less",
        variant: "destructive",
      });
      return;
    }
    
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Controller name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (name.length > 100) {
      toast({
        title: "Validation Error",
        description: "Controller name must be 100 characters or less",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const url = editingItem 
        ? `/api/master-data/mrp-controllers/${editingItem.id}`
        : '/api/master-data/mrp-controllers';
      
      const method = editingItem ? 'PATCH' : 'POST';
      
      // Prepare data with normalized values
      const submitData = {
        controller_code: code,
        controller_name: name,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || `Failed to ${editingItem ? 'update' : 'create'} MRP Controller`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      await loadData();
      setIsDialogOpen(false);
      
      // Reset form
      setFormData({
        controller_code: '',
        controller_name: '',
        description: '',
        is_active: true,
      });
      setEditingItem(null);
      
      toast({
        title: "Success",
        description: `MRP Controller ${editingItem ? 'updated' : 'created'} successfully`,
      });
    } catch (error: any) {
      console.error('Error saving MRP Controller:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingItem ? 'update' : 'create'} MRP Controller`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Master Data
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">MRP Controllers</h1>
            <p className="text-muted-foreground">
              Manage Material Requirements Planning Controllers
            </p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by code, name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Controller
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>MRP Controllers ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No MRP Controllers found matching your search' : 'No MRP Controllers found. Click "Add New Controller" to create one.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">
                        {item.controller_code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.controller_name}
                      </TableCell>
                      <TableCell>
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.created_at 
                          ? new Date(item.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(item.id)}
                            className={item.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            title={item.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete Permanently"
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit MRP Controller' : 'Create New MRP Controller'}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the MRP Controller details below.'
                : 'Fill in the details to create a new MRP Controller.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="controller_code">
                  Controller Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="controller_code"
                  value={formData.controller_code}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
                    setFormData({ ...formData, controller_code: value });
                  }}
                  placeholder="e.g., 001"
                  maxLength={3}
                  disabled={!!editingItem}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 3 characters. Cannot be changed after creation.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="controller_name">
                  Controller Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="controller_name"
                  value={formData.controller_name}
                  onChange={(e) => setFormData({ ...formData, controller_name: e.target.value })}
                  placeholder="e.g., Production Planning Controller"
                  maxLength={100}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this controller"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active: checked as boolean })
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'} Controller
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

