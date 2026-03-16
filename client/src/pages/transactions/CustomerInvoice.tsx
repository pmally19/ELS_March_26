import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, DollarSign, Clock, User, CheckCircle } from 'lucide-react';

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  documentType: string;
  billingDate: string;
  netDueDate: string;
  customerNumber: string;
  customerName: string;
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  paymentTerms: string;
  netValue: number;
  taxValue: number;
  grossValue: number;
  currency: string;
  billingStatus: string;
  paymentStatus: string;
  salesOrder: string;
  deliveryNumber: string;
  billingDocument: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function CustomerInvoice() {
  const [activeTab, setActiveTab] = useState<string>("invoices");

  const { data: invoiceData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/customer-invoice'],
  });

  const invoices = invoiceData?.data || [];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold">Customer Invoice</h1>
          <Badge variant="secondary">SAP VF01/VF02</Badge>
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
                  {invoices.filter(inv => inv.billingStatus === 'Completed').length}
                </div>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {invoices.filter(inv => inv.billingStatus === 'Pending').length}
                </div>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoice List</TabsTrigger>
          <TabsTrigger value="billing">Billing Process</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Customer Invoices (VF03)</CardTitle>
              <CardDescription>Billing documents and customer invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Billing Date</TableHead>
                    <TableHead>Net Value</TableHead>
                    <TableHead>Tax Value</TableHead>
                    <TableHead>Gross Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Terms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-bold">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono">{invoice.customerNumber}</div>
                          <div className="text-sm text-gray-600">{invoice.customerName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.billingDate}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(invoice.netValue)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(invoice.taxValue)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(invoice.grossValue)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.billingStatus)}>
                          {invoice.billingStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{invoice.paymentTerms}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Process</CardTitle>
              <CardDescription>Invoice creation and processing workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Create Invoice</h3>
                        <p className="text-sm text-gray-600">Generate new billing documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Process Payment</h3>
                        <p className="text-sm text-gray-600">Handle invoice payments and collections</p>
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