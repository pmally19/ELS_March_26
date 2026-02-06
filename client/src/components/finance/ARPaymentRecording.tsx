import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Eye,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Customer {
  id: number;
  code: string;
  name: string;
  currency?: string;
  company_code_id?: number;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  requires_bank_account: boolean;
}

interface BankAccount {
  id: number;
  account_id?: string;
  account_number: string;
  account_name: string;
  description?: string;
  bank_name?: string;
  currency: string;
}

interface AROpenItem {
  id: number;
  invoice_number: string;
  document_number: string;
  original_amount: number;
  outstanding_amount: number;
  due_date: string;
  billing_document_id: number;
  customer_id?: number;
  customer_name?: string;
  selected?: boolean;
  applied_amount?: number;
}

interface PaymentRecord {
  id: number;
  payment_number: string;
  customer_name: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  reference: string;
  posting_status: string;
  accounting_document_number?: string;
}

interface ARPaymentRecordingProps {
  onBack?: () => void;
}

export default function ARPaymentRecording({ onBack }: ARPaymentRecordingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [outstandingAmount, setOutstandingAmount] = useState<string>('0.00');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [openItems, setOpenItems] = useState<AROpenItem[]>([]);
  const [selectedOpenItems, setSelectedOpenItems] = useState<Set<number>>(new Set());
  const [applicationMode, setApplicationMode] = useState<'auto' | 'manual'>('auto');

  // Fetch customers
  const { data: customers, isLoading: customersLoading, error: customersError, isError: isCustomersError } = useQuery({
    queryKey: ['/api/master-data/customers'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/customers');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Customers API response:', data);
        // Handle different response formats
        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} customers`);
          return data;
        } else if (data?.data && Array.isArray(data.data)) {
          console.log(`Loaded ${data.data.length} customers from data.data`);
          return data.data;
        } else if (data?.customers && Array.isArray(data.customers)) {
          console.log(`Loaded ${data.customers.length} customers from data.customers`);
          return data.customers;
        }
        console.warn('Unexpected customer data format:', data);
        return [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
  });

  // Fetch payment methods from database
  const { data: paymentMethods, isLoading: methodsLoading, error: methodsError } = useQuery({
    queryKey: ['/api/ar/payment-methods'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ar/payment-methods');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Payment methods API response:', data);
        
        // Handle different response formats
        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} payment methods from database`);
          return data;
        } else if (data?.data && Array.isArray(data.data)) {
          console.log(`Loaded ${data.data.length} payment methods from data.data`);
          return data.data;
        }
        console.warn('Unexpected payment methods data format:', data);
        return [];
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
  });

  // Get the selected customer object to access company_code_id
  const selectedCustomerObj = customers?.find((c: Customer) => c.id === selectedCustomer) || null;
  
  // Fetch bank accounts filtered by customer's company code
  const { data: bankAccounts, isLoading: bankAccountsLoading, error: bankAccountsError } = useQuery({
    queryKey: ['/api/finance/bank-accounts', selectedCustomerObj?.company_code_id],
    queryFn: async () => {
      try {
        // Build URL with company_code_id query parameter if customer is selected
        let url = '/api/finance/bank-accounts';
        if (selectedCustomerObj?.company_code_id) {
          url += `?company_code_id=${selectedCustomerObj.company_code_id}`;
        }
        
        console.log('[Bank Accounts] Fetching from:', url);
        const response = await apiRequest(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[Bank Accounts] API response:', data);
        
        // Handle different response formats
        if (Array.isArray(data)) {
          console.log(`[Bank Accounts] Loaded ${data.length} accounts from database`);
          return data;
        } else if (data?.data && Array.isArray(data.data)) {
          console.log(`[Bank Accounts] Loaded ${data.data.length} accounts from data.data`);
          return data.data;
        }
        console.warn('[Bank Accounts] Unexpected data format:', data);
        return [];
      } catch (error) {
        console.error('[Bank Accounts] Error fetching bank accounts:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
    enabled: !!selectedCustomer && !!selectedCustomerObj, // Only fetch when a customer is selected and found
  });

  // Fetch ALL AR open items (outstanding invoices)
  const { data: allOpenItems, isLoading: allOpenItemsLoading } = useQuery({
    queryKey: ['/api/ar/open-items'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ar/open-items');
        const data = await response.json();
        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data?.data && Array.isArray(data.data)) {
          return data.data;
        } else if (data?.rows && Array.isArray(data.rows)) {
          return data.rows;
        }
        console.warn('Unexpected open items data format:', data);
        return [];
      } catch (error) {
        console.error('Error fetching all open items:', error);
        return [];
      }
    },
  });

  // Fetch AR open items when customer is selected (for filtering)
  const { data: customerOpenItems, isLoading: openItemsLoading } = useQuery({
    queryKey: ['/api/ar/open-items', selectedCustomer],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      try {
        const response = await apiRequest(`/api/ar/post-journal/payments/open-items/${selectedCustomer}`);
        const data = await response.json();
        return Array.isArray(data?.data || data) ? (data.data || data) : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedCustomer,
  });

  // Update open items - show all if no customer selected, or filtered by customer if selected
  useEffect(() => {
    let items: any[] = [];
    
    if (selectedCustomer && customerOpenItems && Array.isArray(customerOpenItems)) {
      // Use customer-specific items when customer is selected
      items = customerOpenItems.map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number || item.document_number || item.billing_number || 'N/A',
        document_number: item.document_number || item.invoice_number || item.billing_number || 'N/A',
        original_amount: parseFloat(item.original_amount || 0),
        outstanding_amount: parseFloat(item.outstanding_amount || 0),
        due_date: item.due_date || item.posting_date,
        billing_document_id: item.billing_document_id || item.id,
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        selected: false,
        applied_amount: 0,
      }));
    } else if (allOpenItems && Array.isArray(allOpenItems)) {
      // Use all open items when no customer is selected
      items = allOpenItems
        .filter((item: any) => parseFloat(item.outstanding_amount || 0) > 0)
        .map((item: any) => ({
          id: item.id,
          invoice_number: item.invoice_number || item.document_number || item.billing_number || 'N/A',
          document_number: item.document_number || item.invoice_number || item.billing_number || 'N/A',
          original_amount: parseFloat(item.original_amount || 0),
          outstanding_amount: parseFloat(item.outstanding_amount || 0),
          due_date: item.due_date || item.posting_date,
          billing_document_id: item.billing_document_id || item.id,
          customer_id: item.customer_id,
          customer_name: item.customer_name,
          selected: false,
          applied_amount: 0,
        }));
    }
    
    // Calculate total outstanding amount
    const totalOutstanding = items.reduce((sum, item) => sum + item.outstanding_amount, 0);
    setOutstandingAmount(totalOutstanding.toFixed(2));
    
    setOpenItems(items);
  }, [customerOpenItems, allOpenItems, selectedCustomer]);

  // Fetch recent payments
  const { data: recentPayments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['/api/order-to-cash/payments/recent'],
    queryFn: async () => {
      try {
        console.log('[Recent Payments] Fetching from /api/order-to-cash/payments/recent');
        const response = await apiRequest('/api/order-to-cash/payments/recent');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[Recent Payments] API response:', data);
        
        // Handle different response formats
        if (Array.isArray(data)) {
          console.log(`[Recent Payments] Loaded ${data.length} payments from array`);
          return data;
        } else if (data?.data && Array.isArray(data.data)) {
          console.log(`[Recent Payments] Loaded ${data.data.length} payments from data.data`);
          return data.data;
        } else if (data?.success && Array.isArray(data.data)) {
          console.log(`[Recent Payments] Loaded ${data.data.length} payments from success.data`);
          return data.data;
        }
        console.warn('[Recent Payments] Unexpected data format:', data);
        return [];
      } catch (error) {
        console.error('[Recent Payments] Error fetching payments:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
  });

  // Calculate total outstanding for selected customer
  const totalOutstanding = openItems.reduce((sum, item) => sum + item.outstanding_amount, 0);
  const totalSelected = openItems
    .filter(item => selectedOpenItems.has(item.id))
    .reduce((sum, item) => sum + (item.applied_amount || item.outstanding_amount), 0);

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('/api/order-to-cash/customer-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment processing failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Recorded',
        description: `Payment ${data.data?.payment_number || ''} has been successfully recorded and posted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/open-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-to-cash/payments/recent'] });
      resetForm();
      setShowPaymentDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Processing Failed',
        description: error.message || 'An error occurred while processing the payment',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedCustomer(null);
    setPaymentAmount('');
    setPaymentMethod('');
    setBankAccountId('');
    setReference('');
    setDescription('');
    setOpenItems([]);
    setSelectedOpenItems(new Set());
  };

  const handleProcessPayment = () => {
    if (!selectedCustomer || !paymentAmount || !paymentMethod) {
      toast({
        title: 'Missing Information',
        description: 'Please select customer, enter payment amount, and choose payment method.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    const selectedMethod = paymentMethods?.find((m: PaymentMethod) => m.code === paymentMethod);
    if (selectedMethod?.requires_bank_account && !bankAccountId) {
      toast({
        title: 'Bank Account Required',
        description: 'Please select a bank account for this payment method.',
        variant: 'destructive',
      });
      return;
    }

    const paymentData: any = {
      customerId: selectedCustomer,
      amount: amount,
      paymentDate: paymentDate,
      paymentMethod: paymentMethod,
      reference: reference,
      description: description,
    };

    if (bankAccountId) {
      paymentData.bankAccountId = typeof bankAccountId === 'string' ? parseInt(bankAccountId) : bankAccountId;
    }

    // If manual application mode, include selected items
    if (applicationMode === 'manual' && selectedOpenItems.size > 0) {
      const applications = openItems
        .filter(item => selectedOpenItems.has(item.id))
        .map(item => ({
          openItemId: item.id,
          amount: item.applied_amount || item.outstanding_amount,
        }));
      paymentData.applications = applications;
    }

    processPaymentMutation.mutate(paymentData);
  };

  const toggleOpenItem = (itemId: number) => {
    const newSelected = new Set(selectedOpenItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedOpenItems(newSelected);
  };

  const updateAppliedAmount = (itemId: number, amount: string) => {
    const updated = openItems.map(item => {
      if (item.id === itemId) {
        const applied = parseFloat(amount) || 0;
        return {
          ...item,
          applied_amount: Math.min(applied, item.outstanding_amount),
        };
      }
      return item;
    });
    setOpenItems(updated);
  };

  const selectedCustomerData = customers?.find((c: Customer) => c.id === selectedCustomer);

  return (
    <div className="space-y-6">
      {/* Back Button (if onBack provided) */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <div className="text-2xl font-bold text-red-600">
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-600">Total Outstanding</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {openItems.length}
              </div>
              <div className="text-sm text-gray-600">Open Invoices</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  if (!recentPayments || recentPayments.length === 0) return 0;
                  const today = new Date().toISOString().split('T')[0];
                  return recentPayments.filter((p: PaymentRecord) => {
                    if (!p.payment_date) return false;
                    const paymentDate = new Date(p.payment_date).toISOString().split('T')[0];
                    return paymentDate === today;
                  }).length;
                })()}
              </div>
              <div className="text-sm text-gray-600">Payments Today</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                ${(() => {
                  if (!recentPayments || recentPayments.length === 0) return '0.00';
                  const today = new Date().toISOString().split('T')[0];
                  const todayPayments = recentPayments.filter((p: PaymentRecord) => {
                    if (!p.payment_date) return false;
                    const paymentDate = new Date(p.payment_date).toISOString().split('T')[0];
                    return paymentDate === today;
                  });
                  const total = todayPayments.reduce((sum: number, p: PaymentRecord) => {
                    const amount = typeof p.payment_amount === 'number' 
                      ? p.payment_amount 
                      : parseFloat(String(p.payment_amount || 0));
                    return sum + amount;
                  }, 0);
                  return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}
              </div>
              <div className="text-sm text-gray-600">Amount Today</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="record">Record Payment</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-4">
          {/* Payment Entry Form - Always Visible */}
          <Card>
            <CardHeader>
              <CardTitle>Record Customer Payment</CardTitle>
              <CardDescription>
                Enter payment details and apply to outstanding invoices. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* First Row: Customer and Payment Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="customer-select-main" className="text-sm font-semibold">Customer *</Label>
                    <Select
                      value={selectedCustomer ? String(selectedCustomer) : ''}
                      onValueChange={(value) => {
                        setSelectedCustomer(value ? parseInt(value) : null);
                        setOpenItems([]);
                        setSelectedOpenItems(new Set());
                      }}
                    >
                      <SelectTrigger id="customer-select-main" className="h-11">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customersLoading ? (
                          <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                        ) : isCustomersError ? (
                          <SelectItem value="error" disabled>Error loading customers (check console)</SelectItem>
                        ) : customers && customers.length > 0 ? (
                          customers.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.code} - {customer.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-customers" disabled>
                            No customers found (found {customers?.length || 0} customers)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-date-main" className="text-sm font-semibold">Payment Date *</Label>
                    <Input
                      id="payment-date-main"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Second Row: Payment Amount and Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount-main" className="text-sm font-semibold">Payment Amount *</Label>
                    <Input
                      id="payment-amount-main"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-11"
                    />
                  </div>
                  
                  {/* Outstanding Amount (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="outstanding-amount-main" className="text-sm font-semibold">Total Outstanding</Label>
                    <Input
                      id="outstanding-amount-main"
                      type="text"
                      value={`$${parseFloat(outstandingAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      readOnly
                      className="h-11 bg-gray-50 font-semibold text-gray-700"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-method-main" className="text-sm font-semibold">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="payment-method-main" className="h-11">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {methodsLoading ? (
                          <SelectItem value="loading" disabled>Loading payment methods...</SelectItem>
                        ) : methodsError ? (
                          <SelectItem value="error" disabled>Error loading payment methods (check console)</SelectItem>
                        ) : paymentMethods && paymentMethods.length > 0 ? (
                          paymentMethods.map((method: PaymentMethod) => (
                            <SelectItem key={method.id} value={method.code}>
                              {method.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-methods" disabled>
                            No payment methods found (found {paymentMethods?.length || 0} methods)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Third Row: Bank Account (if required) */}
                {paymentMethods?.find((m: PaymentMethod) => m.code === paymentMethod)?.requires_bank_account && (
                  <div className="space-y-2">
                    <Label htmlFor="bank-account-main" className="text-sm font-semibold">Bank Account *</Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger id="bank-account-main" className="h-11">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedCustomer ? (
                          <SelectItem value="select-customer" disabled>Please select a customer first</SelectItem>
                        ) : bankAccountsLoading ? (
                          <SelectItem value="loading" disabled>Loading bank accounts...</SelectItem>
                        ) : bankAccountsError ? (
                          <SelectItem value="error" disabled>Error loading bank accounts (check console)</SelectItem>
                        ) : bankAccounts && bankAccounts.length > 0 ? (
                          bankAccounts.map((account: BankAccount) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.account_id || account.account_number} - {account.description || account.account_name}
                              {account.bank_name && ` (${account.bank_name})`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-accounts" disabled>
                            No bank accounts found for company code {selectedCustomerObj?.company_code_id || 'N/A'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Fourth Row: Reference and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reference */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-reference-main" className="text-sm font-semibold">Payment Reference</Label>
                    <Input
                      id="payment-reference-main"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Check number, transaction ID, etc."
                      className="h-11"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-description-main" className="text-sm font-semibold">Description</Label>
                    <Input
                      id="payment-description-main"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Payment description"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Application Mode */}
                {selectedCustomer && openItems.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="application-mode" className="text-sm font-semibold">Application Mode</Label>
                    <Select value={applicationMode} onValueChange={(value: 'auto' | 'manual') => setApplicationMode(value)}>
                      <SelectTrigger id="application-mode" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automatic (FIFO by Due Date)</SelectItem>
                        <SelectItem value="manual">Manual Selection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Manual Application - Open Items Selection */}
                {applicationMode === 'manual' && selectedCustomer && openItems.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                    <Label className="text-sm font-semibold">Select Invoices to Apply Payment</Label>
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead className="text-right">Apply Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedOpenItems.has(item.id)}
                                  onChange={() => toggleOpenItem(item.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{item.invoice_number}</TableCell>
                              <TableCell className="text-right">
                                ${item.outstanding_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={selectedOpenItems.has(item.id) ? (item.applied_amount || item.outstanding_amount) : ''}
                                  onChange={(e) => updateAppliedAmount(item.id, e.target.value)}
                                  disabled={!selectedOpenItems.has(item.id)}
                                  max={item.outstanding_amount}
                                  className="text-right"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedOpenItems.size > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Total Selected: ${totalSelected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {parseFloat(paymentAmount) > 0 && (
                            <span className={totalSelected > parseFloat(paymentAmount) ? ' text-red-600' : ' text-green-600'}>
                              {' '}(Remaining: ${(parseFloat(paymentAmount) - totalSelected).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={processPaymentMutation.isPending || !selectedCustomer || !paymentAmount || !paymentMethod}
                    className="min-w-[150px]"
                  >
                    {processPaymentMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Invoices Card */}
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                {selectedCustomer 
                  ? `Outstanding invoices for ${selectedCustomerData?.name || 'selected customer'}` 
                  : 'All outstanding invoices across all customers'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedCustomer && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-semibold">{selectedCustomerData?.name}</div>
                      <div className="text-sm text-gray-600">Customer Code: {selectedCustomerData?.code}</div>
                    </div>
                  </div>
                )}

                {(openItemsLoading || allOpenItemsLoading) ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-600 mt-2">Loading outstanding invoices...</p>
                  </div>
                ) : openItems.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {selectedCustomer 
                        ? 'No outstanding invoices found for this customer.' 
                        : 'No outstanding invoices found.'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          {!selectedCustomer && <TableHead>Customer</TableHead>}
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Original Amount</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openItems.map((item) => (
                          <TableRow 
                            key={item.id}
                            className={selectedCustomer && item.customer_id === selectedCustomer ? 'bg-blue-50' : ''}
                          >
                            <TableCell className="font-medium">{item.invoice_number}</TableCell>
                            {!selectedCustomer && (
                              <TableCell>{item.customer_name || 'N/A'}</TableCell>
                            )}
                            <TableCell>
                              {item.due_date ? format(new Date(item.due_date), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${item.outstanding_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.outstanding_amount > 0 ? 'default' : 'secondary'}>
                                {item.outstanding_amount > 0 ? 'Open' : 'Cleared'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>View recently recorded customer payments</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-600 mt-2">Loading payments...</p>
                </div>
              ) : !recentPayments || recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No recent payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>GL Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment: PaymentRecord) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{payment.customer_name}</TableCell>
                        <TableCell>
                          {payment.payment_date ? format(new Date(payment.payment_date), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(typeof payment.payment_amount === 'number' 
                            ? payment.payment_amount 
                            : parseFloat(String(payment.payment_amount || 0))
                          ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                        <TableCell>{payment.reference || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={payment.posting_status === 'POSTED' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {payment.posting_status || 'OPEN'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.accounting_document_number || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Entry Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Record Customer Payment</DialogTitle>
            <DialogDescription className="text-base">
              Enter payment details and apply to outstanding invoices. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* First Row: Customer and Payment Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customer-select" className="text-sm font-semibold">Customer *</Label>
                <Select
                  value={selectedCustomer ? String(selectedCustomer) : ''}
                  onValueChange={(value) => {
                    setSelectedCustomer(value ? parseInt(value) : null);
                    setOpenItems([]);
                    setSelectedOpenItems(new Set());
                  }}
                >
                  <SelectTrigger id="customer-select" className="h-11">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersLoading ? (
                      <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                    ) : customers && customers.length > 0 ? (
                      customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.code} - {customer.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="payment-date" className="text-sm font-semibold">Payment Date *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Second Row: Payment Amount and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount" className="text-sm font-semibold">Payment Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-semibold">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" className="h-11">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {methodsLoading ? (
                      <SelectItem value="loading" disabled>Loading payment methods...</SelectItem>
                    ) : methodsError ? (
                      <SelectItem value="error" disabled>Error loading payment methods (check console)</SelectItem>
                    ) : paymentMethods && paymentMethods.length > 0 ? (
                      paymentMethods.map((method: PaymentMethod) => (
                        <SelectItem key={method.id} value={method.code}>
                          {method.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-methods" disabled>
                        No payment methods found (found {paymentMethods?.length || 0} methods)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Third Row: Bank Account (if required) */}
            {paymentMethods?.find((m: PaymentMethod) => m.code === paymentMethod)?.requires_bank_account && (
              <div className="space-y-2">
                <Label htmlFor="bank-account" className="text-sm font-semibold">Bank Account *</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger id="bank-account" className="h-11">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedCustomer ? (
                      <SelectItem value="select-customer" disabled>Please select a customer first</SelectItem>
                    ) : bankAccountsLoading ? (
                      <SelectItem value="loading" disabled>Loading bank accounts...</SelectItem>
                    ) : bankAccountsError ? (
                      <SelectItem value="error" disabled>Error loading bank accounts (check console)</SelectItem>
                    ) : bankAccounts && bankAccounts.length > 0 ? (
                      bankAccounts.map((account: BankAccount) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.account_id || account.account_number} - {account.description || account.account_name}
                          {account.bank_name && ` (${account.bank_name})`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-accounts" disabled>
                        No bank accounts found for company code {selectedCustomerObj?.company_code_id || 'N/A'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fourth Row: Reference and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reference */}
              <div className="space-y-2">
                <Label htmlFor="payment-reference" className="text-sm font-semibold">Payment Reference</Label>
                <Input
                  id="payment-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Check number, transaction ID, etc."
                  className="h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="payment-description" className="text-sm font-semibold">Description</Label>
                <Input
                  id="payment-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description"
                  className="h-11"
                />
              </div>
            </div>

            {/* Application Mode */}
            {selectedCustomer && openItems.length > 0 && (
              <div className="space-y-2">
                <Label>Application Mode</Label>
                <Select value={applicationMode} onValueChange={(value: 'auto' | 'manual') => setApplicationMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic (FIFO by Due Date)</SelectItem>
                    <SelectItem value="manual">Manual Selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual Application - Open Items Selection */}
            {applicationMode === 'manual' && selectedCustomer && openItems.length > 0 && (
              <div className="space-y-2 border rounded-lg p-4">
                <Label>Select Invoices to Apply Payment</Label>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Apply Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedOpenItems.has(item.id)}
                              onChange={() => toggleOpenItem(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.invoice_number}</TableCell>
                          <TableCell className="text-right">
                            ${item.outstanding_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={selectedOpenItems.has(item.id) ? (item.applied_amount || item.outstanding_amount) : ''}
                              onChange={(e) => updateAppliedAmount(item.id, e.target.value)}
                              disabled={!selectedOpenItems.has(item.id)}
                              max={item.outstanding_amount}
                              className="text-right"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {selectedOpenItems.size > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Total Selected: ${totalSelected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {parseFloat(paymentAmount) > 0 && (
                        <span className={totalSelected > parseFloat(paymentAmount) ? ' text-red-600' : ' text-green-600'}>
                          {' '}(Remaining: ${(parseFloat(paymentAmount) - totalSelected).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={processPaymentMutation.isPending || !selectedCustomer || !paymentAmount || !paymentMethod}
            >
              {processPaymentMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

