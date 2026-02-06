import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Edit, Trash2, ArrowLeft, X, Power, PowerOff } from 'lucide-react';
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

interface BatchClass {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  batchNumberFormat?: string | null;
  shelfLifeDays?: number | null;
  expirationRequired: boolean;
  lotTrackingRequired: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function BatchClasses() {
  const { toast } = useToast();
  const [items, setItems] = useState<BatchClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BatchClass | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    batchNumberFormat: '',
    shelfLifeDays: '',
    expirationRequired: false,
    lotTrackingRequired: true,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/master-data/batch-classes');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Normalize data to handle field name variations
      const normalized = Array.isArray(data) 
        ? data.map((item: any) => ({
            id: item.id,
            code: item.code || '',
            name: item.name || '',
            description: item.description || null,
            batchNumberFormat: item.batchNumberFormat || item.batch_number_format || null,
            shelfLifeDays: item.shelfLifeDays ?? item.shelf_life_days ?? null,
            expirationRequired: item.expirationRequired !== undefined ? item.expirationRequired : (item.expiration_required !== undefined ? item.expiration_required : false),
            lotTrackingRequired: item.lotTrackingRequired !== undefined ? item.lotTrackingRequired : (item.lot_tracking_required !== undefined ? item.lot_tracking_required : true),
            isActive: item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : true),
            createdAt: item.createdAt || item.created_at || null,
            updatedAt: item.updatedAt || item.updated_at || null
          }))
        : [];
      setItems(normalized);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load Batch Classes",
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
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      (item.description || '').toLowerCase().includes(searchLower) ||
      (item.batchNumberFormat || '').toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "Batch Classes data has been refreshed.",
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      batchNumberFormat: '',
      shelfLifeDays: '',
      expirationRequired: false,
      lotTrackingRequired: true,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: BatchClass) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      batchNumberFormat: item.batchNumberFormat || '',
      shelfLifeDays: item.shelfLifeDays?.toString() || '',
      expirationRequired: item.expirationRequired !== undefined ? item.expirationRequired : false,
      lotTrackingRequired: item.lotTrackingRequired !== undefined ? item.lotTrackingRequired : true,
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        isActive: formData.isActive,
        expirationRequired: formData.expirationRequired,
        lotTrackingRequired: formData.lotTrackingRequired,
      };

      // Only include optional fields if they have values
      if (formData.description?.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.batchNumberFormat?.trim()) {
        payload.batchNumberFormat = formData.batchNumberFormat.trim();
      }
      if (formData.shelfLifeDays?.trim()) {
        const days = parseInt(formData.shelfLifeDays);
        if (!isNaN(days) && days > 0) {
          payload.shelfLifeDays = days;
        }
      }

      const url = editingItem
        ? `/api/master-data/batch-classes/${editingItem.id}`
        : '/api/master-data/batch-classes';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save');
      }

      await loadData();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: editingItem ? "Batch Class updated successfully" : "Batch Class created successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to save Batch Class",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this Batch Class? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/master-data/batch-classes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete');
      }

      await loadData();
      toast({
        title: "Success",
        description: "Batch Class deleted successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to delete Batch Class",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this Batch Class? This will set it to inactive status but preserve all associated records.')) {
      return;
    }

    try {
      const res = await fetch(`/api/master-data/batch-classes/${id}/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to deactivate');
      }

      await loadData();
      toast({
        title: "Success",
        description: "Batch Class deactivated successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to deactivate Batch Class",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (item: BatchClass) => {
    try {
      const res = await fetch(`/api/master-data/batch-classes/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to activate');
      }

      await loadData();
      toast({
        title: "Success",
        description: "Batch Class activated successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to activate Batch Class",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="text-sm text-gray-500">
          Master Data → Batch Classes
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Classes</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage batch management categories with shelf life and tracking requirements
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Batch Class
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by code, name, description, or format..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No batch classes found matching your search.' : 'No batch classes found. Create your first one.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Batch Format</TableHead>
                  <TableHead>Shelf Life (days)</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Lot Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>{item.batchNumberFormat || '-'}</TableCell>
                    <TableCell>{item.shelfLifeDays || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={item.expirationRequired ? 'default' : 'secondary'}>
                        {item.expirationRequired ? 'Required' : 'Not Required'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.lotTrackingRequired ? 'default' : 'secondary'}>
                        {item.lotTrackingRequired ? 'Required' : 'Not Required'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.isActive ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(item.id)}
                            className="text-orange-500 hover:text-orange-700"
                            title="Deactivate"
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleActivate(item)}
                            className="text-green-500 hover:text-green-700"
                            title="Activate"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Create'} Batch Class
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the batch class information.'
                : 'Create a new batch class for managing batches and lots.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">
                    Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., RAW001"
                    maxLength={10}
                    required
                    disabled={!!editingItem}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum 10 characters, uppercase</p>
                </div>
                <div>
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Raw Materials"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the batch class"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batchNumberFormat">Batch Number Format</Label>
                  <Input
                    id="batchNumberFormat"
                    value={formData.batchNumberFormat}
                    onChange={(e) => setFormData({ ...formData, batchNumberFormat: e.target.value })}
                    placeholder="e.g., RM-{YYYY}-{MM}-{DD}-{####}"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">Pattern for auto-generating batch numbers</p>
                </div>
                <div>
                  <Label htmlFor="shelfLifeDays">Shelf Life (days)</Label>
                  <Input
                    id="shelfLifeDays"
                    type="number"
                    value={formData.shelfLifeDays}
                    onChange={(e) => setFormData({ ...formData, shelfLifeDays: e.target.value })}
                    placeholder="e.g., 365"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expirationRequired"
                    checked={formData.expirationRequired}
                    onCheckedChange={(checked) => setFormData({ ...formData, expirationRequired: checked as boolean })}
                  />
                  <Label htmlFor="expirationRequired" className="cursor-pointer">
                    Expiration Required
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lotTrackingRequired"
                    checked={formData.lotTrackingRequired}
                    onCheckedChange={(checked) => setFormData({ ...formData, lotTrackingRequired: checked as boolean })}
                  />
                  <Label htmlFor="lotTrackingRequired" className="cursor-pointer">
                    Lot Tracking Required
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'} Batch Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
