import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, FileText, CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
// Type definitions
interface TransactionRecord {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  date: Date;
  amount: number;
  description: string;
  reference: string;
}

export default function StockTransfer() {
  const permissions = useAgentPermissions();

  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<TransactionRecord | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = (): void => {
    setLoading(true);
    setError(null);
    
    // Simulate data loading with realistic ERP data
    setTimeout(() => {
      const sampleData: TransactionRecord[] = [
        {
          id: 'STOCKTRANSFER-001',
          name: 'Transaction Record 001',
          status: 'active',
          date: new Date(),
          amount: 15000,
          description: 'Sample stocktransfer transaction',
          reference: 'REF-' + Date.now()
        },
        {
          id: 'STOCKTRANSFER-002',
          name: 'Transaction Record 002',
          status: 'pending',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          amount: 8500,
          description: 'Pending stocktransfer process',
          reference: 'REF-' + (Date.now() - 1000)
        },
        {
          id: 'STOCKTRANSFER-003',
          name: 'Transaction Record 003',
          status: 'completed',
          date: new Date(Date.now() - 48 * 60 * 60 * 1000),
          amount: 12750,
          description: 'Completed stocktransfer entry',
          reference: 'REF-' + (Date.now() - 2000)
        }
      ];
      
      setData(sampleData);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSave = (): void => {
    setLoading(true);
    setTimeout(() => {
      setShowDialog(false);
      setSelectedItem(null);
      setLoading(false);
      handleRefresh();
    }, 500);
  };

  const handleBack = (): void => {
    window.history.back();
  };

  const handleEdit = (item: TransactionRecord): void => {
    setSelectedItem(item);
    setShowDialog(true);
  };

  const handleView = (item: TransactionRecord): void => {
    setSelectedItem(item);
  };

  const handleAddNew = (): void => {
    setSelectedItem(null);
    setShowDialog(true);
  };

  const handleCloseDialog = (): void => {
    setShowDialog(false);
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">StockTransfer</h1>
              <p className="text-gray-600 mt-1">Manage stocktransfer transactions and processes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              type="button"
            >
              <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
              Refresh
            </Button>
            <Button onClick={handleAddNew} disabled={loading} type="button">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold">{data.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{data.filter(item => item.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{data.filter(item => item.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">${data.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>StockTransfer Records</CardTitle>
            <CardDescription>
              Manage and view all stocktransfer transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.id}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.date.toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">${item.amount?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.reference}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              type="button"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(item)}
                              type="button"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit' : 'Add'} Record</DialogTitle>
            <DialogDescription>
              {selectedItem ? 'Update the record details' : 'Create a new record'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name"
                defaultValue={selectedItem?.name || ''} 
                placeholder="Enter record name" 
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select defaultValue={selectedItem?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount"
                type="number" 
                defaultValue={selectedItem?.amount || ''} 
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description"
                defaultValue={selectedItem?.description || ''} 
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} type="button">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} type="button">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}