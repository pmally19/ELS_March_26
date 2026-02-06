import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Edit, Trash2, ArrowLeft, FileText } from 'lucide-react';
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
import { apiRequest } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesDocumentCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  description: string;
  salesProcessType: string; // ORDER, DELIVERY, or BILLING
  deliveryRelevant: boolean;
  billingRelevant: boolean;
  pricingRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SalesDocumentCategories() {
  const { toast } = useToast();
  const [items, setItems] = useState<SalesDocumentCategory[]>([]);
  const [processTypes, setProcessTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesDocumentCategory | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    description: '',
    salesProcessType: 'ORDER', // Default to ORDER
    deliveryRelevant: false,
    billingRelevant: false,
    pricingRequired: false,
  });

  useEffect(() => {
    fetchProcessTypes();
    fetchItems();
  }, []);

  const fetchProcessTypes = async () => {
    try {
      const response = await apiRequest('/api/master-data/sales-process-types');
      if (!response.ok) throw new Error('Failed to fetch sales process types');
      const data = await response.json();
      setProcessTypes(Array.isArray(data) ? data.filter((pt: any) => pt.is_active) : []);
    } catch (error) {
      console.error('Error fetching sales process types:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales process types',
        variant: 'destructive',
      });
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/master-data/sales-document-categories');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to fetch sales document categories';
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching sales document categories:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch sales document categories. Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchItems();
    setIsRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Sales document categories list has been updated',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    const trimmedCode = formData.categoryCode.trim();
    const trimmedName = formData.categoryName.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedCode || trimmedCode.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Category code is required and cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedName || trimmedName.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required and cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedDescription || trimmedDescription.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Description is required and cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedCode.length > 10) {
      toast({
        title: 'Validation Error',
        description: 'Category code cannot exceed 10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName.length > 100) {
      toast({
        title: 'Validation Error',
        description: 'Category name cannot exceed 100 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Prepare payload
      const payload = {
        categoryCode: trimmedCode.toUpperCase(),
        categoryName: trimmedName,
        description: trimmedDescription,
        salesProcessType: formData.salesProcessType,
        deliveryRelevant: formData.deliveryRelevant,
        billingRelevant: formData.billingRelevant,
        pricingRequired: formData.pricingRequired,
      };

      if (editingItem) {
        // Update
        const response = await apiRequest(`/api/master-data/sales-document-categories/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to update sales document category';

          // Check for conflict (duplicate code/name)
          if (errorData.existingCategory) {
            throw new Error(`${errorMessage}. Existing category: ${errorData.existingCategory.categoryName || errorData.existingCategory.category_code} (ID: ${errorData.existingCategory.id})`);
          }

          throw new Error(errorMessage);
        }

        toast({
          title: 'Success',
          description: 'Sales document category updated successfully',
        });
      } else {
        // Create
        const response = await apiRequest('/api/master-data/sales-document-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to create sales document category';

          // Check for conflict (duplicate code/name)
          if (errorData.existingCategory) {
            throw new Error(`${errorMessage}. Existing category: ${errorData.existingCategory.categoryName || errorData.existingCategory.category_name} (ID: ${errorData.existingCategory.id})`);
          }

          throw new Error(errorMessage);
        }

        toast({
          title: 'Success',
          description: 'Sales document category created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({
        categoryCode: '',
        categoryName: '',
        description: '',
        salesProcessType: 'ORDER',
        deliveryRelevant: false,
        billingRelevant: false,
        pricingRequired: false
      });
      fetchItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while saving the sales document category',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: SalesDocumentCategory) => {
    setEditingItem(item);
    setFormData({
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,
      description: item.description,
      salesProcessType: item.salesProcessType,
      deliveryRelevant: item.deliveryRelevant,
      billingRelevant: item.billingRelevant,
      pricingRequired: item.pricingRequired,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const category = items.find(item => item.id === id);
    const categoryName = category ? `${category.categoryCode} - ${category.categoryName}` : 'this sales document category';

    if (!window.confirm(`Are you sure you want to delete ${categoryName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/master-data/sales-document-categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || 'Failed to delete sales document category';
        throw new Error(errorMessage);
      }

      toast({
        title: 'Success',
        description: 'Sales document category deleted successfully',
      });
      fetchItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete sales document category',
        variant: 'destructive',
      });
    }
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      categoryCode: '',
      categoryName: '',
      description: '',
      salesProcessType: 'ORDER',
      deliveryRelevant: false,
      billingRelevant: false,
      pricingRequired: false
    });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.categoryCode.toLowerCase().includes(searchLower) ||
      item.categoryName.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sales Document Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage sales document categories that define how sales documents behave in the system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Category
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code, name, or description..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sales Document Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Document Categories</CardTitle>
          <CardDescription>
            All sales document categories in the system ({filteredItems.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No sales document categories found matching your search' : 'No sales document categories found. Create your first category.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="bg-background">Category Code</TableHead>
                      <TableHead className="bg-background">Category Name</TableHead>
                      <TableHead className="bg-background">Sales Process Type</TableHead>
                      <TableHead className="hidden md:table-cell bg-background">Description</TableHead>
                      <TableHead className="text-center bg-background">Delivery Relevant</TableHead>
                      <TableHead className="text-center bg-background">Billing Relevant</TableHead>
                      <TableHead className="text-center bg-background">Pricing Required</TableHead>
                      <TableHead className="text-right bg-background">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium font-mono">{item.categoryCode}</TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant={item.salesProcessType === 'ORDER' ? 'default' : item.salesProcessType === 'DELIVERY' ? 'secondary' : 'outline'}>
                            {item.salesProcessType}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {item.description || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.deliveryRelevant ? 'default' : 'secondary'}>
                            {item.deliveryRelevant ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.billingRelevant ? 'default' : 'secondary'}>
                            {item.billingRelevant ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.pricingRequired ? 'default' : 'secondary'}>
                            {item.pricingRequired ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Sales Document Category' : 'Create Sales Document Category'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the sales document category details below'
                : 'Add a new sales document category to define how sales documents behave in the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="categoryCode">
                  Category Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="categoryCode"
                  value={formData.categoryCode}
                  onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., C (for Order)"
                  required
                  disabled={!!editingItem}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique code for this category (max 10 characters, auto-converted to uppercase)
                  {formData.categoryCode.length > 0 && (
                    <span className={`ml-2 ${formData.categoryCode.length > 10 ? 'text-red-500' : ''}`}>
                      ({formData.categoryCode.length}/10)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label htmlFor="categoryName">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="categoryName"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  placeholder="e.g., Order"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Display name for this category (max 100 characters)
                  {formData.categoryName.length > 0 && (
                    <span className={`ml-2 ${formData.categoryName.length > 100 ? 'text-red-500' : ''}`}>
                      ({formData.categoryName.length}/100)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe how this category behaves in the system"
                  required
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Detailed description of this sales document category
                </p>
              </div>
              <div>
                <Label htmlFor="salesProcessType">
                  Sales Process Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.salesProcessType}
                  onValueChange={(value) => setFormData({ ...formData, salesProcessType: value })}
                >
                  <SelectTrigger id="salesProcessType">
                    <SelectValue placeholder="Select process type" />
                  </SelectTrigger>
                  <SelectContent>
                    {processTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.process_code}>
                        {pt.process_code} - {pt.process_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Determines how this category is used in sales document processing
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deliveryRelevant"
                    checked={formData.deliveryRelevant}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, deliveryRelevant: checked as boolean })
                    }
                  />
                  <Label htmlFor="deliveryRelevant" className="cursor-pointer">
                    Delivery Relevant
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billingRelevant"
                    checked={formData.billingRelevant}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, billingRelevant: checked as boolean })
                    }
                  />
                  <Label htmlFor="billingRelevant" className="cursor-pointer">
                    Billing Relevant
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pricingRequired"
                    checked={formData.pricingRequired}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, pricingRequired: checked as boolean })
                    }
                  />
                  <Label htmlFor="pricingRequired" className="cursor-pointer">
                    Pricing Required
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingItem(null);
                  setFormData({
                    categoryCode: '',
                    categoryName: '',
                    description: '',
                    salesProcessType: 'ORDER',
                    deliveryRelevant: false,
                    billingRelevant: false,
                    pricingRequired: false
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

