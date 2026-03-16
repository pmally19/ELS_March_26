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
import { ArrowLeft, RefreshCw, Plus, Edit2, Users, CreditCard, AlertTriangle, Clock, DollarSign, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// SAP FI-AR Type Definitions
interface ARLineItem {
  id: string;
  customerNumber: string;
  customerName: string;
  documentNumber: string;
  documentType: string;
  postingDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  paymentTerms: string;
  aging: number;
  status: 'Open' | 'Cleared' | 'Overdue' | 'Disputed';
  reference: string;
  companyCode: string;
  fiscalYear: string;
  period: string;
  assignment: string;
  text: string;
  baselineDate: string;
  cashDiscount: number;
  netDueDate: string;
}

interface CustomerMaster {
  customerNumber: string;
  customerName: string;
  searchTerm: string;
  creditLimit: number;
  creditUsed: number;
  paymentTerms: string;
  accountGroup: string;
  reconciliationAccount: string;
  riskCategory: string;
  creditControlArea: string;
}

export default function AccountsReceivable() {
  const permissions = useAgentPermissions();
  const [selectedItem, setSelectedItem] = useState<ARLineItem | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<string>("line-items");

  const { data: arData, isLoading, refetch } = useQuery({
    queryKey: ['/api/finance/ar', selectedCompany],
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/company-codes');
      if (!res.ok) throw new Error('Failed to fetch company codes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // SAP AR Line Items data
  const arLineItems: ARLineItem[] = [
    {
      id: 'AR-001',
      customerNumber: '10001',
      customerName: 'TechFlow Solutions Inc.',
      documentNumber: '1900000001',
      documentType: 'RV',
      postingDate: '2025-07-07',
      dueDate: '2025-08-06',
      amount: 125000.00,
      currency: 'USD',
      paymentTerms: 'NET30',
      aging: 0,
      status: 'Open',
      reference: 'INV-2025-001',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '007',
      assignment: 'CUST-10001',
      text: 'Product Sales Invoice',
      baselineDate: '2025-07-07',
      cashDiscount: 2.0,
      netDueDate: '2025-08-06'
    },
    {
      id: 'AR-002',
      customerNumber: '10002',
      customerName: 'GreenEarth Manufacturing',
      documentNumber: '1900000015',
      documentType: 'RV',
      postingDate: '2025-06-15',
      dueDate: '2025-07-15',
      amount: 85000.00,
      currency: 'USD',
      paymentTerms: 'NET30',
      aging: 23,
      status: 'Overdue',
      reference: 'INV-2025-015',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '006',
      assignment: 'CUST-10002',
      text: 'Equipment Sales Invoice',
      baselineDate: '2025-06-15',
      cashDiscount: 2.0,
      netDueDate: '2025-07-15'
    },
    {
      id: 'AR-003',
      customerNumber: '10003',
      customerName: 'Industrial Components Ltd',
      documentNumber: '1900000025',
      documentType: 'DG',
      postingDate: '2025-06-20',
      dueDate: '2025-07-20',
      amount: -15000.00,
      currency: 'USD',
      paymentTerms: 'NET30',
      aging: 18,
      status: 'Open',
      reference: 'CM-2025-003',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '006',
      assignment: 'CUST-10003',
      text: 'Credit Memo - Return',
      baselineDate: '2025-06-20',
      cashDiscount: 0,
      netDueDate: '2025-07-20'
    }
  ];

  const customerMasters: CustomerMaster[] = [
    {
      customerNumber: '10001',
      customerName: 'TechFlow Solutions Inc.',
      searchTerm: 'TECHFLOW',
      creditLimit: 500000.00,
      creditUsed: 125000.00,
      paymentTerms: 'NET30',
      accountGroup: 'CUST',
      reconciliationAccount: '130000',
      riskCategory: 'Low',
      creditControlArea: '1000'
    },
    {
      customerNumber: '10002',
      customerName: 'GreenEarth Manufacturing',
      searchTerm: 'GREENEARTH',
      creditLimit: 300000.00,
      creditUsed: 85000.00,
      paymentTerms: 'NET30',
      accountGroup: 'CUST',
      reconciliationAccount: '130000',
      riskCategory: 'Medium',
      creditControlArea: '1000'
    }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'Cleared': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Disputed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgingColor = (aging: number): string => {
    if (aging <= 0) return 'text-green-600';
    if (aging <= 30) return 'text-yellow-600';
    if (aging <= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatAgingBucket = (aging: number): string => {
    if (aging <= 0) return 'Current';
    if (aging <= 30) return '1-30 Days';
    if (aging <= 60) return '31-60 Days';
    if (aging <= 90) return '61-90 Days';
    return '90+ Days';
  };

  const getTotalBalance = (): number => {
    return arLineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const getOverdueBalance = (): number => {
    return arLineItems.filter(item => item.aging > 0).reduce((sum, item) => sum + item.amount, 0);
  };

  const getCreditExposure = (): number => {
    return customerMasters.reduce((sum, customer) => sum + customer.creditUsed, 0);
  };

  const handlePaymentPosting = (item: ARLineItem): void => {
    console.log('Posting payment for:', item.documentNumber);
  };

  const handleClearingDocument = (item: ARLineItem): void => {
    console.log('Creating clearing document for:', item.documentNumber);
  };

  const handleBack = (): void => {
    window.history.back();
  };

  const filteredItems = selectedStatus === 'All'
    ? arLineItems
    : arLineItems.filter(item => item.status === selectedStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Accounts Receivable</h1>
          <Badge variant="secondary">SAP FI-AR</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companyCodes.map((cc: any) => (
                <SelectItem key={cc.id} value={cc.code}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Cleared">Cleared</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Payment Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(getTotalBalance())}</div>
                <p className="text-xs text-gray-600">Total AR Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(getOverdueBalance())}</div>
                <p className="text-xs text-gray-600">Overdue Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(getCreditExposure())}</div>
                <p className="text-xs text-gray-600">Credit Exposure</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{arLineItems.filter(item => item.status === 'Open').length}</div>
                <p className="text-xs text-gray-600">Open Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="line-items">Customer Line Items</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Master</TabsTrigger>
          <TabsTrigger value="processing">Payment Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="line-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Customer Line Items (FBL5N)
              </CardTitle>
              <CardDescription>
                Open and cleared customer line items for Company Code {selectedCompany}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Doc Type</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.customerNumber}</div>
                          <div className="text-sm text-gray-600">{item.customerName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{item.documentNumber}</TableCell>
                      <TableCell className="font-mono">{item.documentType}</TableCell>
                      <TableCell>{item.postingDate}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(item.amount)}</TableCell>
                      <TableCell className={getAgingColor(item.aging)}>
                        <div>
                          <div className="font-bold">{item.aging} days</div>
                          <div className="text-xs">{formatAgingBucket(item.aging)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.reference}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDialog(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {item.status === 'Open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePaymentPosting(item)}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aging Analysis</CardTitle>
              <CardDescription>Customer aging report by due date buckets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'].map((bucket, index) => {
                  const bucketItems = arLineItems.filter(item => {
                    if (index === 0) return item.aging <= 0;
                    if (index === 1) return item.aging > 0 && item.aging <= 30;
                    if (index === 2) return item.aging > 30 && item.aging <= 60;
                    if (index === 3) return item.aging > 60 && item.aging <= 90;
                    return item.aging > 90;
                  });
                  const bucketAmount = bucketItems.reduce((sum, item) => sum + item.amount, 0);

                  return (
                    <Card key={bucket} className={index === 0 ? "border-green-200" : index >= 3 ? "border-red-200" : "border-yellow-200"}>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h3 className="font-semibold">{bucket}</h3>
                          <p className="text-2xl font-bold mt-2">{formatAmount(bucketAmount)}</p>
                          <p className="text-sm text-gray-600">{bucketItems.length} items</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Master Data</CardTitle>
              <CardDescription>Customer credit management and account details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Credit Used</TableHead>
                    <TableHead>Available Credit</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Risk Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerMasters.map((customer) => (
                    <TableRow key={customer.customerNumber}>
                      <TableCell className="font-mono font-bold">{customer.customerNumber}</TableCell>
                      <TableCell>{customer.customerName}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(customer.creditLimit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(customer.creditUsed)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(customer.creditLimit - customer.creditUsed)}</TableCell>
                      <TableCell className="font-mono">{customer.paymentTerms}</TableCell>
                      <TableCell>
                        <Badge variant={customer.riskCategory === 'Low' ? 'default' : customer.riskCategory === 'Medium' ? 'secondary' : 'destructive'}>
                          {customer.riskCategory}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing Operations</CardTitle>
              <CardDescription>Customer payment entry and clearing operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Payment Entry (F-28)</h3>
                        <p className="text-sm text-gray-600">Post customer payments and apply to invoices</p>
                        <Button className="mt-2" size="sm">Enter Payment</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Manual Clearing (F-32)</h3>
                        <p className="text-sm text-gray-600">Clear open items manually with partial payments</p>
                        <Button className="mt-2" size="sm" variant="outline">Manual Clear</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Automatic Clearing (F.13)</h3>
                        <p className="text-sm text-gray-600">Run automatic clearing program</p>
                        <Button className="mt-2" size="sm" variant="outline">Auto Clear</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">Dunning Program</h3>
                        <p className="text-sm text-gray-600">Process dunning notices for overdue items</p>
                        <Button className="mt-2" size="sm" variant="outline">Run Dunning</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Line Item Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Line Item Details</DialogTitle>
            <DialogDescription>
              Document {selectedItem?.documentNumber} - Customer {selectedItem?.customerNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Number</Label>
                <Input value={selectedItem?.documentNumber || ''} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Input value={selectedItem?.documentType || ''} disabled className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input value={formatAmount(selectedItem?.amount || 0)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input value={selectedItem?.dueDate || ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input value={selectedItem?.paymentTerms || ''} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedItem?.status || ''}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Cleared">Cleared</SelectItem>
                    <SelectItem value="Disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={selectedItem?.reference || ''} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}