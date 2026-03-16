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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

interface SDDocumentType {
  id: number;
  code: string;
  name: string;
  category?: string; // Legacy field, kept for backward compatibility
  salesDocumentCategoryId?: number | null;
  salesDocumentCategoryCode?: string | null;
  salesDocumentCategoryName?: string | null;
  numberRange?: string | null;
  documentPricingProcedure?: string | null; // For SAP-standard pricing determination
  defaultShippingCondition?: string | null;
  documentFlow?: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SDDocumentTypes() {
  const { toast } = useToast();
  const [items, setItems] = useState<SDDocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SDDocumentType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    salesDocumentCategoryId: '',
    numberRange: '',
    documentPricingProcedure: '',
    defaultShippingCondition: '',
    documentFlow: '',
    isActive: true,
  });

  // Fetch sales document categories
  const { data: salesDocumentCategories = [] } = useQuery({
    queryKey: ['/api/master-data/sales-document-categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/master-data/sales-document-categories');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching sales document categories:', error);
        return [];
      }
    }
  });

  // Fetch shipping conditions
  const { data: shippingConditions = [] } = useQuery({
    queryKey: ['/api/sales-distribution/shipping-conditions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/sales-distribution/shipping-conditions');
        if (!res.ok) return [];
        const data = await res.json();
        // Normalize data - handle different response formats
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            code: item.code || item.conditionCode || item.condition_code || '',
            name: item.name || item.description || '',
            description: item.description || ''
          }));
        }
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((item: any) => ({
            code: item.code || item.conditionCode || item.condition_code || '',
            name: item.name || item.description || '',
            description: item.description || ''
          }));
        }
        return [];
      } catch (error) {
        console.error('Error fetching shipping conditions:', error);
        return [];
      }
    }
  });

  // Fetch number ranges
  const { data: numberRanges = [] } = useQuery({
    queryKey: ['/api/master-data/number-ranges'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/master-data/number-ranges');
        if (!res.ok) return [];
        const data = await res.json();
        // Normalize data - handle different response formats
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            code: item.code || item.number_range_code || item.numberRangeCode || '',
            name: item.name || item.description || '',
            description: item.description || ''
          }));
        }
        if (data.rows && Array.isArray(data.rows)) {
          return data.rows.map((item: any) => ({
            code: item.code || item.number_range_code || item.numberRangeCode || '',
            name: item.name || item.description || '',
            description: item.description || ''
          }));
        }
        return [];
      } catch (error) {
        console.error('Error fetching number ranges:', error);
        return [];
      }
    }
  });

  // Fetch document pricing procedures (for SAP-standard pricing determination)
  const { data: documentPricingProcedures = [] } = useQuery({
    queryKey: ['/api/master-data/document-pricing-procedures'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/master-data/document-pricing-procedures');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching document pricing procedures:', error);
        return [];
      }
    }
  });


  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/master-data/sd-document-types');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Normalize data to handle field name variations
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
          id: item.id,
          code: item.code || '',
          name: item.name || '',
          category: item.category || '', // Legacy field
          salesDocumentCategoryId: item.salesDocumentCategoryId || item.sales_document_category_id || null,
          salesDocumentCategoryCode: item.salesDocumentCategoryCode || item.sales_document_category_code || null,
          salesDocumentCategoryName: item.salesDocumentCategoryName || item.sales_document_category_name || null,
          numberRange: item.numberRange || item.number_range || null,
          documentPricingProcedure: item.documentPricingProcedure || item.document_pricing_procedure || null,
          defaultShippingCondition: item.defaultShippingCondition || item.default_shipping_condition || null,
          documentFlow: item.documentFlow || item.document_flow || null,
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
        description: "Failed to load Document Types",
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
      (item.category || '').toLowerCase().includes(searchLower) ||
      (item.salesDocumentCategoryName || '').toLowerCase().includes(searchLower) ||
      (item.salesDocumentCategoryCode || '').toLowerCase().includes(searchLower) ||
      (item.numberRange || '').toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "Document Types data has been refreshed.",
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      salesDocumentCategoryId: '',
      numberRange: '',
      documentPricingProcedure: '',
      defaultShippingCondition: '',
      documentFlow: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: SDDocumentType) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      salesDocumentCategoryId: item.salesDocumentCategoryId?.toString() || '',
      numberRange: item.numberRange || '',
      documentPricingProcedure: item.documentPricingProcedure || '',
      defaultShippingCondition: item.defaultShippingCondition || '',
      documentFlow: item.documentFlow ? JSON.stringify(item.documentFlow, null, 2) : '',
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
        salesDocumentCategoryId: parseInt(formData.salesDocumentCategoryId),
        isActive: formData.isActive,
      };

      // Only include optional fields if they have values
      if (formData.numberRange?.trim()) {
        payload.numberRange = formData.numberRange.trim();
      }
      if (formData.documentPricingProcedure?.trim()) {
        payload.documentPricingProcedure = formData.documentPricingProcedure.trim();
      }
      // Note: defaultShippingCondition is not stored in database currently
      // The dropdown is shown for reference but the value is not saved
      // if (formData.defaultShippingCondition?.trim()) {
      //   payload.defaultShippingCondition = formData.defaultShippingCondition.trim();
      // }
      if (formData.documentFlow?.trim()) {
        try {
          payload.documentFlow = JSON.parse(formData.documentFlow);
        } catch {
          toast({
            title: "Error",
            description: "Invalid JSON format for Document Flow",
            variant: "destructive",
          });
          return;
        }
      }

      const url = editingItem
        ? `/api/master-data/sd-document-types/${editingItem.id}`
        : '/api/master-data/sd-document-types';
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
        description: editingItem ? "Document Type updated successfully" : "Document Type created successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to save Document Type",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this Document Type? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/master-data/sd-document-types/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete');
      }

      await loadData();
      toast({
        title: "Success",
        description: "Document Type deleted successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to delete Document Type",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this Document Type? This will set it to inactive status but preserve all associated records.')) {
      return;
    }

    try {
      const res = await fetch(`/api/master-data/sd-document-types/${id}/deactivate`, {
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
        description: "Document Type deactivated successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to deactivate Document Type",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (item: SDDocumentType) => {
    try {
      const res = await fetch(`/api/master-data/sd-document-types/${item.id}`, {
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
        description: "Document Type activated successfully",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Failed to activate Document Type",
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
          Master Data → Sales Document Types
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Document Types</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage document types for sales orders, deliveries, and billing
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document Type
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by code, name, category, or number range..."
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
              {search ? 'No document types found matching your search.' : 'No document types found. Create your first one.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sales Document Category</TableHead>
                  <TableHead>Number Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.salesDocumentCategoryName ? (
                        <Badge variant="outline">
                          {item.salesDocumentCategoryCode} - {item.salesDocumentCategoryName}
                        </Badge>
                      ) : item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{item.numberRange || '-'}</TableCell>
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
              {editingItem ? 'Edit' : 'Create'} Document Type
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the document type information.'
                : 'Create a new document type for sales orders, deliveries, or billing.'}
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
                    placeholder="e.g., OR01"
                    maxLength={4}
                    required
                    disabled={!!editingItem}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum 4 characters, uppercase</p>
                </div>
                <div>
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Order"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="salesDocumentCategoryId">
                  Sales Document Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.salesDocumentCategoryId}
                  onValueChange={(value) => setFormData({ ...formData, salesDocumentCategoryId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales document category" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesDocumentCategories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.categoryCode} - {cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Select how this document type behaves in the system
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numberRange">Number Range</Label>
                  <Select
                    value={formData.numberRange || undefined}
                    onValueChange={(value) => setFormData({ ...formData, numberRange: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select number range" />
                    </SelectTrigger>
                    <SelectContent>
                      {numberRanges.length > 0 ? (
                        numberRanges.map((range: any) => (
                          <SelectItem key={range.code} value={range.code}>
                            {range.code} - {range.name || range.description || ''}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No number ranges available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Optional: Select a number range for document numbering</p>
                </div>
                <div>
                  <Label htmlFor="documentPricingProcedure">Document Pricing Procedure</Label>
                  <Select
                    value={formData.documentPricingProcedure || undefined}
                    onValueChange={(value) => setFormData({ ...formData, documentPricingProcedure: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document pricing procedure" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentPricingProcedures.length > 0 ? (
                        documentPricingProcedures.map((dpp: any) => (
                          <SelectItem key={dpp.id || dpp.procedure_code} value={dpp.procedure_code}>
                            {dpp.procedure_code} - {dpp.description || ''}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No document pricing procedures available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">For SAP-standard pricing determination</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultShippingCondition">Default Shipping Condition</Label>
                  <Select
                    value={formData.defaultShippingCondition || undefined}
                    onValueChange={(value) => setFormData({ ...formData, defaultShippingCondition: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingConditions.length > 0 ? (
                        shippingConditions.map((condition: any) => (
                          <SelectItem key={condition.code} value={condition.code}>
                            {condition.code} - {condition.name || condition.description || ''}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No shipping conditions available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Optional: Select a default shipping condition</p>
                </div>
              </div>
              <div>
                <Label htmlFor="documentFlow">Document Flow (JSON)</Label>
                <Textarea
                  id="documentFlow"
                  value={formData.documentFlow}
                  onChange={(e) => setFormData({ ...formData, documentFlow: e.target.value })}
                  placeholder='{"nextDocument": "DELIVERY", "conditions": {...}}'
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Optional JSON configuration for document flow</p>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'} Document Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

