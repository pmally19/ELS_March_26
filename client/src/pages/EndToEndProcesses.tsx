import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, AlertCircle, Play, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from "wouter";
import { useToast } from '@/hooks/use-toast';

interface ProcessStep {
  step: string;
  status: string;
  document: string;
  amount: number;
}

interface ProcessResult {
  success: boolean;
  message: string;
  salesOrder?: any;
  arInvoice?: any;
  customerPayment?: any;
  bankTransaction?: any;
  purchaseOrder?: any;
  goodsReceipt?: any;
  apInvoice?: any;
  vendorPayment?: any;
  steps?: ProcessStep[];
}

export default function EndToEndProcesses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeProcess, setActiveProcess] = useState<string | null>(null);

  // Get available sales orders and purchase orders
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['/api/sales/sales-order']
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['/api/purchasing/purchase-order']
  });

  // Sales-to-Cash process mutation
  const salesToCashMutation = useMutation({
    mutationFn: async (salesOrderId: number) => {
      const response = await fetch(`/api/end-to-end/sales-to-cash/${salesOrderId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to process sales-to-cash');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sales-to-Cash Complete",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/bank-transactions'] });
      setActiveProcess(null);
    },
    onError: (error) => {
      toast({
        title: "Process Failed",
        description: error.message,
        variant: "destructive"
      });
      setActiveProcess(null);
    }
  });

  // Procure-to-Pay process mutation
  const procureToPayMutation = useMutation({
    mutationFn: async (purchaseOrderId: number) => {
      const response = await fetch(`/api/end-to-end/procure-to-pay/${purchaseOrderId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to process procure-to-pay');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Procure-to-Pay Complete",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/transactions'] });
      setActiveProcess(null);
    },
    onError: (error) => {
      toast({
        title: "Process Failed",
        description: error.message,
        variant: "destructive"
      });
      setActiveProcess(null);
    }
  });

  // Period End Closing mutation
  const periodClosingMutation = useMutation({
    mutationFn: async (params: { companyCodeId: number; period: number; year: number }) => {
      const response = await fetch('/api/end-to-end/period-end-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Failed to close period');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Period Closed",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/gl-entries'] });
      setActiveProcess(null);
    },
    onError: (error) => {
      toast({
        title: "Period Closing Failed",
        description: error.message,
        variant: "destructive"
      });
      setActiveProcess(null);
    }
  });

  const handleSalesToCash = (salesOrderId: number) => {
    setActiveProcess('sales-to-cash');
    salesToCashMutation.mutate(salesOrderId);
  };

  const handleProcureToPay = (purchaseOrderId: number) => {
    setActiveProcess('procure-to-pay');
    procureToPayMutation.mutate(purchaseOrderId);
  };

  const handlePeriodClosing = () => {
    setActiveProcess('period-closing');
    periodClosingMutation.mutate({
      companyCodeId: 2,
      period: 6,
      year: 2025
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">End-to-End Business Processes</h1>
            <p className="text-muted-foreground">
              Execute complete business workflows that connect all ERP modules
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales-to-Cash Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Sales-to-Cash
            </CardTitle>
            <CardDescription>
              Complete customer order fulfillment and payment collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Process Flow:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>1. Sales Order → Customer Invoice</div>
                <div>2. Customer Payment → Bank Transaction</div>
                <div>3. GL Posting → Account Reconciliation</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Available Sales Orders:</h4>
              {salesOrders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground">
                      ${order.total_amount} • {order.status}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSalesToCash(order.id)}
                    disabled={activeProcess === 'sales-to-cash' || order.status !== 'confirmed'}
                  >
                    {activeProcess === 'sales-to-cash' ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Processing
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Procure-to-Pay Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-600" />
              Procure-to-Pay
            </CardTitle>
            <CardDescription>
              Complete vendor procurement and payment processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Process Flow:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>1. Purchase Order → Goods Receipt</div>
                <div>2. Vendor Invoice → Three-Way Match</div>
                <div>3. Vendor Payment → GL Posting</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Available Purchase Orders:</h4>
              {purchaseOrders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground">
                      ${order.total_amount} • {order.status}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleProcureToPay(order.id)}
                    disabled={activeProcess === 'procure-to-pay' || order.status !== 'approved'}
                  >
                    {activeProcess === 'procure-to-pay' ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Processing
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Period End Closing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              Period End Closing
            </CardTitle>
            <CardDescription>
              Financial period closing with balance validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Closing Process:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>1. Validate Journal Entry Balance</div>
                <div>2. Check Debit/Credit Equality</div>
                <div>3. Lock Period for Posting</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Current Period:</h4>
              <div className="p-2 border rounded">
                <div className="font-medium">June 2025</div>
                <div className="text-sm text-muted-foreground">
                  Company Code: 2000 • Status: Open
                </div>
              </div>
            </div>

            <Button
              onClick={handlePeriodClosing}
              disabled={activeProcess === 'period-closing'}
              className="w-full"
            >
              {activeProcess === 'period-closing' ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Closing Period
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Period
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Process Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Business Process Integration Status</CardTitle>
          <CardDescription>
            Real-time status of cross-module business workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-blue-600">
                {salesOrders.filter((o: any) => o.status === 'confirmed').length}
              </div>
              <div className="text-sm text-muted-foreground">Orders Ready</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-green-600">
                {purchaseOrders.filter((o: any) => o.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">POs Ready</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-purple-600">12</div>
              <div className="text-sm text-muted-foreground">Open Periods</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-muted-foreground">Integration Health</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}