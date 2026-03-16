import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Calculator } from "lucide-react";

interface QuoteItem {
  id?: number;
  product_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteFormData {
  customer_name: string;
  customer_id?: number;
  total_amount: number;
  currency: string;
  valid_until: string;
  status: string;
  notes: string;
  items: QuoteItem[];
}

interface ComprehensiveQuoteCreationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ComprehensiveQuoteCreation({ onSuccess, onCancel }: ComprehensiveQuoteCreationProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    customer_name: "",
    customer_id: undefined,
    total_amount: 0,
    currency: "USD",
    valid_until: "",
    status: "draft",
    notes: "",
    items: []
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const queryClient = useQueryClient();

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!formData.customer_name.trim()) {
      errors.customer_name = "Customer name is required";
    }

    if (formData.total_amount <= 0) {
      errors.total_amount = "Total amount must be greater than 0";
    }

    if (!formData.valid_until) {
      errors.valid_until = "Valid until date is required";
    } else {
      const validDate = new Date(formData.valid_until);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (validDate < today) {
        errors.valid_until = "Valid until date must be in the future";
      }
    }

    if (formData.items.length === 0) {
      errors.items = "At least one item is required";
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      if (!item.description.trim()) {
        errors[`item_${index}_description`] = "Item description is required";
      }
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }
      if (item.unit_price <= 0) {
        errors[`item_${index}_unit_price`] = "Unit price must be greater than 0";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add item to quote
  const addItem = () => {
    const newItem: QuoteItem = {
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove item from quote
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    calculateTotal();
  };

  // Update item data
  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };

      // Calculate item total
      if (field === 'quantity' || field === 'unit_price') {
        updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unit_price;
      }

      return {
        ...prev,
        items: updatedItems
      };
    });

    // Recalculate total after item update
    setTimeout(calculateTotal, 100);
  };

  // Calculate total amount
  const calculateTotal = () => {
    setIsCalculating(true);
    const total = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      total_amount: total
    }));

    setTimeout(() => setIsCalculating(false), 500);
  };

  // Quote creation mutation (Fixed 404 error)
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: QuoteFormData) => {
      const response = await fetch('/api/sales-fix/quotes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quote');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote Created Successfully",
        description: `Quote ${data.quote_number} has been created`,
      });
      
      // Invalidate quotes cache
      queryClient.invalidateQueries({ queryKey: ['/api/sales/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-fix/refresh/quotes'] });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Quote Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      });
      return;
    }

    createQuoteMutation.mutate(formData);
  };

  const getFieldError = (field: string) => validationErrors[field];
  const hasFieldError = (field: string) => !!validationErrors[field];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create New Quote</h2>
        <Badge variant="outline">Quote Creation</Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer_name" className="required">
                Customer Name *
              </Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Enter customer name"
                className={hasFieldError('customer_name') ? 'border-red-500' : ''}
                required
              />
              {hasFieldError('customer_name') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('customer_name')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quote Details */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="valid_until" className="required">
                Valid Until *
              </Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className={hasFieldError('valid_until') ? 'border-red-500' : ''}
                required
              />
              {hasFieldError('valid_until') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('valid_until')}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quote Items</CardTitle>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items added yet. Click "Add Item" to start building your quote.</p>
                {hasFieldError('items') && (
                  <p className="text-sm text-red-600 mt-2">{getFieldError('items')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor={`item_${index}_description`} className="required">
                          Description *
                        </Label>
                        <Input
                          id={`item_${index}_description`}
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className={hasFieldError(`item_${index}_description`) ? 'border-red-500' : ''}
                          required
                        />
                        {hasFieldError(`item_${index}_description`) && (
                          <p className="text-sm text-red-600 mt-1">{getFieldError(`item_${index}_description`)}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`item_${index}_quantity`} className="required">
                          Quantity *
                        </Label>
                        <Input
                          id={`item_${index}_quantity`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={hasFieldError(`item_${index}_quantity`) ? 'border-red-500' : ''}
                          required
                        />
                        {hasFieldError(`item_${index}_quantity`) && (
                          <p className="text-sm text-red-600 mt-1">{getFieldError(`item_${index}_quantity`)}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`item_${index}_unit_price`} className="required">
                          Unit Price *
                        </Label>
                        <Input
                          id={`item_${index}_unit_price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className={hasFieldError(`item_${index}_unit_price`) ? 'border-red-500' : ''}
                          required
                        />
                        {hasFieldError(`item_${index}_unit_price`) && (
                          <p className="text-sm text-red-600 mt-1">{getFieldError(`item_${index}_unit_price`)}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Label>Item Total: ${item.total?.toFixed(2) || '0.00'}</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Quote Total:</span>
              <div className="flex items-center gap-2">
                {isCalculating && <Calculator className="h-4 w-4 animate-spin" />}
                <span>${formData.total_amount.toFixed(2)} {formData.currency}</span>
              </div>
            </div>
            {hasFieldError('total_amount') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('total_amount')}</p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createQuoteMutation.isPending}
            className="min-w-[120px]"
          >
            {createQuoteMutation.isPending ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Quote
              </>
            )}
          </Button>
        </div>
      </form>

      <style dangerouslySetInnerHTML={{
        __html: `
          .required::after {
            content: ' *';
            color: #ef4444;
          }
        `
      }} />
    </div>
  );
}