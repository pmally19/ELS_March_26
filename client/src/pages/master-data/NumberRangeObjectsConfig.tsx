import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface NumberRangeObject {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function NumberRangeObjectsConfig() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<NumberRangeObject | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch number range objects from API
  const { data: numberRangeObjects = [], isLoading, refetch } = useQuery<NumberRangeObject[]>({
    queryKey: ['/api/master-data/number-range-objects'],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Creating number range object with data:', data);
      try {
        const response = await apiRequest('/api/master-data/number-range-objects', {
          method: 'POST',
          body: data
        });
        const result = await response.json();
        console.log('Create result:', result);
        return result;
      } catch (error) {
        console.error('Create error:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      console.log('Create success - invalidating queries');
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/number-range-objects'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Number range object created successfully.' });
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      const errorMessage = error?.message || 'Failed to create number range object.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const response = await apiRequest(`/api/master-data/number-range-objects/${id}`, {
        method: 'PUT',
        body: data
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/number-range-objects'] });
      setEditingObject(null);
      resetForm();
      toast({ title: 'Success', description: 'Number range object updated successfully.' });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      const errorMessage = error?.message || 'Failed to update number range object.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/master-data/number-range-objects/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/number-range-objects'] });
      toast({ title: 'Success', description: 'Number range object deleted successfully.' });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      const errorMessage = error?.message || 'Failed to delete number range object.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', isActive: true });
    setEditingObject(null);
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (item: NumberRangeObject) => {
    setEditingObject(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      isActive: item.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { editingObject, formData });
    if (editingObject) {
      console.log('Calling update mutation');
      updateMutation.mutate({ id: editingObject.id, data: formData });
    } else {
      console.log('Calling create mutation');
      createMutation.mutate(formData);
    }
  };

  const filteredItems = numberRangeObjects.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/master-data/number-ranges">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Number Ranges
            </Button>
          </Link>
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Number Range Objects Configuration</h1>
            <p className="text-gray-600">Manage number range object options for number ranges</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Number Range Object
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search number range objects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingObject ? 'Edit' : 'Add'} Number Range Object</DialogTitle>
            <DialogDescription>
              {editingObject ? 'Update the number range object details' : 'Create a new number range object for document numbering'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., accounting_document"
                required
                disabled={!!editingObject}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Accounting Document"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of the number range object"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingObject ? 'Update' : 'Create'} Number Range Object
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Number Range Objects ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No number range objects found matching your search.' : 'No number range objects configured yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this number range object?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
