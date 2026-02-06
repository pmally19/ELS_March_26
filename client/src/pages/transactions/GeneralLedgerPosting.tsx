import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';

interface GeneralLedgerPosting {
  id: string;
  documentNumber: string;
  documentType: string;
  companyCode: string;
  postingDate: string;
  documentDate: string;
  fiscalYear: string;
  period: string;
  reference: string;
  headerText: string;
  reversalReason: string;
  reversalDate: string;
  reversalDocument: string;
  documentStatus: string;
  entryDate: string;
  entryTime: string;
  username: string;
  workstation: string;
  transactionCode: string;
  documentHeaderText: string;
  clearingNumber: string;
  clearingDate: string;
  exchangeRate: number;
  localCurrency: string;
  documentCurrency: string;
  controllingArea: string;
  businessArea: string;
  segment: string;
  profitCenter: string;
  functionalArea: string;
  totalDebitAmount: number;
  totalCreditAmount: number;
  balance: number;
  numberOfLineItems: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function GeneralLedgerPosting() {
  const [activeTab, setActiveTab] = useState<string>("documents");

  const { data: postingData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/general-ledger-posting'],
  });

  const postings = postingData?.data || [];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Posted': return 'bg-green-100 text-green-800';
      case 'Parked': return 'bg-yellow-100 text-yellow-800';
      case 'Hold': return 'bg-orange-100 text-orange-800';
      case 'Reversed': return 'bg-red-100 text-red-800';
      case 'Cleared': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isBalanced = (debit: number, credit: number): boolean => {
    return Math.abs(debit - credit) < 0.01;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">General Ledger Posting</h1>
          <Badge variant="secondary">SAP FB01/FB02</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{postings.length}</div>
                <p className="text-xs text-gray-600">Total Documents</p>
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
                  {formatAmount(postings.reduce((sum, posting) => sum + posting.totalDebitAmount, 0))}
                </div>
                <p className="text-xs text-gray-600">Total Debits</p>
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
                  {postings.filter(posting => posting.documentStatus === 'Posted').length}
                </div>
                <p className="text-xs text-gray-600">Posted Documents</p>
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
                  {postings.filter(posting => posting.documentStatus === 'Parked').length}
                </div>
                <p className="text-xs text-gray-600">Parked Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents">GL Documents</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger Documents (FB03)</CardTitle>
              <CardDescription>General ledger posting documents and journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Header Text</TableHead>
                    <TableHead>Debit Amount</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Balance Check</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Line Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postings.map((posting) => (
                    <TableRow key={posting.id}>
                      <TableCell className="font-mono font-bold">{posting.documentNumber}</TableCell>
                      <TableCell className="font-mono">{posting.companyCode}</TableCell>
                      <TableCell>{posting.postingDate}</TableCell>
                      <TableCell className="font-mono">{posting.reference}</TableCell>
                      <TableCell>{posting.headerText}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatAmount(posting.totalDebitAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatAmount(posting.totalCreditAmount)}
                      </TableCell>
                      <TableCell>
                        {isBalanced(posting.totalDebitAmount, posting.totalCreditAmount) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(posting.documentStatus)}>
                          {posting.documentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{posting.numberOfLineItems}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entry Processing</CardTitle>
              <CardDescription>Journal entry workflow and document management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Create Journal Entry</h3>
                        <p className="text-sm text-gray-600">Post new general ledger transactions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Park Document</h3>
                        <p className="text-sm text-gray-600">Save incomplete entries for later completion</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Post Document</h3>
                        <p className="text-sm text-gray-600">Finalize and post journal entries</p>
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