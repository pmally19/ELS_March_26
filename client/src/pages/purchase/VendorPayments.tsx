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
import { ArrowLeft, RefreshCw, Plus, CreditCard, DollarSign, FileText, CheckCircle, AlertTriangle, Building, Calendar } from 'lucide-react';
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
  created_at: string;
}

interface PurchaseOrder {
  id: number;
  order_number?: string;
  orderNumber?: string;
  vendor_id?: number;
  vendorId?: number;
  vendor_name?: string;
  vendorName?: string;
  total_amount?: number;
  totalAmount?: number;
  status: string;
  order_date?: string;
  orderDate?: string;
  company_code_id?: number;
  companyCodeId?: number;
}

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  current_balance: number;
  available_balance: number;
  is_active: boolean;
  gl_account_id?: number;
  gl_account_number?: string;
  gl_account_name?: string;
}

interface GLAccountInfo {
  apAccount?: {
    id: number;
    account_number: string;
    account_name: string;
    account_type: string;
  };
  bankAccount?: {
    id: number;
    account_number: string;
    account_name: string;
    account_type: string;
  };
}

interface PaymentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  glAccounts?: GLAccountInfo;
}

export default function VendorPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('purchase-orders'); // Default to showing POs
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [validationInfo, setValidationInfo] = useState<PaymentValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [glAccountInfo, setGlAccountInfo] = useState<GLAccountInfo | null>(null);

  // Fetch purchase orders that need payment
  const { data: purchaseOrders, isLoading: isLoadingPOs, refetch: refetchPOs } = useQuery({
    queryKey: ['/api/purchase/orders'],
    queryFn: async () => {
      const response = await fetch('/api/purchase/orders');
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
   
      const orders = (data.data || data || []) as PurchaseOrder[];
      const excludedStatuses = ['CANCELLED', 'cancelled', 'PAID', 'paid', 'VOID', 'void'];
      return orders.filter(po => {
        const status = (po.status || '').toUpperCase();
        // Include if status is eligible for payment
        const isEligible = 
          status === 'OPEN' || 
          status === 'PARTIALLY_RECEIVED' ||
          status === 'RECEIVED' ||
          status === 'CLOSED' ||
          status === 'APPROVED';
        // Exclude if status indicates already paid or cancelled
        const isExcluded = excludedStatuses.includes(status);
        return isEligible && !isExcluded && po.total_amount > 0;
      });
    },
  });

  // Fetch vendor payments
  const { data: vendorPayments, isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['/api/purchase/vendor-payments'],
    queryFn: async () => {
      const response = await fetch('/api/purchase/vendor-payments');
      if (!response.ok) throw new Error('Failed to fetch vendor payments');
      const data = await response.json();
      // Handle both array and object with data property
      if (Array.isArray(data)) {
        return data as VendorPayment[];
      }
      return (data.data || []) as VendorPayment[];
    },
  });

  // Fetch bank accounts with GL account info
  const { data: bankAccounts, isLoading: isLoadingBanks } = useQuery({
    queryKey: ['/api/finance/bank-accounts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance/bank-accounts?is_active=true');
        if (!response.ok) throw new Error('Failed to fetch bank accounts');
        const data = await response.json();
        const accounts = (data.data || data || []) as BankAccount[];
        
        // Also fetch GL account info for bank accounts
        const accountsWithGL = await Promise.all(accounts.map(async (account) => {
          try {
            // Try to get GL account info from the bank account
            const glResponse = await fetch(`/api/finance/bank-accounts/${account.id}`);
            if (glResponse.ok) {
              const glData = await glResponse.json();
              return {
                ...account,
                gl_account_id: glData.gl_account_id,
                gl_account_number: glData.gl_account_number,
                gl_account_name: glData.gl_account_name,
              };
            }
          } catch (error) {
            // Ignore errors, just return account without GL info
          }
          return account;
        }));
        
        return accountsWithGL;
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

  // Validate payment when bank account or amount changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedPO && bankAccountId && paymentAmount && parseFloat(paymentAmount) > 0) {
        validatePayment();
      } else {
        setValidationInfo(null);
        setGlAccountInfo(null);
      }
    }, 500); // Debounce validation

    return () => clearTimeout(timeoutId);
  }, [selectedPO?.id, bankAccountId, paymentAmount, paymentMethod]);

  // Validate payment function
  const validatePayment = async () => {
    if (!selectedPO || !bankAccountId || !paymentAmount) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/purchase/vendor-payments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          paymentAmount: parseFloat(paymentAmount),
          paymentMethod: paymentMethod,
          bankAccountId: bankAccountId,
          currency: 'USD',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationInfo(data.validation);
        if (data.validation.glAccounts) {
          setGlAccountInfo(data.validation.glAccounts);
        }
        
        // Show warnings if any
        if (data.validation.warnings && data.validation.warnings.length > 0) {
          data.validation.warnings.forEach((warning: string) => {
            toast({
              title: 'Validation Warning',
              description: warning,
              variant: 'default',
            });
          });
        }
      }
    } catch (error) {
      // Ignore validation errors, they'll be shown when payment is attempted
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Create vendor payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      purchaseOrderId: number;
      paymentAmount: number;
      paymentMethod: string;
      paymentDate: string;
      valueDate?: string;
      bankAccountId: number;
      reference?: string;
      currency?: string;
      notes?: string;
    }) => {
      const response = await fetch('/api/purchase/vendor-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create payment');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Created',
        description: `Payment ${data.paymentNumber} created successfully. Accounting Document: ${data.accountingDocumentNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/purchase-orders'] });
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
    setSelectedPO(null);
    setPaymentAmount('');
    setPaymentMethod('BANK_TRANSFER');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setValueDate(new Date().toISOString().split('T')[0]);
    setBankAccountId(null);
    setReference('');
    setNotes('');
  };

  const handleCreatePayment = async () => {
    if (!selectedPO) {
      toast({
        title: 'No Purchase Order Selected',
        description: 'Please select a purchase order to create a payment',
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

    // Validate payment before processing
    try {
      setIsValidating(true);
      const validationResponse = await fetch('/api/purchase/vendor-payments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          paymentAmount: amount,
          paymentMethod: paymentMethod,
          bankAccountId: bankAccountId,
          currency: 'USD',
        }),
      });

      const validationData = await validationResponse.json();
      
      if (!validationData.success || !validationData.validation.isValid) {
        const errors = validationData.validation.errors || [];
        toast({
          title: 'Payment Validation Failed',
          description: errors.length > 0 
            ? errors.join('. ') 
            : 'Payment validation failed. Please check your payment details.',
          variant: 'destructive',
        });
        
        // Show specific GL account errors
        if (errors.some((e: string) => e.includes('GL account') || e.includes('AP account'))) {
          toast({
            title: 'GL Account Configuration Required',
            description: 'Please ensure GL accounts are properly configured. Run the migration script if needed.',
            variant: 'destructive',
          });
        }
        
        setIsValidating(false);
        return;
      }

      // Store GL account info for display
      if (validationData.validation.glAccounts) {
        setGlAccountInfo(validationData.validation.glAccounts);
      }

      // Show warnings if any
      if (validationData.validation.warnings && validationData.validation.warnings.length > 0) {
        validationData.validation.warnings.forEach((warning: string) => {
          toast({
            title: 'Warning',
            description: warning,
            variant: 'default',
          });
        });
      }

      setIsValidating(false);

      // Proceed with payment creation
      createPaymentMutation.mutate({
        purchaseOrderId: selectedPO.id,
        paymentAmount: amount,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        valueDate: valueDate || paymentDate,
        bankAccountId: bankAccountId,
        reference: reference || undefined,
        currency: 'USD',
        notes: notes || undefined,
      });
    } catch (error: any) {
      setIsValidating(false);
      toast({
        title: 'Validation Error',
        description: error.message || 'Failed to validate payment',
        variant: 'destructive',
      });
    }
  };

  const handleSelectPO = (po: PurchaseOrder) => {
    const normalizedPO = {
      ...po,
      order_number: po.order_number || po.orderNumber || `PO-${po.id}`,
      vendor_name: po.vendor_name || po.vendorName,
      total_amount: po.total_amount || po.totalAmount || 0,
      order_date: po.order_date || po.orderDate || new Date().toISOString(),
      vendor_id: po.vendor_id || po.vendorId || 0,
    };
    setSelectedPO(normalizedPO);
    setPaymentAmount(normalizedPO.total_amount.toString());
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Payments</h2>
          <p className="text-sm text-muted-foreground">Process payments for purchase orders</p>
        </div>
        <Button
          onClick={() => {
            refetchPOs();
            refetchPayments();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All vendor payments processed</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="text-center py-8">Loading payments...</div>
              ) : vendorPayments && vendorPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Purchase Order</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Accounting Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.payment_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.vendor_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{payment.vendor_code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{payment.order_number || 'N/A'}</TableCell>
                              <TableCell>{formatCurrency(payment.payment_amount, payment.currency)}</TableCell>
                              <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                              <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                              <TableCell>{getStatusBadge(payment.status)}</TableCell>
                              <TableCell className="font-mono">
                                {payment.accounting_document_number ? (
                                  <div className="flex flex-col">
                                    <span>{payment.accounting_document_number}</span>
                                    <span className="text-xs text-muted-foreground">
                                      GL Posted
                                    </span>
                                  </div>
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
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

        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders Pending Payment</CardTitle>
              <CardDescription>Select a purchase order to create a payment</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPOs ? (
                <div className="text-center py-8">Loading purchase orders...</div>
              ) : purchaseOrders && purchaseOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => {
                      const orderNumber = po.order_number || po.orderNumber || `PO-${po.id}`;
                      const vendorName = po.vendor_name || po.vendorName || `Vendor ${po.vendor_id || po.vendorId}`;
                      const totalAmount = po.total_amount || po.totalAmount || 0;
                      const orderDate = po.order_date || po.orderDate || new Date().toISOString();
                      const vendorId = po.vendor_id || po.vendorId || 0;
                      
                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono">{orderNumber}</TableCell>
                          <TableCell>{vendorName}</TableCell>
                          <TableCell>{formatCurrency(totalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={po.status === 'OPEN' || po.status === 'open' ? 'default' : 'secondary'}>
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(orderDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleSelectPO({
                                ...po,
                                order_number: orderNumber,
                                vendor_name: vendorName,
                                total_amount: totalAmount,
                                order_date: orderDate,
                                vendor_id: vendorId,
                              })}
                              size="sm"
                              variant="outline"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Create Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase orders pending payment
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Create Vendor Payment</DialogTitle>
            <DialogDescription>
              Process payment for Purchase Order: {selectedPO?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-4 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            {/* Purchase Order Info */}
            {selectedPO && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Order Number</Label>
                      <div className="font-mono font-medium">{selectedPO.order_number}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Vendor</Label>
                      <div className="font-medium">{selectedPO.vendor_name || `Vendor ${selectedPO.vendor_id}`}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Total Amount</Label>
                      <div className="font-medium">{formatCurrency(selectedPO.total_amount)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div>
                        <Badge variant={selectedPO.status === 'OPEN' ? 'default' : 'secondary'}>
                          {selectedPO.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GL Account Information */}
            {glAccountInfo && (glAccountInfo.apAccount || glAccountInfo.bankAccount) && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">GL Accounts to be Used</CardTitle>
                  <CardDescription className="text-blue-700">
                    The following GL accounts will be used for this payment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {glAccountInfo.apAccount && (
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Accounts Payable (Debit)</div>
                        <div className="text-xs text-gray-500">{glAccountInfo.apAccount.account_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-blue-600">{glAccountInfo.apAccount.account_number}</div>
                        <div className="text-xs text-gray-500">{glAccountInfo.apAccount.account_type}</div>
                      </div>
                    </div>
                  )}
                  {glAccountInfo.bankAccount && (
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Bank Account (Credit)</div>
                        <div className="text-xs text-gray-500">{glAccountInfo.bankAccount.account_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-blue-600">{glAccountInfo.bankAccount.account_number}</div>
                        <div className="text-xs text-gray-500">{glAccountInfo.bankAccount.account_type}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validation Errors */}
            {validationInfo && !validationInfo.isValid && validationInfo.errors.length > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Validation Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {validationInfo.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Validation Warnings */}
            {validationInfo && validationInfo.warnings && validationInfo.warnings.length > 0 && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-lg text-yellow-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                    {validationInfo.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
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
                    value={bankAccountId ? bankAccountId.toString() : undefined}
                    onValueChange={(value) => {
                      if (value && value !== '') {
                        setBankAccountId(parseInt(value));
                        setValidationInfo(null);
                        setGlAccountInfo(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts
                        .filter((bank) => bank.id != null && bank.id !== undefined)
                        .map((bank) => (
                          <SelectItem key={bank.id} value={bank.id.toString()}>
                            <div className="flex flex-col">
                              <span>{bank.account_name} ({bank.account_number})</span>
                              {bank.gl_account_number && (
                                <span className="text-xs text-muted-foreground">
                                  GL: {bank.gl_account_number}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Balance: {formatCurrency(bank.available_balance)}
                              </span>
                            </div>
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
                {bankAccountId && bankAccounts && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const selectedBank = bankAccounts.find(ba => ba.id === bankAccountId);
                      if (selectedBank?.gl_account_number) {
                        return `GL Account: ${selectedBank.gl_account_number} (${selectedBank.gl_account_name || 'N/A'})`;
                      }
                      return 'GL Account will be determined automatically';
                    })()}
                  </p>
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

          <DialogFooter className="flex-shrink-0 border-t px-6 pt-4 pb-6 mt-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                resetForm();
                setValidationInfo(null);
                setGlAccountInfo(null);
              }}
              disabled={createPaymentMutation.isPending || isValidating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending || isValidating || !bankAccountId || !paymentAmount || (validationInfo && !validationInfo.isValid)}
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : createPaymentMutation.isPending ? (
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

