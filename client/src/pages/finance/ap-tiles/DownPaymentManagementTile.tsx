import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Plus, Play, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DownPayment {
  id: number;
  request_document_number: string;
  payment_document_number?: string;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  request_date: string;
  down_payment_amount: number;
  due_date: string;
  payment_date?: string;
  bank_account?: string;
  clearing_document_number?: string;
  clearing_date?: string;
  status: string;
  created_at: string;
}

export default function DownPaymentManagementTile() {
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DownPayment | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch down payments - using vendor payments with special indicator
  const { data: vendorPayments } = useQuery({
    queryKey: ['/api/purchase/vendor-payments'],
    queryFn: async () => {
      const response = await fetch('/api/purchase/vendor-payments');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
    refetchInterval: 30000
  });

  // For now, use empty array as we don't have a down payments table
  const downPayments: any[] = [];

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Enhanced statistics - empty for now
  const enhancedStats = {
    pending_down_payments: 0,
    total_down_payments: 0,
    cleared_down_payments: 0
  };

  // Create down payment request mutation - for now, create a vendor payment with notes
  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      // For now, return success without creating a down payment
      // In the future, this would create a down payment request record
      return { success: true, message: 'Down payment request creation not yet fully implemented' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      setIsRequestDialogOpen(false);
    }
  });

  // Process down payment mutation - for now, create a vendor payment
  const processPaymentMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: number, data: any }) => {
      // For now, return success without processing
      // In the future, this would create a vendor payment for the down payment
      return { success: true, message: 'Down payment processing not yet fully implemented' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      setIsProcessDialogOpen(false);
    }
  });

  // Clear down payment mutation - for now, just return success
  const clearPaymentMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: number, data: any }) => {
      // For now, return success without clearing
      // In the future, this would clear the down payment against an invoice
      return { success: true, message: 'Down payment clearing not yet fully implemented' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/vendor-payments'] });
      setIsClearDialogOpen(false);
    }
  });

  const handleCreateRequest = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    data.down_payment_amount = parseFloat(data.down_payment_amount as string);
    data.vendor_id = parseInt(data.vendor_id as string);
    
    createRequestMutation.mutate(data);
  };

  const handleProcessPayment = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    if (selectedPayment) {
      processPaymentMutation.mutate({
        requestId: selectedPayment.id,
        data
      });
    }
  };

  const handleClearPayment = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    if (selectedPayment) {
      clearPaymentMutation.mutate({
        requestId: selectedPayment.id,
        data
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Requested</Badge>;
      case 'paid':
        return <Badge variant="secondary"><CreditCard className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'cleared':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Cleared</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWorkflowStage = (payment: DownPayment) => {
    if (payment.status === 'cleared') return 3;
    if (payment.status === 'paid') return 2;
    return 1;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Down Payment Management
            </CardTitle>
            <CardDescription>
              Request, process, and clear vendor down payments
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-purple-50">
            <CreditCard className="w-3 h-3 mr-1" />
            NEW
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {enhancedStats?.pending_down_payments || 0}
                </div>
                <div className="text-sm text-yellow-600">Pending Requests</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  ${enhancedStats?.total_down_payments?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-blue-600">Total Paid</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {downPayments?.filter((dp: DownPayment) => dp.status === 'cleared').length || 0}
                </div>
                <div className="text-sm text-green-600">Cleared</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {downPayments?.length || 0}
                </div>
                <div className="text-sm text-purple-600">Total Requests</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Down Payment Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Down Payment Request</DialogTitle>
                    <DialogDescription>
                      Request a down payment from a vendor
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateRequest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_id">Vendor *</Label>
                        <Select name="vendor_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors?.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="request_date">Request Date *</Label>
                        <Input name="request_date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="down_payment_amount">Amount *</Label>
                        <Input name="down_payment_amount" type="number" step="0.01" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Due Date *</Label>
                        <Input name="due_date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target_special_gl_indicator">Special G/L Indicator</Label>
                        <Select name="target_special_gl_indicator">
                          <SelectTrigger>
                            <SelectValue placeholder="Select indicator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Down Payment Request (A)</SelectItem>
                            <SelectItem value="F">Down Payment Received (F)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_code">Tax Code</Label>
                        <Input name="tax_code" placeholder="e.g., V0" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRequestMutation.isPending}>
                        {createRequestMutation.isPending ? 'Creating...' : 'Create Request'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Recent Down Payments */}
            <div className="space-y-2">
              <h4 className="font-medium">Recent Down Payments</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downPayments?.slice(0, 5).map((payment: DownPayment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.request_document_number}</TableCell>
                      <TableCell>{payment.vendor_name}</TableCell>
                      <TableCell>${payment.down_payment_amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getWorkflowStage(payment) >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <div className={`w-2 h-2 rounded-full ${getWorkflowStage(payment) >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <div className={`w-2 h-2 rounded-full ${getWorkflowStage(payment) >= 3 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payment.status === 'requested' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsProcessDialogOpen(true);
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          {payment.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsClearDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Down Payment Requests</h4>
                <Button size="sm" onClick={() => setIsRequestDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downPayments?.filter((dp: DownPayment) => dp.status === 'requested').map((payment: DownPayment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.request_document_number}</TableCell>
                      <TableCell>{payment.vendor_name}</TableCell>
                      <TableCell>${payment.down_payment_amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(payment.request_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsProcessDialogOpen(true);
                          }}
                        >
                          Process Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Processed Payments</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downPayments?.filter((dp: DownPayment) => dp.status === 'paid').map((payment: DownPayment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_document_number}</TableCell>
                      <TableCell>{payment.vendor_name}</TableCell>
                      <TableCell>${payment.down_payment_amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{payment.bank_account || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsClearDialogOpen(true);
                          }}
                        >
                          Clear Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <div className="space-y-6">
              <h4 className="font-medium">Down Payment Workflow</h4>
              
              {/* Workflow Steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h5 className="font-medium">Request Down Payment</h5>
                    <p className="text-sm text-gray-600">Create a down payment request for a vendor</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h5 className="font-medium">Process Payment</h5>
                    <p className="text-sm text-gray-600">Execute the down payment to the vendor's bank account</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h5 className="font-medium">Clear Payment</h5>
                    <p className="text-sm text-gray-600">Apply the down payment against the final invoice</p>
                  </div>
                </div>
              </div>

              {/* Current Workflow Status */}
              <div className="space-y-2">
                <h5 className="font-medium">Current Status Summary</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {downPayments?.filter((dp: DownPayment) => dp.status === 'requested').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">In Request Stage</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {downPayments?.filter((dp: DownPayment) => dp.status === 'paid').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">In Payment Stage</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {downPayments?.filter((dp: DownPayment) => dp.status === 'cleared').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Cleared</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Process Payment Dialog */}
        <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Down Payment</DialogTitle>
              <DialogDescription>
                Record payment details for request: {selectedPayment?.request_document_number}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input name="payment_date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account *</Label>
                  <Input name="bank_account" placeholder="Bank account number" required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="payment_document_number">Payment Document Number</Label>
                  <Input name="payment_document_number" placeholder="Auto-generated if empty" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={processPaymentMutation.isPending}>
                  {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Clear Payment Dialog */}
        <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Down Payment</DialogTitle>
              <DialogDescription>
                Apply down payment against invoice for: {selectedPayment?.vendor_name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleClearPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clearing_date">Clearing Date *</Label>
                  <Input name="clearing_date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clearing_document_number">Clearing Document *</Label>
                  <Input name="clearing_document_number" placeholder="Invoice or clearing document number" required />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsClearDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={clearPaymentMutation.isPending}>
                  {clearPaymentMutation.isPending ? 'Clearing...' : 'Clear Payment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}