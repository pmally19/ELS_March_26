import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight, ArrowLeft, DollarSign, Users, Calendar, TrendingUp, AlertTriangle, CheckCircle, 
         CreditCard, FileText, BarChart3, Shield, Settings, Download, Upload, Phone, Mail, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function ARComplete() {
  const [, setLocation] = useLocation();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentForm, setPaymentForm] = useState({
    customer_id: '',
    payment_amount: '',
    payment_method_code: 'BANK',
    reference_number: '',
    notes: '',
    invoice_applications: []
  });
  const [collectionForm, setCollectionForm] = useState({
    customer_id: '',
    activity_type: 'call',
    description: '',
    outcome: '',
    next_action_date: ''
  });
  const [crossCheckResults, setCrossCheckResults] = useState(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AR data
  const { data: arData, isLoading } = useQuery({
    queryKey: ['/api/finance/ar'],
  });

  // Fetch cash flow forecast
  const { data: cashFlowData } = useQuery({
    queryKey: ['/api/ar/reports/cash-flow-forecast'],
  });

  // Fetch DSO analysis
  const { data: dsoData } = useQuery({
    queryKey: ['/api/ar/reports/dso-analysis'],
  });

  // Fetch customer profitability
  const { data: profitabilityData } = useQuery({
    queryKey: ['/api/ar/reports/customer-profitability'],
  });

  // Fetch collection effectiveness
  const { data: collectionData } = useQuery({
    queryKey: ['/api/ar/reports/collection-effectiveness'],
  });

  // Fetch detailed aging analysis
  const { data: agingData } = useQuery({
    queryKey: ['/api/ar/reports/detailed-aging-analysis'],
  });

  // Payment recording mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/ar/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (!response.ok) throw new Error('Failed to record payment');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Payment recorded successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/ar'] });
      setPaymentForm({
        customer_id: '',
        payment_amount: '',
        payment_method_code: 'BANK',
        reference_number: '',
        notes: '',
        invoice_applications: []
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    }
  });

  // Collection activity mutation
  const recordCollectionMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch('/api/ar/collection-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });
      if (!response.ok) throw new Error('Failed to record collection activity');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Collection activity recorded successfully' });
      setCollectionForm({
        customer_id: '',
        activity_type: 'call',
        description: '',
        outcome: '',
        next_action_date: ''
      });
    }
  });

  // CrossCheck validation mutation
  const runCrossCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ar/crosscheck-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to run AR validation');
      return response.json();
    },
    onSuccess: (data) => {
      setCrossCheckResults(data);
      toast({ title: 'AR CrossCheck validation completed' });
    },
    onError: (error: any) => {
      toast({ title: 'Validation failed', description: error.message, variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const invoices = arData?.invoices || [];
  const summary = arData?.summary || {};
  const agingAnalysis = arData?.aging_analysis || [];

  const getStatusBadge = (status: string, daysOverdue?: number) => {
    if (status === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (daysOverdue && daysOverdue > 0) {
      return <Badge variant="destructive">Overdue ({daysOverdue}d)</Badge>;
    } else {
      return <Badge variant="secondary">Open</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const selectedInvoice = selectedInvoiceId ? invoices.find((inv: any) => inv.id === selectedInvoiceId) : null;

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(summary.total_outstanding || 0)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {summary.total_invoices || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Current (0-30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(summary?.current || {} || 0)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {Math.round((summary?.current || {} / (summary.total_outstanding || 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Overdue (31+ days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-900">
              {formatCurrency(summary.overdue || 0)}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              {summary.overdue_count || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-900">
              {summary.active_customers || 0}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              With outstanding balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(Array.isArray(invoices) ? invoices.map((invoice: any) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-blue-600 hover:text-blue-800">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-gray-500">{invoice.customer_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status, invoice.days_overdue)}
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )):<p className="text-sm text-gray-500">No aging data available</p>)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedInvoice ? (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-blue-600">{selectedInvoice.invoice_number}</h3>
                  <p className="text-sm text-gray-500">{selectedInvoice.customer_name}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Invoice Date:</span>
                    <span>{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Due Date:</span>
                    <span>{new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    {getStatusBadge(selectedInvoice.status, selectedInvoice.days_overdue)}
                  </div>
                  {selectedInvoice.days_overdue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Days Overdue:</span>
                      <span className="text-red-600 font-medium">{selectedInvoice.days_overdue}</span>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="space-y-2">
                  <Button className="w-full" size="sm" onClick={() => setActiveTab('payments')}>
                    Record Payment
                  </Button>
                  <Button variant="outline" className="w-full" size="sm" onClick={() => setActiveTab('collections')}>
                    Collection Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(agingAnalysis) ? agingAnalysis.map((bucket: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{bucket.period}</span>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(bucket.amount)}</p>
                        <p className="text-xs text-gray-500">{bucket.count} invoices</p>
                      </div>
                    </div>
                  )): <p className="text-sm text-gray-500">No aging data available</p>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Processing & Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Customer</Label>
                <Select value={paymentForm.customer_id} onValueChange={(value) => setPaymentForm({...paymentForm, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(invoices) ? invoices.map((invoice: any) => (
                      <SelectItem key={invoice.customer_id} value={invoice.customer_id.toString()}>
                        {invoice.customer_name}
                      </SelectItem>
                    )):<p className="text-sm text-gray-500">No aging data available</p>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment_amount">Payment Amount</Label>
                <Input 
                  id="payment_amount"
                  type="number"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={paymentForm.payment_method_code} onValueChange={(value) => setPaymentForm({...paymentForm, payment_method_code: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Credit Card</SelectItem>
                    <SelectItem value="WIRE">Wire Transfer</SelectItem>
                    <SelectItem value="ACH">ACH Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input 
                  id="reference_number"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  placeholder="Payment notes"
                />
              </div>

              <Button 
                onClick={() => recordPaymentMutation.mutate(paymentForm)}
                disabled={recordPaymentMutation.isPending}
                className="w-full"
              >
                {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Payment Features</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Automatic payment matching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Partial payment handling</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">GL posting automation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Customer balance updates</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCollectionsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Collection Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="collection_customer">Customer</Label>
                <Select value={collectionForm.customer_id} onValueChange={(value) => setCollectionForm({...collectionForm, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(invoices) ? invoices.map((invoice: any) => (
                      <SelectItem key={invoice.customer_id} value={invoice.customer_id.toString()}>
                        {invoice.customer_name}
                      </SelectItem>
                    )):<p className="text-sm text-gray-500">No aging data available</p>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity_type">Activity Type</Label>
                <Select value={collectionForm.activity_type} onValueChange={(value) => setCollectionForm({...collectionForm, activity_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="visit">Site Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({...collectionForm, description: e.target.value})}
                  placeholder="Description of collection activity"
                />
              </div>

              <div>
                <Label htmlFor="outcome">Outcome</Label>
                <Textarea 
                  id="outcome"
                  value={collectionForm.outcome}
                  onChange={(e) => setCollectionForm({...collectionForm, outcome: e.target.value})}
                  placeholder="Activity outcome and customer response"
                />
              </div>

              <div>
                <Label htmlFor="next_action_date">Next Action Date</Label>
                <Input 
                  id="next_action_date"
                  type="datetime-local"
                  value={collectionForm.next_action_date}
                  onChange={(e) => setCollectionForm({...collectionForm, next_action_date: e.target.value})}
                />
              </div>

              <Button 
                onClick={() => recordCollectionMutation.mutate(collectionForm)}
                disabled={recordCollectionMutation.isPending}
                className="w-full"
              >
                {recordCollectionMutation.isPending ? 'Recording...' : 'Record Activity'}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Collection Features</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Automated dunning letters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Collection workflow automation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Customer communication tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Collection effectiveness metrics</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Flow Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Cash Flow Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(cashFlowData?.total_probable || 0 || 0)}
                  </p>
                  <p className="text-sm text-gray-500">Expected Collections (90 days)</p>
                </div>
                <Progress value={75} className="w-full" />
                <p className="text-xs text-gray-500">
                  Based on {cashFlowData.forecast_data?.length || 0} forecast periods
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DSO Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              DSO Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dsoData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {dsoData?.current_dso || 0 || 0} days
                  </p>
                  <p className="text-sm text-gray-500">Current DSO</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average DSO:</span>
                  <span>{dsoData?.average_dso || 0 || 0} days</span>
                </div>
            <div className="flex justify-between text-sm">
  <span>Trend:</span>
  <span className={dsoData?.trend === 'improving' ? 'text-green-600' : 'text-red-600'}>
    {dsoData?.trend || 'stable'}
  </span>
</div>

                <Badge variant={dsoData.benchmark_comparison?.current_rating === 'excellent' ? 'default' : 'secondary'}>
                  {dsoData.benchmark_comparison?.current_rating || 'average'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Profitability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Customer Profitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profitabilityData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {profitabilityData.portfolio_summary?.overall_margin || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Overall Margin</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Revenue:</span>
                    <span>{formatCurrency(profitabilityData.portfolio_summary?.total_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Customers:</span>
                    <span>{profitabilityData.portfolio_summary?.total_customers || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Collection Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collectionData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {collectionData.overall_metrics?.overall_success_rate || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Collection Rate:</span>
                    <span>{collectionData.overall_metrics?.collection_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Activities:</span>
                    <span>{collectionData.overall_metrics?.total_activities || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCrossCheckTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            AR CrossCheck Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Comprehensive validation of AR data integrity, foreign key relationships, and business logic
            </p>
            <Button 
              onClick={() => runCrossCheckMutation.mutate()}
              disabled={runCrossCheckMutation.isPending}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${runCrossCheckMutation.isPending ? 'animate-spin' : ''}`} />
              {runCrossCheckMutation.isPending ? 'Validating...' : 'Run Validation'}
            </Button>
          </div>

          {crossCheckResults && (
            <div className="space-y-4">
            <Alert className={crossCheckResults?.overall_status === 'HEALTHY' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription>
    <strong>Overall Status: {crossCheckResults?.overall_status || 'N/A'}</strong>
    <br />
    {crossCheckResults?.summary?.passed_checks ?? 0}/{crossCheckResults?.summary?.total_checks ?? 0} checks passed 
    ({crossCheckResults?.summary?.success_rate ?? 0}% success rate)
  </AlertDescription>
</Alert>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-700">Critical</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-900">{crossCheckResults?.error_summary || {}.critical}</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-700">High</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-900">{crossCheckResults?.error_summary || {}.high}</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-700">Medium</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-900">{crossCheckResults?.error_summary || {}.medium}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Validation Results</h3>
                {crossCheckResults?.(Array.isArray(validation_results) ? validation_results.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">{result.category}</span>
                    <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                )):<p className="text-sm text-gray-500">No aging data available</p>)}
              </div>

             {Array.isArray(crossCheckResults?.errors) && crossCheckResults.errors.length > 0 ? (
  <div className="space-y-4">
    <h3 className="font-medium">Issues Found</h3>
    {crossCheckResults.errors.map((error: any, index: number) => (
      <Alert key={index} className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>{error.category}:</strong> {error.message}
          <Badge variant="destructive" className="ml-2">{error.severity}</Badge>
        </AlertDescription>
      </Alert>
    ))}
  </div>
) : (
  <p className="text-sm text-gray-500">No aging data available</p>
)}

{Array.isArray(crossCheckResults?.recommendations) && crossCheckResults.recommendations.length > 0 ? (
  <div className="space-y-4">
    <h3 className="font-medium">Recommendations</h3>
    <ul className="space-y-2">
      {crossCheckResults.recommendations.map((rec: string, index: number) => (
        <li key={index} className="text-sm text-gray-600 flex items-start">
          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
          {rec}
        </li>
      ))}
    </ul>
  </div>
) : (
  <p className="text-sm text-gray-500">No aging data available</p>
)}

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/finance')}
            className="text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Finance
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable Complete</h1>
            <p className="text-gray-500">Complete AR management with all 6 functionalities and CrossCheck validation</p>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="crosscheck" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            CrossCheck
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="payments">{renderPaymentsTab()}</TabsContent>
        <TabsContent value="collections">{renderCollectionsTab()}</TabsContent>
        <TabsContent value="reports">{renderReportsTab()}</TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Document Management & Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Document Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Invoice PDF generation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Email invoice delivery</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Document attachments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Audit trail logging</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Integration Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Automatic invoice creation from sales orders</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">GL posting automation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Bank reconciliation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Tax compliance reporting</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="crosscheck">{renderCrossCheckTab()}</TabsContent>
      </Tabs>
    </div>
  );
}