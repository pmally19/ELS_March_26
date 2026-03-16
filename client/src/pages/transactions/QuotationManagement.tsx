import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShoppingCart, Plus, FileText, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface QuotationItem {
  id: number;
  materialId: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntilDate: string;
  items?: QuotationItem[];
}

interface Customer {
  id: number;
  name: string;
  code: string;
}

interface Material {
  id: number;
  code: string;
  name: string;
  description: string;
  base_uom: string;
  base_unit_price: number;
}

interface QuotationFormItem {
  materialId: number | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function QuotationManagement() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Quotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form State - No hardcoded values
  const [formData, setFormData] = useState({
    customerId: null as number | null,
    documentType: 'QT' as string,  // NEW: Default to Standard Quotation
    currency: 'USD',
    notes: '',
    items: [] as QuotationFormItem[],
    validUntilDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Fetch Customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/customer');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return await res.json() as Customer[];
    }
  });

  const customers = customersData || [];

  // Fetch Materials with normalization
  const { data: materialsRaw = [] } = useQuery({
    queryKey: ['/api/materials'],
    queryFn: async () => {
      const response = await fetch('/api/materials');
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      console.log('Materials API response:', data);
      return data;
    }
  });

  // Normalize materials data
  const materials = materialsRaw.map((m: any) => ({
    ...m,
    code: m.code || m.material_code,
    material_code: m.material_code || m.code,
    name: m.name || m.description || m.long_description,
    description: m.description || m.name || m.long_description,
    base_uom: m.base_uom || m.base_unit || 'EA',
    base_unit_price: parseFloat(m.base_unit_price || m.base_price || '0')
  }));
  console.log('✅ Normalized materials:', materials.length, 'items');

  // Fetch Document Types for quotations from master-data
  const { data: documentTypesRaw = [] } = useQuery({
    queryKey: ['/api/master-data/sd-document-types'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/sd-document-types');
      if (!response.ok) throw new Error('Failed to fetch document types');
      return response.json();
    }
  });

  // Filter only QUOTATION category document types
  const documentTypes = documentTypesRaw.filter((dt: any) => dt.category === 'QUOTATION');

  // Fetch Quotations
  const { data: quotationsData, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const res = await fetch('/api/quotations');
      if (!res.ok) throw new Error('Failed to fetch quotations');
      return res.json();
    }
  });

  const quotations = quotationsData?.data || [];

  // Create Quotation Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create quotation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setShowDialog(false);
      toast({
        title: 'Success',
        description: 'Quotation created successfully'
      });
      resetForm();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  // Convert toOrder mutation
  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to convert quotation');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast({
        title: 'Success',
        description: `Quotation converted to Sales Order: ${data.data.orderNumber}`
      });
    },
    onError: (err) => {
      toast({ title: 'Conversion Failed', description: err.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      customerId: null,
      documentType: 'QT',  // NEW: Reset to default
      currency: 'USD',
      notes: '',
      items: [],
      validUntilDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        materialId: null,
        description: '',
        quantity: 1,
        unit: 'PC',
        unitPrice: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof QuotationFormItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill material details when material is selected
    if (field === 'materialId' && value) {
      const material = materials.find(m => m.id === value);
      console.log('Selected material for auto-fill:', material);
      if (material) {
        newItems[index].description = material.description || material.name;
        newItems[index].unit = material.base_uom || 'PC';
        const basePrice = parseFloat(material.base_unit_price?.toString() || '0');
        newItems[index].unitPrice = isNaN(basePrice) ? 0 : basePrice;
        console.log('Auto-filled:', { description: newItems[index].description, unit: newItems[index].unit, price: newItems[index].unitPrice });
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CONVERTED': return 'bg-purple-100 text-purple-800';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customerId) {
      toast({ title: 'Validation Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }

    if (formData.items.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    // Validate all items have materials selected
    const invalidItems = formData.items.filter(item => !item.materialId);
    if (invalidItems.length > 0) {
      toast({ title: 'Validation Error', description: 'All items must have a material selected', variant: 'destructive' });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleEdit = (quotation: Quotation) => {
    setSelectedItem(quotation);
    setIsEditMode(true);
    setShowDialog(true);
    // TODO: Populate form with quotation data
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quotation Management</h1>
            <p className="text-muted-foreground">Manage sales quotations and convert to orders</p>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { setIsEditMode(false); setSelectedItem(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Quotation' : 'Create New Quotation'}</DialogTitle>
              <DialogDescription>
                Select customer and add items to create a quotation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={formData.customerId?.toString() || ''}
                    onValueChange={(value) => setFormData({ ...formData, customerId: parseInt(value) })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.code} - {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Type *</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type: any) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.code} - {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valid Until *</Label>
                  <Input
                    type="date"
                    value={formData.validUntilDate}
                    onChange={(e) => setFormData({ ...formData, validUntilDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                {formData.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No items added yet. Click "Add Item" to start.</p>
                )}

                {formData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Material *</Label>
                        <Select
                          value={item.materialId?.toString() || ''}
                          onValueChange={(value) => updateItem(index, 'materialId', parseInt(value))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((material: any) => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                {material.material_code} - {material.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          placeholder="Unit (e.g., PC, KG)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                    </div>

                    <div className="text-sm font-medium text-right">
                      Line Total: ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Internal notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Quotation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Quotations</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {quotations.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Quotes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {quotations.filter((q: Quotation) => ['DRAFT', 'SENT'].includes(q.status)).length}            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {quotations.filter((q: Quotation) => q.status === 'CONVERTED').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              $ {quotations.reduce((sum: number, q: Quotation) => sum + Number(q.totalAmount), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>
            Review and manage sales quotations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">Loading quotations...</TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No quotations found</TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation: Quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.customerName || 'Unknown Customer'}</TableCell>
                    <TableCell>{new Date().toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(quotation.validUntilDate).toLocaleDateString()}</TableCell>
                    <TableCell>$ {Number(quotation.totalAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quotation.status)}>
                        {quotation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {quotation.status !== 'CONVERTED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Convert to Order"
                            onClick={() => {
                              if (confirm('Are you sure you want to convert this quotation to a Sales Order?')) {
                                convertMutation.mutate(quotation.id);
                              }
                            }}
                          >
                            <ShoppingCart className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quotation)}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}