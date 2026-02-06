import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Settings, ArrowLeft } from 'lucide-react';

interface InventoryDirection {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function InventoryDirectionsConfig() {
  const [inventoryDirections, setInventoryDirections] = useState<InventoryDirection[]>([
    { id: 1, code: 'increase', name: 'Increase', description: 'Increase inventory quantity', isActive: true },
    { id: 2, code: 'decrease', name: 'Decrease', description: 'Decrease inventory quantity', isActive: true },
    { id: 3, code: 'neutral', name: 'Neutral', description: 'No change in inventory quantity', isActive: true }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInventoryDirections(prev => prev.map(item => 
        item.id === editingId ? { ...item, ...formData } : item
      ));
    } else {
      const newItem = {
        id: Math.max(...inventoryDirections.map(i => i.id), 0) + 1,
        ...formData,
        isActive: true
      };
      setInventoryDirections(prev => [...prev, newItem]);
    }
    resetForm();
  };

  const handleEdit = (item: InventoryDirection) => {
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this inventory direction?')) {
      setInventoryDirections(prev => prev.filter(item => item.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredItems = inventoryDirections.filter(item =>
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
            onClick={() => window.location.href = '/master-data/movement-types'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Movement Types
          </Button>
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Inventory Directions Configuration</h1>
            <p className="text-gray-600">Manage inventory direction options for movement types</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Inventory Direction
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search inventory directions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Add'} Inventory Direction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Code*</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., increase"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name*</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Increase"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the inventory direction"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Inventory Direction
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
          <CardTitle>Inventory Directions ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                {filteredItems.map((item) => (
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
                        <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}