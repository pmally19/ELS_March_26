import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, DollarSign, Clock, User, CheckCircle, AlertTriangle } from 'lucide-react';

interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorInvoiceNumber: string;
  documentType: string;
  postingDate: string;
  documentDate: string;
  vendorNumber: string;
  vendorName: string;
  purchaseOrder: string;
  companyCode: string;
  paymentTerms: string;
  netValue: number;
  taxValue: number;
  grossValue: number;
  currency: string;
  verificationStatus: string;
  paymentStatus: string;
  dueDate: string;
  cashDiscountDate: string;
  receiptDate: string;
  approvedBy: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function VendorInvoice() {
  const [activeTab, setActiveTab] = useState<string>("invoices");

  const { data: invoiceData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/vendor-invoice'],
  });

  const invoices = invoiceData?.data || [];

  const getVerificationStatusColor = (status: string): string => {
    switch (status) {
      case 'Verified': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Parked': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Due': return 'bg-orange-100 text-orange-800';
      case 'Not Due': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Vendor Invoice</h1>
          <Badge variant="secondary">SAP MIRO</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{invoices.length}</div>
                <p className="text-xs text-gray-600">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(invoices.reduce((sum, inv) => sum + inv.grossValue, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => inv.verificationStatus === 'Verified').length}
                </div>
                <p className="text-xs text-gray-600">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => inv.verificationStatus === 'Pending').length}
                </div>
                <p className="text-xs text-gray-600">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoice List</TabsTrigger>
          <TabsTrigger value="verification">Invoice Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Invoices (MIRO)</CardTitle>
              <CardDescription>Invoice receipt and verification process</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Vendor Invoice</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Net Value</TableHead>
                    <TableHead>Gross Value</TableHead>
                    <TableHead>Verification Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-bold">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="font-mono">{invoice.vendorInvoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono">{invoice.vendorNumber}</div>
                          <div className="text-sm text-gray-600">{invoice.vendorName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{invoice.purchaseOrder}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(invoice.netValue)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(invoice.grossValue)}</TableCell>
                      <TableCell>
                        <Badge className={getVerificationStatusColor(invoice.verificationStatus)}>
                          {invoice.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(invoice.paymentStatus)}>
                          {invoice.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Verification Process</CardTitle>
              <CardDescription>Three-way matching and approval workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Invoice Matching</h3>
                        <p className="text-sm text-gray-600">Compare invoice with PO and goods receipt</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Exception Handling</h3>
                        <p className="text-sm text-gray-600">Resolve price and quantity variances</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Approval Workflow</h3>
                        <p className="text-sm text-gray-600">Route for approval and posting</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}