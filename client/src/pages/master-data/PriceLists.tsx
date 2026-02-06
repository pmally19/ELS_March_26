import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Edit, Trash2, Search, DollarSign, RefreshCw, Download, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PriceList {
  id: number;
  priceListCode: string;
  name: string;
  description?: string;
  currency: string;
  validFrom: string;
  validTo?: string;
  priceListType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    priceListCode: '',
    name: '',
    description: '',
    currency: 'USD',
    validFrom: '',
    validTo: '',
    priceListType: 'standard'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/master-data/price-lists');
      const data = await res.json();
      
      // Handle both array response and object with records property for backward compatibility
      const priceListsArray = Array.isArray(data) ? data : (data?.records?.rows || data?.records || []);
      setPriceLists(priceListsArray);
    } catch (error: any) {
      console.error('Error fetching price lists:', error);
      toast({ 
        title: 'Failed to fetch price lists', 
        description: error?.message || 'An error occurred while loading price lists',
        variant: 'destructive' 
      });
      setPriceLists([]);
    } finally {
      setLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...formData };
      return apiRequest('/api/master-data/price-lists', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      toast({ title: 'Price list created' });
      await fetchPriceLists();
      resetForm();
    },
    onError: (e: any) => {
      toast({ title: 'Failed to create', description: String(e?.message || e), variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error('No price list selected');
      const payload = { ...formData };
      return apiRequest(`/api/master-data/price-lists/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      toast({ title: 'Price list updated' });
      await fetchPriceLists();
      resetForm();
    },
    onError: (e: any) => {
      toast({ title: 'Failed to update', description: String(e?.message || e), variant: 'destructive' });
    }
  });

  const handleEdit = (priceList: PriceList) => {
    setFormData({
      priceListCode: priceList.priceListCode,
      name: priceList.name,
      description: priceList.description || '',
      currency: priceList.currency,
      validFrom: priceList.validFrom,
      validTo: priceList.validTo || '',
      priceListType: priceList.priceListType
    });
    setEditingId(priceList.id);
    setShowDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this price list?')) {
      try {
        await apiRequest(`/api/master-data/price-lists/${id}`, { method: 'DELETE' });
        toast({ title: 'Price list deleted successfully' });
        await fetchPriceLists();
      } catch (error: any) {
        console.error('Error deleting price list:', error);
        toast({ 
          title: 'Failed to delete price list', 
          description: error?.message || 'An error occurred while deleting',
          variant: 'destructive' 
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      priceListCode: '',
      name: '',
      description: '',
      currency: '',
      validFrom: '',
      validTo: '',
      priceListType: ''
    });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPriceLists();
    toast({ title: 'Data refreshed' });
  };

  const exportCsv = () => {
    const rows = priceLists.map(pl => ({
      Code: pl.priceListCode,
      Name: pl.name,
      Type: pl.priceListType,
      Currency: pl.currency,
      'Valid From': pl.validFrom,
      'Valid To': pl.validTo || '',
      Status: pl.isActive ? 'Active' : 'Inactive'
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-lists-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported CSV' });
  };

  const filteredPriceLists = priceLists.filter(priceList =>
    priceList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    priceList.priceListCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (priceList.description && priceList.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
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
          Master Data → Price Lists
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Price Lists</h1>
            <p className="text-gray-600">Sales pricing management with currency support</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Price List
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search price lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(o)=>{ if (!o) resetForm(); else setShowDialog(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Price List' : 'New Price List'}</DialogTitle>
            <DialogDescription>Define pricing list details and validity period</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price List Code*</label>
              <Input value={formData.priceListCode} onChange={(e)=>setFormData({ ...formData, priceListCode: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Name*</label>
              <Input value={formData.name} onChange={(e)=>setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input value={formData.description} onChange={(e)=>setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Currency*</label>
              <select value={formData.currency} onChange={(e)=>setFormData({ ...formData, currency: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md" required>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price List Type*</label>
              <select value={formData.priceListType} onChange={(e)=>setFormData({ ...formData, priceListType: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md" required>
                <option value="standard">Standard</option>
                <option value="promotional">Promotional</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Valid From*</label>
              <Input type="date" value={formData.validFrom} onChange={(e)=>setFormData({ ...formData, validFrom: e.target.value })} required pattern="\\d{4}-\\d{2}-\\d{2}" title="YYYY-MM-DD" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Valid To</label>
              <Input type="date" value={formData.validTo} onChange={(e)=>setFormData({ ...formData, validTo: e.target.value })} pattern="\\d{4}-\\d{2}-\\d{2}" title="YYYY-MM-DD" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={()=> editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingId ? 'Save Changes' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Price Lists</CardTitle>
          <CardDescription>All configured price lists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Currency</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Valid From</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Valid To</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPriceLists.map((priceList) => (
                  <tr key={priceList.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-mono">{priceList.priceListCode}</td>
                    <td className="border border-gray-300 px-4 py-2">{priceList.name}</td>
                    <td className="border border-gray-300 px-4 py-2 capitalize">{priceList.priceListType}</td>
                    <td className="border border-gray-300 px-4 py-2">{priceList.currency}</td>
                    <td className="border border-gray-300 px-4 py-2">{priceList.validFrom}</td>
                    <td className="border border-gray-300 px-4 py-2">{priceList.validTo || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        priceList.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {priceList.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(priceList)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(priceList.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPriceLists.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No price lists found. {searchTerm && `Try adjusting your search for "${searchTerm}".`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}