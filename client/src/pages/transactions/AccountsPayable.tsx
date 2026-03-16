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
import { ArrowLeft, RefreshCw, Plus, Edit2, Building, CreditCard, Clock, DollarSign, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// SAP FI-AP Type Definitions
interface APLineItem {
  id: string;
  vendorNumber: string;
  vendorName: string;
  documentNumber: string;
  documentType: string;
  postingDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  paymentTerms: string;
  aging: number;
  status: 'Open' | 'Paid' | 'Parked' | 'Blocked';
  reference: string;
  companyCode: string;
  fiscalYear: string;
  period: string;
  assignment: string;
  text: string;
  baselineDate: string;
  cashDiscount: number;
  netDueDate: string;
  paymentMethod: string;
  purchaseOrder: string;
}

interface VendorMaster {
  vendorNumber: string;
  vendorName: string;
  searchTerm: string;
  paymentTerms: string;
  accountGroup: string;
  reconciliationAccount: string;
  paymentMethods: string[];
  bankDetails: string;
  withholdingTax: boolean;
  oneTimeVendor: boolean;
}

export default function AccountsPayable() {
  const permissions = useAgentPermissions();
  const [selectedItem, setSelectedItem] = useState<APLineItem | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<string>("line-items");

  const { data: apData, isLoading, refetch } = useQuery({
    queryKey: ['/api/finance/ap', selectedCompany],
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

  // SAP AP Line Items data
  const apLineItems: APLineItem[] = [
    {
      id: 'AP-001',
      vendorNumber: '20001',
      vendorName: 'Industrial Equipment Corp',
      documentNumber: '1900000002',
      documentType: 'KR',
      postingDate: '2025-07-06',
      dueDate: '2025-08-05',
      amount: 85000.00,
      currency: 'USD',
      paymentTerms: 'NET30',
      aging: 1,
      status: 'Open',
      reference: 'VND-INV-7890',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '007',
      assignment: 'VEND-20001',
      text: 'Equipment Purchase Invoice',
      baselineDate: '2025-07-06',
      cashDiscount: 2.0,
      netDueDate: '2025-08-05',
      paymentMethod: 'C',
      purchaseOrder: '4500000123'
    },
    {
      id: 'AP-002',
      vendorNumber: '20002',
      vendorName: 'Raw Materials Supplier Ltd',
      documentNumber: '1900000025',
      documentType: 'KR',
      postingDate: '2025-06-20',
      dueDate: '2025-07-20',
      amount: 42500.00,
      currency: 'USD',
      paymentTerms: 'NET30',
      aging: 18,
      status: 'Open',
      reference: 'VND-INV-3456',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '006',
      assignment: 'VEND-20002',
      text: 'Raw Materials Purchase',
      baselineDate: '2025-06-20',
      cashDiscount: 2.0,
      netDueDate: '2025-07-20',
      paymentMethod: 'T',
      purchaseOrder: '4500000145'
    },
    {
      id: 'AP-003',
      vendorNumber: '20003',
      vendorName: 'Utilities & Services Inc',
      documentNumber: '1900000034',
      documentType: 'KR',
      postingDate: '2025-07-01',
      dueDate: '2025-07-15',
      amount: 8500.00,
      currency: 'USD',
      paymentTerms: 'NET15',
      aging: 0,
      status: 'Blocked',
      reference: 'UTIL-INV-2025-07',
      companyCode: selectedCompany,
      fiscalYear: '2025',
      period: '007',
      assignment: 'VEND-20003',
      text: 'Monthly Utilities',
      baselineDate: '2025-07-01',
      cashDiscount: 0,
      netDueDate: '2025-07-15',
      paymentMethod: 'C',
      purchaseOrder: ''
    }
  ];

  const vendorMasters: VendorMaster[] = [
    {
      vendorNumber: '20001',
      vendorName: 'Industrial Equipment Corp',
      searchTerm: 'INDEQUIP',
      paymentTerms: 'NET30',
      accountGroup: 'KRED',
      reconciliationAccount: '200000',
      paymentMethods: ['C', 'T'],
      bankDetails: 'Chase Bank - ****1234',
      withholdingTax: false,
      oneTimeVendor: false
    },
    {
      vendorNumber: '20002',
      vendorName: 'Raw Materials Supplier Ltd',
      searchTerm: 'RAWMAT',
      paymentTerms: 'NET30',
      accountGroup: 'KRED',
      reconciliationAccount: '200000',
      paymentMethods: ['T', 'Z'],
      bankDetails: 'Wells Fargo - ****5678',
      withholdingTax: true,
      oneTimeVendor: false
    }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Parked': return 'bg-yellow-100 text-yellow-800';
      case 'Blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgingColor = (aging: number): string => {
    if (aging <= 0) return 'text-green-600';
    if (aging <= 15) return 'text-yellow-600';
    if (aging <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentMethodDescription = (method: string): string => {
    const methods: { [key: string]: string } = {
      'C': 'Check',
      'T': 'Bank Transfer',
      'Z': 'Electronic Payment',
      'B': 'Bill of Exchange',
      'K': 'Credit Card'
    };
    return methods[method] || 'Unknown';
  };

  const getTotalBalance = (): number => {
    return apLineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const getOverdueBalance = (): number => {
    return apLineItems.filter(item => item.aging > 0).reduce((sum, item) => sum + item.amount, 0);
  };

  const getDueThisWeek = (): number => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return apLineItems.filter(item => {
      const dueDate = new Date(item.dueDate);
      return dueDate >= today && dueDate <= nextWeek;
    }).reduce((sum, item) => sum + item.amount, 0);
  };

  const handlePaymentProposal = (item: APLineItem): void => {
    console.log('Creating payment proposal for:', item.documentNumber);
  };

  const handlePaymentRun = (): void => {
    console.log('Executing payment run');
  };

  const handleBack = (): void => {
    window.history.back();
  };

  const filteredItems = selectedStatus === 'All'
    ? apLineItems
    : apLineItems.filter(item => item.status === selectedStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Accounts Payable</h1>
          <Badge variant="secondary">SAP FI-AP</Badge>
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
              <SelectItem value="Blocked">Blocked</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default" onClick={handlePaymentRun}>
            <Plus className="h-4 w-4 mr-2" />
            Payment Run
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(getTotalBalance())}</div>
                <p className="text-xs text-gray-600">Total AP Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
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
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(getDueThisWeek())}</div>
                <p className="text-xs text-gray-600">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{apLineItems.filter(item => item.status === 'Open').length}</div>
                <p className="text-xs text-gray-600">Open Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="line-items">Vendor Line Items</TabsTrigger>
          <TabsTrigger value="payment-run">Payment Processing</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Master</TabsTrigger>
          <TabsTrigger value="analysis">AP Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="line-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vendor Line Items (FBL1N)
              </CardTitle>
              <CardDescription>
                Open and paid vendor line items for Company Code {selectedCompany}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Doc Type</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>PO Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.vendorNumber}</div>
                          <div className="text-sm text-gray-600">{item.vendorName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{item.documentNumber}</TableCell>
                      <TableCell className="font-mono">{item.documentType}</TableCell>
                      <TableCell>{item.postingDate}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(item.amount)}</TableCell>
                      <TableCell className={getAgingColor(item.aging)}>
                        <div className="font-bold">{item.aging} days</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono">{item.paymentMethod}</div>
                          <div className="text-xs text-gray-600">{getPaymentMethodDescription(item.paymentMethod)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{item.purchaseOrder || '-'}</TableCell>
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
                              onClick={() => handlePaymentProposal(item)}
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

        <TabsContent value="payment-run" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing (F110)</CardTitle>
              <CardDescription>Execute payment run and manage payment proposals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Payment Proposal</h3>
                        <p className="text-sm text-gray-600">Create payment proposal for due items</p>
                        <Button className="mt-2" size="sm">Create Proposal</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Payment Run</h3>
                        <p className="text-sm text-gray-600">Execute payment run and create payment documents</p>
                        <Button className="mt-2" size="sm" variant="outline">Execute Run</Button>
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
                        <p className="text-sm text-gray-600">Review blocked and exception items</p>
                        <Button className="mt-2" size="sm" variant="outline">Review Exceptions</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">Payment Documents</h3>
                        <p className="text-sm text-gray-600">Review and print payment documents</p>
                        <Button className="mt-2" size="sm" variant="outline">View Documents</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Payment Run Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{apLineItems.filter(item => item.status === 'Open').length}</div>
                    <div className="text-sm text-gray-600">Items to Process</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatAmount(getTotalBalance())}</div>
                    <div className="text-sm text-gray-600">Total Payment Amount</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{apLineItems.filter(item => item.status === 'Blocked').length}</div>
                    <div className="text-sm text-gray-600">Blocked Items</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Master Data</CardTitle>
              <CardDescription>Vendor payment terms and bank details management</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Number</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Payment Methods</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Withholding Tax</TableHead>
                    <TableHead>Account Group</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorMasters.map((vendor) => (
                    <TableRow key={vendor.vendorNumber}>
                      <TableCell className="font-mono font-bold">{vendor.vendorNumber}</TableCell>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell className="font-mono">{vendor.paymentTerms}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {vendor.paymentMethods.map(method => (
                            <Badge key={method} variant="outline" className="mr-1">
                              {method} - {getPaymentMethodDescription(method)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{vendor.bankDetails}</TableCell>
                      <TableCell>
                        <Badge variant={vendor.withholdingTax ? 'default' : 'outline'}>
                          {vendor.withholdingTax ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{vendor.accountGroup}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Payable Analysis</CardTitle>
              <CardDescription>Payment trends and vendor analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Average Payment Days</h3>
                        <p className="text-sm text-gray-600">
                          {Math.round(apLineItems.reduce((sum, item) => sum + item.aging, 0) / apLineItems.length)} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Building className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Active Vendors</h3>
                        <p className="text-sm text-gray-600">
                          {new Set(apLineItems.map(item => item.vendorNumber)).size} vendors
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Cash Discount Available</h3>
                        <p className="text-sm text-gray-600">
                          {formatAmount(apLineItems.reduce((sum, item) => sum + (item.amount * item.cashDiscount / 100), 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold">Late Payment Risk</h3>
                        <p className="text-sm text-gray-600">
                          {formatAmount(apLineItems.filter(item => item.aging > 0).reduce((sum, item) => sum + item.amount, 0))}
                        </p>
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
            <DialogTitle>Vendor Line Item Details</DialogTitle>
            <DialogDescription>
              Document {selectedItem?.documentNumber} - Vendor {selectedItem?.vendorNumber}
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
                <Label>Payment Method</Label>
                <Select value={selectedItem?.paymentMethod || ''}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Check</SelectItem>
                    <SelectItem value="T">Bank Transfer</SelectItem>
                    <SelectItem value="Z">Electronic Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedItem?.status || ''}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchase Order</Label>
              <Input value={selectedItem?.purchaseOrder || ''} className="font-mono" />
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