import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

interface MaterialDocument {
  id: string;
  documentNumber: string;
  documentType: string;
  postingDate: string;
  documentDate: string;
  materialNumber: string;
  materialDescription: string;
  plant: string;
  storageLocation: string;
  movementType: string;
  movementDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalValue: number;
  currency: string;
  referenceDocument: string;
  costCenter: string;
  vendorNumber: string;
  customerNumber: string;
  batch: string;
  reasonCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function MaterialDocument() {
  const [activeTab, setActiveTab] = useState<string>("documents");

  const { data: documentData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/material-document'],
  });

  const documents = documentData?.data || [];

  const getMovementTypeIcon = (movementType: string) => {
    if (movementType.startsWith('1') || movementType.startsWith('5')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (movementType.startsWith('2') || movementType.startsWith('6')) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else if (movementType.startsWith('3')) {
      return <RotateCcw className="h-4 w-4 text-blue-600" />;
    }
    return <Package className="h-4 w-4 text-gray-600" />;
  };

  const getMovementTypeColor = (movementType: string): string => {
    if (movementType.startsWith('1') || movementType.startsWith('5')) {
      return 'bg-green-100 text-green-800';
    } else if (movementType.startsWith('2') || movementType.startsWith('6')) {
      return 'bg-red-100 text-red-800';
    } else if (movementType.startsWith('3')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatQuantity = (quantity: number, uom: string): string => {
    return `${quantity.toLocaleString()} ${uom}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Material Document</h1>
          <Badge variant="secondary">SAP MIGO</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{documents.length}</div>
                <p className="text-xs text-gray-600">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {documents.filter(doc => doc.movementType.startsWith('1') || doc.movementType.startsWith('5')).length}
                </div>
                <p className="text-xs text-gray-600">Goods Receipts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {documents.filter(doc => doc.movementType.startsWith('2') || doc.movementType.startsWith('6')).length}
                </div>
                <p className="text-xs text-gray-600">Goods Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {documents.filter(doc => doc.movementType.startsWith('3')).length}
                </div>
                <p className="text-xs text-gray-600">Stock Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents">Material Documents</TabsTrigger>
          <TabsTrigger value="movements">Movement Types</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Material Documents (MB03)</CardTitle>
              <CardDescription>Inventory movements and stock transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Plant/Storage Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Posting Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono font-bold">{doc.documentNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getMovementTypeIcon(doc.movementType)}
                          <div>
                            <Badge className={getMovementTypeColor(doc.movementType)}>
                              {doc.movementType}
                            </Badge>
                            <div className="text-xs text-gray-600 mt-1">{doc.movementDescription}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono font-bold">{doc.materialNumber}</div>
                          <div className="text-sm text-gray-600">{doc.materialDescription}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono">{doc.plant}</div>
                          <div className="text-sm text-gray-600">{doc.storageLocation}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono font-bold">{formatQuantity(doc.quantity, doc.unitOfMeasure)}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(doc.unitPrice)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatAmount(doc.totalValue)}</TableCell>
                      <TableCell className="font-mono">{doc.referenceDocument}</TableCell>
                      <TableCell>{doc.postingDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Movement Types</CardTitle>
              <CardDescription>Standard SAP movement type definitions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Goods Receipt (101)</h3>
                        <p className="text-sm text-gray-600">Purchase order receipt to unrestricted stock</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingDown className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold">Goods Issue (201)</h3>
                        <p className="text-sm text-gray-600">Issue to cost center or consumption</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RotateCcw className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Stock Transfer (311)</h3>
                        <p className="text-sm text-gray-600">Transfer between storage locations</p>
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