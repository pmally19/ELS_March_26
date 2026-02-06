import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PaymentApplicationItem {
  openItemId: number;
  invoiceNumber: string;
  originalAmount: number;
  outstandingAmount: number;
  dueDate: string;
  selected: boolean;
  appliedAmount: number;
}

export default function EnhancedPaymentApplication({ customerId, paymentId }: { customerId?: number; paymentId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<PaymentApplicationItem[]>([]);
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('');

  // Fetch open items for payment application
  const { data: openItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/ar/post-journal/payments/open-items', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await apiRequest(`/api/ar/post-journal/payments/open-items/${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch open items');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!customerId
  });

  // Apply payment to selected items
  const applyPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const openItemIds = selectedItems.filter(item => item.selected).map(item => item.openItemId);
      const amounts = selectedItems.filter(item => item.selected).map(item => item.appliedAmount);

      if (openItemIds.length === 0) {
        throw new Error('Please select at least one item to apply payment');
      }

      const response = await apiRequest('/api/ar/post-journal/payments/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          openItemIds,
          amounts
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply payment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Applied',
        description: `Successfully applied payment to ${data.results.filter((r: any) => r.success).length} AR open items`,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar'] });
      setSelectedItems([]);
      setTotalPaymentAmount('');
    },
    onError: (error: any) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to apply payment',
        variant: 'destructive'
      });
    }
  });

  // Initialize selected items when openItems load
  React.useEffect(() => {
    if (openItems && openItems.length > 0) {
      setSelectedItems(openItems.map((item: any) => ({
        openItemId: item.id,
        invoiceNumber: item.invoice_number || item.document_number,
        originalAmount: parseFloat(item.original_amount || 0),
        outstandingAmount: parseFloat(item.outstanding_amount || 0),
        dueDate: item.due_date,
        selected: false,
        appliedAmount: 0
      })));
    }
  }, [openItems]);

  const handleItemSelect = (index: number, selected: boolean) => {
    const updated = [...selectedItems];
    updated[index].selected = selected;
    if (!selected) {
      updated[index].appliedAmount = 0;
    } else {
      // Auto-fill with outstanding amount
      updated[index].appliedAmount = updated[index].outstandingAmount;
    }
    setSelectedItems(updated);
  };

  const handleAmountChange = (index: number, amount: string) => {
    const updated = [...selectedItems];
    updated[index].appliedAmount = parseFloat(amount) || 0;
    setSelectedItems(updated);
  };

  const totalSelected = selectedItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.appliedAmount, 0);

  const remainingPayment = parseFloat(totalPaymentAmount || '0') - totalSelected;

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading open items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Application</CardTitle>
          <CardDescription>
            Apply payment to specific AR open items. Select items and specify amounts to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="totalPayment">Total Payment Amount</Label>
            <Input
              id="totalPayment"
              type="number"
              step="0.01"
              value={totalPaymentAmount}
              onChange={(e) => setTotalPaymentAmount(e.target.value)}
              placeholder="Enter total payment amount"
            />
          </div>

          {totalPaymentAmount && (
            <Alert className={remainingPayment >= -0.01 ? 'bg-green-50' : 'bg-red-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>Total Selected: ${totalSelected.toFixed(2)}</span>
                  <span className={remainingPayment >= -0.01 ? 'text-green-600' : 'text-red-600'}>
                    Remaining: ${remainingPayment.toFixed(2)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {openItems && openItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Apply Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item, index) => (
                  <TableRow key={item.openItemId}>
                    <TableCell>
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => handleItemSelect(index, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                    <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      ${item.originalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.outstandingAmount > 0 ? 'default' : 'secondary'}>
                        ${item.outstandingAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.selected ? (item.appliedAmount > 0 ? item.appliedAmount.toString() : '') : ''}
                        onChange={(e) => handleAmountChange(index, e.target.value)}
                        disabled={!item.selected}
                        max={item.outstandingAmount}
                        className="text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No open items available for payment application</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedItems([]);
                setTotalPaymentAmount('');
              }}
            >
              Clear Selection
            </Button>
            <Button
              onClick={() => applyPaymentMutation.mutate()}
              disabled={applyPaymentMutation.isPending || selectedItems.filter(i => i.selected).length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {applyPaymentMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply Payment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

