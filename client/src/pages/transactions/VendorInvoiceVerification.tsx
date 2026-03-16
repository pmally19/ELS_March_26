import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileCheck, DollarSign, Package, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

interface VendorInvoiceVerification {
  id: string;
  vendor: string;
  invoiceNumber: string;
  amount: number;
  poNumber: string;
  status: string;
  matchingStatus: string;
}

export default function VendorInvoiceVerification() {
  const { data: verificationsData, isLoading } = useQuery({
    queryKey: ['/api/production-transaction-tiles/vendor-invoice-verification'],
  });

  const verifications = verificationsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Verified': 'bg-green-100 text-green-800',
      'Pending Verification': 'bg-yellow-100 text-yellow-800',
      'Exception': 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getMatchingBadge = (status: string) => {
    const variants: Record<string, string> = {
      '3-Way Match Complete': 'bg-green-100 text-green-800',
      'GR Pending': 'bg-blue-100 text-blue-800',
      'Price Variance': 'bg-orange-100 text-orange-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileCheck className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading vendor invoice verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Invoice Verification</h1>
          <p className="text-muted-foreground">3-way matching for purchase orders, goods receipts, and invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Verifications</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <FileCheck className="h-5 w-5 mr-2" />
              {verifications.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              ${verifications.reduce((sum: number, item: VendorInvoiceVerification) => sum + item.amount, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {verifications.filter((item: VendorInvoiceVerification) => item.status === 'Verified').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>3-Way Match Complete</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              {verifications.filter((item: VendorInvoiceVerification) => item.matchingStatus === '3-Way Match Complete').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Verifications</CardTitle>
          <CardDescription>
            3-way matching with purchase orders, goods receipts, and vendor invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Verification ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice Number</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matching Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((verification: VendorInvoiceVerification) => (
                <TableRow key={verification.id}>
                  <TableCell className="font-medium">{verification.id}</TableCell>
                  <TableCell>{verification.vendor}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <FileCheck className="h-4 w-4 mr-2" />
                      {verification.invoiceNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      {verification.poNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {verification.amount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(verification.status)}>
                      {verification.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMatchingBadge(verification.matchingStatus)}>
                      {verification.matchingStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}