import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';

interface GoodsReceipt {
  id: string;
  poNumber: string;
  vendor: string;
  material: string;
  quantity: number;
  unit: string;
  status: string;
  qualityInspection: string;
}

export default function GoodsReceiptProcessing() {
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['/api/production-transaction-tiles/goods-receipt-processing'],
  });

  const receipts = receiptsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Posted': 'bg-green-100 text-green-800',
      'Quality Check': 'bg-yellow-100 text-yellow-800',
      'Pending': 'bg-blue-100 text-blue-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getQualityBadge = (inspection: string) => {
    const variants: Record<string, string> = {
      'Passed': 'bg-green-100 text-green-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Failed': 'bg-red-100 text-red-800'
    };
    return variants[inspection] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading goods receipts...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Goods Receipt Processing</h1>
          <p className="text-muted-foreground">Receiving operations with quality inspection integration</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Receipts</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {receipts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Posted</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {receipts.filter((receipt: GoodsReceipt) => receipt.status === 'Posted').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quality Passed</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              {receipts.filter((receipt: GoodsReceipt) => receipt.qualityInspection === 'Passed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Quality</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              {receipts.filter((receipt: GoodsReceipt) => receipt.qualityInspection === 'In Progress').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Goods Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
          <CardDescription>
            Receiving operations with automated quality inspection workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quality Inspection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt: GoodsReceipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.id}</TableCell>
                  <TableCell>{receipt.poNumber}</TableCell>
                  <TableCell>{receipt.vendor}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      {receipt.material}
                    </div>
                  </TableCell>
                  <TableCell>
                    {receipt.quantity.toLocaleString()} {receipt.unit}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getQualityBadge(receipt.qualityInspection)}>
                      {receipt.qualityInspection}
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