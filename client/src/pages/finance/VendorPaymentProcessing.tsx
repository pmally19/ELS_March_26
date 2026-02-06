import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Plus, CreditCard, DollarSign, FileText, CheckCircle, AlertTriangle, Building, Calendar, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface VendorPayment {
  id: number;
  payment_number: string;
  payment_amount: number;
  payment_method: string;
  payment_date: string;
  value_date?: string;
  status: string;
  reference?: string;
  accounting_document_number?: string;
  currency: string;
  notes?: string;
  vendor_name?: string;
  vendor_code?: string;
  order_number?: string;
  po_amount?: number;
  bank_account_name?: string;
  bank_account_number?: string;
  invoice_number?: string;
  invoice_amount?: number;
  invoice_id?: number;
  created_at: string;
}

interface AccountsPayableInvoice {
  id: number;
  invoice_number: string;
  vendor_id: number;
  vendor_name?: string;
  amount: number;
  net_amount: number;
  status: string;
  invoice_date: string;
  due_date: string;
  purchase_order_id?: number;
  order_number?: string;
}

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  current_balance: number;
  available_balance: number;
  is_active: boolean;
}

export default function VendorPaymentProcessing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<(AccountsPayableInvoice & { payment_id?: number }) | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  // Batch execution state
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch accounts payable invoices (unpaid)
  const { data: apInvoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['/api/finance/ap/invoices'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance/accounts-payable');
        if (!response.ok) throw new Error('Failed to fetch AP invoices');
        const data = await response.json();
        // Filter for unpaid invoices
        const invoices = (Array.isArray(data) ? data : data.data || []) as AccountsPayableInvoice[];
        return invoices.filter(inv =>
          inv.status === 'Open' ||
          inv.status === 'open' ||
          inv.status === 'OPEN' ||
          inv.status === 'Partial' ||
          inv.status === 'partial'
        );
      } catch (error) {
        // Fallback: try alternative endpoint
        const response = await fetch('/api/purchase/vendor-payments');
        if (response.ok) {
          return [];
        }
        throw error;
      }
    },
  });

  // Fetch vendor payments
  const { data: vendorPayments, isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['/api/purchase/vendor-payments'],
    queryFn: async () => {
      const response = await fetch('/api/purchase/vendor-payments');
      if (!response.ok) throw new Error('Failed to fetch vendor payments');
      const data = await response.json();
      if (Array.isArray(data)) {
        return data as VendorPayment[];
      }
      return (data.data || []) as VendorPayment[];
    },
  });

  // Fetch authorized payments (PENDING status) that need execution
  const { data: authorizedPayments = [] } = useQuery({
    queryKey: ['/api/ap/authorized-payments'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ap/authorized-payments');
        if (!response.ok) return [];
        const data = await response.json();
        return (data.data || data || []) as VendorPayment[];
      } catch {
        return [];
      }
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts, isLoading: isLoadingBanks } = useQuery({
    queryKey: ['/api/finance/bank-accounts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance/bank-accounts?is_active=true');
        if (!response.ok) throw new Error('Failed to fetch bank accounts');
        const data = await response.json();
        return (data.data || data || []) as BankAccount[];
      } catch (error) {
        // Fallback: try alternative endpoint
        const response = await fetch('/api/purchase/vendor-payments/create-sample-bank', { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          return data.bankAccount ? [data.bankAccount] : [];
        }
        return [];
      }
    },
  });

  // Create vendor payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      purchaseOrderId?: number;
      invoiceId?: number;
      vendorId?: number;
      paymentAmount: number;
      paymentMethod: string;
      paymentDate: string;
      valueDate?: string;
      bankAccountId: number;
      reference?: string;
      currency?: string;
      notes?: string;
      companyCodeId?: number;
    }) => {
      // Try to create payment - support both PO-based and invoice-based payments
      if (paymentData.purchaseOrderId) {
        // Payment from Purchase Order
        const response = await fetch('/api/purchase/vendor-payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purchaseOrderId: paymentData.purchaseOrderId,
            paymentAmount: paymentData.paymentAmount,
            paymentMethod: paymentData.paymentMethod,
            paymentDate: paymentData.paymentDate,
            valueDate: paymentData.valueDate,
            bankAccountId: paymentData.bankAccountId,
            reference: paymentData.reference,
            currency: paymentData.currency || 'USD',
            notes: paymentData.notes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || error.message || 'Failed to create payment');
        }

        return response.json();
      } else if (paymentData.invoiceId) {
        // Check if there's an authorized payment (PENDING) for this invoice
        // Note: authorizedPayments is not available in mutationFn scope, so we'll check in handleCreatePayment

        // Create new payment directly from invoice (without PO) - use the payment authorization endpoint logic
        const response = await fetch('/api/ap/create-payment-from-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoice_id: paymentData.invoiceId,
            vendor_id: paymentData.vendorId,
            payment_amount: paymentData.paymentAmount,
            payment_method: paymentData.paymentMethod,
            payment_date: paymentData.paymentDate,
            value_date: paymentData.valueDate,
            bank_account_id: paymentData.bankAccountId,
            reference: paymentData.reference,
            currency: paymentData.currency || 'USD',
            notes: paymentData.notes,
            company_code_id: paymentData.companyCodeId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || error.message || 'Failed to create payment');
        }

        return response.json();
      } else {
        throw new Error('Either purchaseOrderId or invoiceId must be provided');
      }
    },
    onSuccess: (data) => {
      const paymentNum = data.paymentNumber || data.payment?.payment_number || 'N/A';
      const docNum = data.accountingDocumentNumber || data.payment?.accounting_document_number;
      toast({
        title: 'Payment Created',
        description: `Payment ${paymentNum} created successfully.${docNum ? ` Accounting Document: ${docNum}` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/ap/invoices'] });
      setShowPaymentDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to create vendor payment',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentMethod('BANK_TRANSFER');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setValueDate(new Date().toISOString().split('T')[0]);
    setBankAccountId(null);
    setReference('');
    setNotes('');
  };

  // Toggle selection for a single payment
  const toggleSelection = (paymentId: number) => {
    const newSelection = new Set(selectedPayments);
    if (newSelection.has(paymentId)) {
      newSelection.delete(paymentId);
    } else {
      newSelection.add(paymentId);
    }
    setSelectedPayments(newSelection);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedPayments.size === authorizedPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(authorizedPayments.map((p: any) => p.id)));
    }
  };

  // Batch execution mutation
  const batchExecuteMutation = useMutation({
    mutationFn: async (data: {
      paymentIds: number[];
      bankAccountId: number;
      paymentDate: string;
      valueDate?: string;
      reference?: string;
      notes?: string;
    }) => {
      const response = await fetch('/api/ap/batch-execute-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_ids: data.paymentIds,
          bank_account_id: data.bankAccountId,
          payment_date: data.paymentDate,
          value_date: data.valueDate,
          reference: data.reference,
          notes: data.notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to execute batch payments');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Batch Execution Successful',
        description: data.message || `Successfully executed ${data.results?.length} payments.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/authorized-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/bank-accounts'] });
      setShowBatchDialog(false);
      setSelectedPayments(new Set());
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Batch Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleBatchExecute = () => {
    if (!bankAccountId) {
      toast({
        title: 'No Bank Account Selected',
        description: 'Please select a bank account for the batch payment',
        variant: 'destructive',
      });
      return;
    }

    batchExecuteMutation.mutate({
      paymentIds: Array.from(selectedPayments),
      bankAccountId: bankAccountId,
      paymentDate: paymentDate,
      valueDate: valueDate || paymentDate,
      reference: reference,
      notes: notes
    });
  };

  const handleSelectInvoice = (invoice: AccountsPayableInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.net_amount.toString());
    setShowPaymentDialog(true);

    // Auto-select first bank account if available
    if (bankAccounts && bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDING': { label: 'Pending', variant: 'outline' },
      'PROCESSED': { label: 'Processed', variant: 'secondary' },
      'POSTED': { label: 'Posted', variant: 'default' },
      'CANCELLED': { label: 'Cancelled', variant: 'destructive' },
      'Open': { label: 'Open', variant: 'outline' },
      'open': { label: 'Open', variant: 'outline' },
      'OPEN': { label: 'Open', variant: 'outline' },
      'Paid': { label: 'Paid', variant: 'default' },
      'paid': { label: 'Paid', variant: 'default' },
      'Partial': { label: 'Partial', variant: 'secondary' },
      'partial': { label: 'Partial', variant: 'secondary' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      'CHECK': 'Check',
      'BANK_TRANSFER': 'Bank Transfer',
      'ONLINE_TRANSFER': 'Online Transfer',
      'WIRE_TRANSFER': 'Wire Transfer',
    };
    return methodMap[method] || method;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleCreatePayment = () => {
    if (!selectedInvoice) {
      toast({
        title: 'No Invoice Selected',
        description: 'Please select an invoice to create a payment',
        variant: 'destructive',
      });
      return;
    }

    if (!bankAccountId) {
      toast({
        title: 'No Bank Account Selected',
        description: 'Please select a bank account for the payment',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Payment Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    // If this is executing an authorized payment (has payment_id), use execute endpoint
    if (selectedInvoice.payment_id) {
      fetch('/api/ap/execute-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: selectedInvoice.payment_id,
          bank_account_id: bankAccountId,
          payment_date: paymentDate,
          value_date: valueDate || paymentDate,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to execute payment');
          }
          return response.json();
        })
        .then((data) => {
          toast({
            title: 'Payment Executed',
            description: `Payment ${data.payment?.payment_number || 'N/A'} executed successfully.`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ap/authorized-payments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/finance/accounts-payable'] });
          setShowPaymentDialog(false);
          resetForm();
        })
        .catch((error: Error) => {
          toast({
            title: 'Payment Execution Failed',
            description: error.message || 'Failed to execute payment',
            variant: 'destructive',
          });
        });
      return;
    }

    createPaymentMutation.mutate({
      purchaseOrderId: selectedInvoice.purchase_order_id || undefined,
      invoiceId: selectedInvoice.id,
      paymentAmount: amount,
      paymentMethod: paymentMethod,
      paymentDate: paymentDate,
      valueDate: valueDate || paymentDate,
      bankAccountId: bankAccountId,
      reference: reference || undefined,
      currency: 'USD',
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Payment Processing</h2>
          <p className="text-sm text-muted-foreground">Process payments for vendor invoices and purchase orders</p>
        </div>
        <div className="flex gap-2">
          {selectedPayments.size > 0 && (
            <Button
              onClick={() => {
                // Set default bank account if available
                if (bankAccounts && bankAccounts.length > 0 && !bankAccountId) {
                  setBankAccountId(bankAccounts[0].id);
                }
                setShowBatchDialog(true);
              }}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Execute Selected ({selectedPayments.size})
            </Button>
          )}
          <Button
            onClick={() => {
              refetchInvoices();
              refetchPayments();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="invoices">Unpaid Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          {/* Authorized Payments Section */}
          {authorizedPayments && authorizedPayments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-900">Authorized Payments (Awaiting Execution)</CardTitle>
                <CardDescription>Payments authorized but not yet executed. Select multiple to execute in batch.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedPayments.size === authorizedPayments.length && authorizedPayments.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPayments.has(payment.id)}
                            onCheckedChange={() => toggleSelection(payment.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{payment.payment_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.vendor_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{payment.vendor_code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{payment.invoice_number || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(payment.payment_amount, payment.currency)}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-yellow-100">Authorized</Badge></TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Find the invoice for this payment
                              const invoice = apInvoices?.find((inv: any) => inv.id === payment.invoice_id);
                              if (invoice) {
                                setSelectedInvoice({ ...invoice, payment_id: payment.id });
                                setPaymentAmount(payment.payment_amount.toString());
                                setShowPaymentDialog(true);
                              } else {
                                // Even if invoice not found in open list (might be partial), allows execution
                                setSelectedInvoice({
                                  id: payment.invoice_id,
                                  payment_id: payment.id,
                                  invoice_number: payment.invoice_number,
                                  vendor_id: payment.vendor_id,
                                  vendor_name: payment.vendor_name,
                                  amount: payment.payment_amount,
                                  net_amount: payment.payment_amount,
                                  status: 'Authorized',
                                  invoice_date: new Date().toISOString(),
                                  due_date: new Date().toISOString()
                                } as any);
                                setPaymentAmount(payment.payment_amount.toString());
                                setShowPaymentDialog(true);
                              }
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All executed vendor payments (POSTED/PROCESSED status)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="text-center py-8">Loading payments...</div>
              ) : vendorPayments && vendorPayments.filter((p: VendorPayment) => p.status === 'POSTED' || p.status === 'PROCESSED').length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice/PO</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Accounting Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorPayments.filter((p: VendorPayment) => p.status === 'POSTED' || p.status === 'PROCESSED').map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.payment_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.vendor_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{payment.vendor_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-mono text-sm">{payment.invoice_number || payment.order_number || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(payment.payment_amount, payment.currency)}</TableCell>
                        <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="font-mono">{payment.accounting_document_number || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Invoices</CardTitle>
              <CardDescription>Select an invoice to create a payment</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="text-center py-8">Loading invoices...</div>
              ) : apInvoices && apInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.vendor_name || `Vendor ${invoice.vendor_id}`}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{formatCurrency(invoice.net_amount)}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleSelectInvoice(invoice)}
                            size="sm"
                            variant="outline"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Create Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="mb-2">No unpaid invoices found</p>
                  <p className="text-sm">
                    Note: Payments can be created from Purchase Orders in the Purchase section.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Execution Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Batch Payments</DialogTitle>
            <DialogDescription>
              Execute {selectedPayments.size} selected payments. Calculate totals and assign bank account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between font-medium">
                <span>Total Payments:</span>
                <span>{selectedPayments.size}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-1 text-blue-800">
                <span>Total Amount:</span>
                <span>
                  {formatCurrency(
                    authorizedPayments
                      .filter((p: any) => selectedPayments.has(p.id))
                      .reduce((sum: number, p: any) => sum + Number(p.payment_amount), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchBankAccount">Bank Account *</Label>
              {isLoadingBanks ? (
                <div className="text-sm text-muted-foreground">Loading bank accounts...</div>
              ) : bankAccounts && bankAccounts.length > 0 ? (
                <Select
                  value={bankAccountId?.toString() || ''}
                  onValueChange={(value) => setBankAccountId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id.toString()}>
                        {bank.account_name} ({bank.account_number}) - {formatCurrency(bank.available_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-red-500">No bank accounts available</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchPaymentDate">Payment Date *</Label>
                <Input
                  id="batchPaymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchValueDate">Value Date</Label>
                <Input
                  id="batchValueDate"
                  type="date"
                  value={valueDate}
                  onChange={(e) => setValueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchReference">Reference (Optional)</Label>
              <Input
                id="batchReference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Batch reference"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDialog(false)}
              disabled={batchExecuteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchExecute}
              disabled={batchExecuteMutation.isPending || !bankAccountId}
              className="bg-green-600 hover:bg-green-700"
            >
              {batchExecuteMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Execution
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Create Single Payment Dialog (Existing) */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Vendor Payment</DialogTitle>
            <DialogDescription>
              Process payment for Invoice: {selectedInvoice?.invoice_number}
              {selectedInvoice?.order_number && ` (PO: ${selectedInvoice.order_number})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invoice Info */}
            {selectedInvoice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Invoice Number</Label>
                      <div className="font-mono font-medium">{selectedInvoice.invoice_number}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Vendor</Label>
                      <div className="font-medium">{selectedInvoice.vendor_name || `Vendor ${selectedInvoice.vendor_id}`}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Invoice Amount</Label>
                      <div className="font-medium">{formatCurrency(selectedInvoice.amount)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Net Amount</Label>
                      <div className="font-medium">{formatCurrency(selectedInvoice.net_amount)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Due Date</Label>
                      <div>{new Date(selectedInvoice.due_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(selectedInvoice.status)}</div>
                    </div>
                  </div>
                  {!selectedInvoice.purchase_order_id && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        This invoice is not linked to a Purchase Order. Payment will be created directly from the invoice.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="ONLINE_TRANSFER">Online Transfer</SelectItem>
                      <SelectItem value="WIRE_TRANSFER">Wire Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valueDate">Value Date</Label>
                  <Input
                    id="valueDate"
                    type="date"
                    value={valueDate}
                    onChange={(e) => setValueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bank Account *</Label>
                {isLoadingBanks ? (
                  <div className="text-sm text-muted-foreground">Loading bank accounts...</div>
                ) : bankAccounts && bankAccounts.length > 0 ? (
                  <Select
                    value={bankAccountId?.toString() || ''}
                    onValueChange={(value) => setBankAccountId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id.toString()}>
                          {bank.account_name} ({bank.account_number}) - {formatCurrency(bank.available_balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      No active bank accounts found. Creating a sample bank account...
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/purchase/vendor-payments/create-sample-bank', {
                            method: 'POST',
                          });
                          if (response.ok) {
                            const data = await response.json();
                            toast({
                              title: 'Bank Account Created',
                              description: 'Sample bank account created successfully',
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/finance/bank-accounts'] });
                            if (data.bankAccount) {
                              setBankAccountId(data.bankAccount.id);
                            }
                          }
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to create bank account',
                            variant: 'destructive',
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Create Sample Bank Account
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Check number, transfer reference, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or remarks"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                resetForm();
              }}
              disabled={createPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending || !bankAccountId || !paymentAmount || !selectedInvoice}
            >
              {createPaymentMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Create Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

