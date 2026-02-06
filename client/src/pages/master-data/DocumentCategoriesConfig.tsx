import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  description_text?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export default function DocumentCategoriesConfig() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Helper function to normalize document category data (convert snake_case to camelCase)
  const normalizeDocumentCategory = (dc: any): DocumentCategory => ({
    id: dc.id,
    code: dc.code,
    name: dc.name,
    description: dc.description || dc.description_text || null,
    isActive: dc.is_active !== undefined ? dc.is_active : (dc.isActive !== undefined ? dc.isActive : true),
    createdAt: dc.created_at || dc.createdAt || '',
    updatedAt: dc.updated_at || dc.updatedAt || '',
  });

  // Fetch document categories from API
  const { data: documentCategoriesRaw = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/master-data/document-categories"],
  });

  // Normalize the data
  const documentCategories = documentCategoriesRaw.map(normalizeDocumentCategory);

  // Create document category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; description?: string; isActive: boolean }) => {
      const res = await apiRequest("/api/master-data/document-categories", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-categories"] });
      resetForm();
      toast({ title: "Success", description: "Document category created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create document category.", variant: "destructive" });
    },
  });

  // Update document category mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ code: string; name: string; description?: string; isActive: boolean }> }) => {
      const res = await apiRequest(`/api/master-data/document-categories/${id}`, { 
        method: "PUT", 
        body: JSON.stringify(data) 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-categories"] });
      resetForm();
      toast({ title: "Success", description: "Document category updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update document category.", variant: "destructive" });
    },
  });

  // Delete document category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/master-data/document-categories/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/document-categories"] });
      toast({ title: "Success", description: "Document category deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete document category.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({ title: "Validation Error", description: "Code and name are required.", variant: "destructive" });
      return;
    }

    const categoryData = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      isActive: true
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: categoryData });
    } else {
      createMutation.mutate(categoryData);
    }
  };

  const handleEdit = (item: DocumentCategory) => {
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this document category?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredItems = documentCategories.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/master-data/document-types'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Document Types
          </Button>
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Document Categories Configuration</h1>
            <p className="text-gray-600">Manage document category options for document types</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Document Category
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search document categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Add'} Document Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Code*</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., financial"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name*</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Financial"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the document category"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Update' : 'Create'} Document Category
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Categories ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading document categories...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        No document categories found. Click "Add Document Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-mono">{item.code}</td>
                        <td className="border border-gray-300 px-4 py-2 font-medium">{item.name}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.description || '-'}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}