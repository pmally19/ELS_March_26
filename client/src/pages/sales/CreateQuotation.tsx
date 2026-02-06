import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Send, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface QuotationItem {
    material_id: number | null;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    item_category_id: number | null;
    line_total: number;
}

interface QuotationText {
    text_type_id: number;
    text_content: string;
    item_id?: number;
}

export default function CreateQuotation() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    // Form state
    const [formData, setFormData] = useState({
        customer_id: null as number | null,
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until_date: '',
        currency: 'USD',
        notes: ''
    });

    const [items, setItems] = useState<QuotationItem[]>([{
        material_id: null,
        description: '',
        quantity: 1,
        unit: 'EA',
        unit_price: 0,
        item_category_id: null,
        line_total: 0
    }]);

    const [customer, setCustomer] = useState('');
    const [documentType, setDocumentType] = useState('QT'); // Default to Standard Quotation
    const [validUntil, setValidUntil] = useState<Date>();
    const [headerText, setHeaderText] = useState('');
    const [headerTextEnabled, setHeaderTextEnabled] = useState(false);
    const [itemTexts, setItemTexts] = useState<{ [key: number]: string }>({});

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['/api/customers'],
        queryFn: async () => {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');
            return response.json();
        }
    });

    // Fetch materials
    const { data: materialsRaw = [], isLoading: materialsLoading } = useQuery({
        queryKey: ['/api/materials'],
        queryFn: async () => {
            const response = await fetch('/api/materials');
            if (!response.ok) throw new Error('Failed to fetch materials');
            const data = await response.json();
            console.log('Materials API response:', data);
            return Array.isArray(data) ? data : (data.data || []);
        }
    });

    // Normalize materials data to ensure consistent field names
    const materials = materialsRaw.map((m: any) => ({
        ...m,
        material_code: m.material_code || m.code,
        description: m.description || m.name || m.long_description,
        base_price: m.base_price || m.base_unit_price || '0',
        base_unit: m.base_unit || m.base_uom || 'EA'
    }));

    console.log('✅ Normalized materials:', materials.length, 'items');
    if (materials.length > 0) {
        console.log('First material:', materials[0]);
    }

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

    // Fetch item categories (for quotations)
    const { data: itemCategories = [] } = useQuery({
        queryKey: ['/api/sales/item-categories', 'quotation'],
        queryFn: async () => {
            const response = await fetch('/api/sales/item-categories?type=quotation');
            if (!response.ok) throw new Error('Failed to fetch item categories');
            return response.json();
        }
    });

    // Fetch text types
    const { data: textTypes = [] } = useQuery({
        queryKey: ['/api/sales/text-types'],
        queryFn: async () => {
            const response = await fetch('/api/sales/config/text-types');
            if (!response.ok) {
                // Fallback
                return [
                    { id: 1, text_type_code: 'ZAB1', description: 'Customer Additional Information', text_level: 'HEADER' },
                    { id: 2, text_type_code: 'ZIA1', description: 'Item Additional Information', text_level: 'ITEM' }
                ];
            }
            return response.json();
        }
    });

    // Create quotation mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/sales/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create quotation');
            return response.json();
        },
        onSuccess: async (data) => {
            const quotationId = data.data.id;

            // Save texts if any
            const texts: QuotationText[] = [];

            // Add header text
            if (headerTextEnabled && headerText.trim()) {
                const headerTextType = textTypes.find(tt => tt.text_level === 'HEADER');
                if (headerTextType) {
                    texts.push({
                        text_type_id: headerTextType.id,
                        text_content: headerText
                    });
                }
            }

            // Add item texts
            Object.entries(itemTexts).forEach(([index, text]) => {
                if (text.trim()) {
                    const itemTextType = textTypes.find(tt => tt.text_level === 'ITEM');
                    if (itemTextType) {
                        texts.push({
                            text_type_id: itemTextType.id,
                            text_content: text,
                            item_id: parseInt(index) + 1 // Line number (1-indexed)
                        });
                    }
                }
            });

            // Save texts
            if (texts.length > 0) {
                await fetch(`/api/sales/quotations/${quotationId}/texts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ texts })
                });
            }

            toast({
                title: 'Success',
                description: 'Quotation created successfully'
            });
            setLocation('/sales/quotations');
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create quotation',
                variant: 'destructive'
            });
        }
    });

    // Add item row
    const addItem = () => {
        setItems([...items, {
            material_id: null,
            description: '',
            quantity: 1,
            unit: 'EA',
            unit_price: 0,
            item_category_id: null,
            line_total: 0
        }]);
    };

    // Remove item row
    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
            // Remove item text
            const newItemTexts = { ...itemTexts };
            delete newItemTexts[index];
            setItemTexts(newItemTexts);
        }
    };

    // Update item
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate line total
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].line_total = newItems[index].quantity * newItems[index].unit_price;
        }

        // Auto-fill description, unit, and price from material
        if (field === 'material_id' && value) {
            const material = materials.find((m: any) => m.id === parseInt(value));
            console.log('Selected material for auto-fill:', material);
            if (material) {
                // Use normalized fields from materials array
                newItems[index].description = material.description;
                newItems[index].unit = material.base_unit;
                // Auto-fill base price - convert string to number
                const basePrice = parseFloat(material.base_price);
                newItems[index].unit_price = isNaN(basePrice) ? 0 : basePrice;
                // Recalculate line total with new price
                newItems[index].line_total = newItems[index].quantity * newItems[index].unit_price;
            }
        }

        setItems(newItems);
    };

    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

    // Handle submit
    const handleSubmit = async () => {
        // Validation
        if (!customer) {
            toast({
                title: 'Validation Error',
                description: 'Please select a customer',
                variant: 'destructive'
            });
            return;
        }

        if (!validUntil) {
            toast({
                title: 'Validation Error',
                description: 'Please select a valid until date',
                variant: 'destructive'
            });
            return;
        }

        if (items.length === 0 || !items.some(item => item.material_id)) {
            toast({
                title: 'Validation Error',
                description: 'Please add at least one item',
                variant: 'destructive'
            });
            return;
        }

        // Prepare data
        const quotationData = {
            customerId: parseInt(customer),
            documentType: documentType,
            quotationDate: new Date(formData.quotation_date),
            validUntilDate: validUntil,
            currency: formData.currency,
            notes: formData.notes,
            items: items
                .filter(item => item.material_id)
                .map(item => ({
                    materialId: item.material_id,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unit_price
                }))
        };

        createMutation.mutate(quotationData);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation('/sales/quotations')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Create Quotation</h1>
                        <p className="text-gray-500 mt-1">Enter quotation details and items</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setLocation('/sales/quotations')}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {createMutation.isPending ? 'Creating...' : 'Create Quotation'}
                    </Button>
                </div>
            </div>

            {/* Main Form */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Quotation Header</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer">Customer *</Label>
                                <Select value={customer} onValueChange={setCustomer}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((cust: any) => (
                                            <SelectItem key={cust.id} value={cust.id.toString()}>
                                                {cust.customer_code} - {cust.customer_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="documentType">Document Type *</Label>
                                <Select value={documentType} onValueChange={setDocumentType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
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
                        </div>

                        {/* Quotation Date */}
                        <div>
                            <Label htmlFor="quotation_date">Quotation Date</Label>
                            <Input
                                type="date"
                                value={formData.quotation_date}
                                onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                            />
                        </div>

                        {/* Valid Until */}
                        <div>
                            <Label htmlFor="valid_until">Valid Until *</Label>
                            <Input
                                type="date"
                                value={formData.valid_until_date}
                                onChange={(e) => setFormData({ ...formData, valid_until_date: e.target.value })}
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <Label htmlFor="currency">Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="INR">INR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    <Button size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material *</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Qty *</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Unit Price *</TableHead>
                                <TableHead>Item Category</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="w-48">
                                        <Select
                                            value={item.material_id?.toString() || ''}
                                            onValueChange={(value) => updateItem(index, 'material_id', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select material" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {materialsLoading ? (
                                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                                ) : materials.length === 0 ? (
                                                    <SelectItem value="empty" disabled>No materials</SelectItem>
                                                ) : (
                                                    materials.map((material: any) => (
                                                        <SelectItem key={material.id} value={material.id.toString()}>
                                                            {material.material_code} - {material.description}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            placeholder="Description"
                                        />
                                    </TableCell>
                                    <TableCell className="w-24">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell className="w-24">
                                        <Input
                                            value={item.unit}
                                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="w-32">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell className="w-48">
                                        <Select
                                            value={item.item_category_id?.toString() || ''}
                                            onValueChange={(value) => updateItem(index, 'item_category_id', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {itemCategories.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                                        {cat.code} - {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${item.line_total.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end mt-4 pt-4 border-t">
                        <div className="text-right">
                            <span className="text-lg font-semibold">Total: </span>
                            <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Text Management Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="header">
                        <TabsList>
                            <TabsTrigger value="header">Header Text</TabsTrigger>
                            <TabsTrigger value="items">Item Texts</TabsTrigger>
                        </TabsList>

                        {/* Header Text */}
                        <TabsContent value="header">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="enable-header-text"
                                        checked={headerTextEnabled}
                                        onChange={(e) => setHeaderTextEnabled(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="enable-header-text">
                                        Add Customer Additional Information (ZAB1)
                                    </Label>
                                </div>
                                {headerTextEnabled && (
                                    <Textarea
                                        value={headerText}
                                        onChange={(e) => setHeaderText(e.target.value)}
                                        placeholder="Enter additional customer information..."
                                        rows={6}
                                    />
                                )}
                            </div>
                        </TabsContent>

                        {/* Item Texts */}
                        <TabsContent value="items">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Add additional information for specific line items (ZIA1):
                                </p>
                                {items.map((item, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <Label className="mb-2 block">
                                            Line {index + 1}: {item.description || 'No description'}
                                        </Label>
                                        <Textarea
                                            value={itemTexts[index] || ''}
                                            onChange={(e) => setItemTexts({ ...itemTexts, [index]: e.target.value })}
                                            placeholder="Enter item-specific additional information..."
                                            rows={3}
                                        />
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
