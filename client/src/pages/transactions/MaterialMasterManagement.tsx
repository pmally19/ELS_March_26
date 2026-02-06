import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, DollarSign, Activity } from 'lucide-react';
import { Link } from 'wouter';

interface Material {
  id: string;
  materialNumber: string;
  description: string;
  materialType: string;
  baseUnit: string;
  standardPrice: number;
  status: string;
}

export default function MaterialMasterManagement() {
  const { data: materialsData, isLoading } = useQuery({
    queryKey: ['/api/production-transaction-tiles/material-master-management'],
  });

  const materials = materialsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Blocked': 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading material master data...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Material Master Management</h1>
          <p className="text-muted-foreground">Material master data maintenance with classification and change documents</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Materials</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {materials.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Price</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              ${materials.length > 0 ? (materials.reduce((sum: number, mat: Material) => sum + mat.standardPrice, 0) / materials.length).toFixed(2) : '0.00'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Materials</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {materials.filter((mat: Material) => mat.status === 'Active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Material Types</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              {new Set(materials.map((mat: Material) => mat.materialType)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Master Data</CardTitle>
          <CardDescription>
            Complete material information with classification and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base Unit</TableHead>
                <TableHead>Standard Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material: Material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.materialNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      {material.description}
                    </div>
                  </TableCell>
                  <TableCell>{material.materialType}</TableCell>
                  <TableCell>{material.baseUnit}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {material.standardPrice.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(material.status)}>
                      {material.status}
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