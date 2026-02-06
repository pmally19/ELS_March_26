import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield, Clock, AlertTriangle, DollarSign, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentAuthorizationTileProps {
  onBack: () => void;
}

export default function PaymentAuthorizationTile({ onBack }: PaymentAuthorizationTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [batchSelection, setBatchSelection] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [authorizationNotes, setAuthorizationNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending payments
  const { data: pendingPayments = [], isLoading } = useQuery({
    queryKey: ['/api/ap/pending-payments'],
    queryFn: async () => {
      const response = await fetch('/api/ap/pending-payments');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Fetch payment statistics
  const { data: paymentStats = {} } = useQuery({
    queryKey: ['/api/ap/payment-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/payment-statistics');
      if (!response.ok) return {};
      const data = await response.json();
      return data.data || data || {};
    },
  });

  // Fetch authorization limits
  const { data: authLimits = {} } = useQuery({
    queryKey: ['/api/ap/authorization-limits'],
    queryFn: async () => {
      const response = await fetch('/api/ap/authorization-limits');
      if (!response.ok) return {};
      const data = await response.json();
      return data.data || data || {};
    },
  });

  // Authorize payment mutation
  const authorizePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest('/api/ap/authorize-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    },
    onSuccess: (data: any) => {
      if (data.status === 'PENDING_DUAL_APPROVAL') {
        toast({
          title: "First Approval Recorded",
          description: `Awaiting second approval. ${data.currentApprovalCount}/${data.requiredApprovals} approvals complete.`,
        });
      } else {
        toast({
          title: "Payment Authorized",
          description: data.paymentTriggered
            ? "Payment authorized and processed successfully."
            : "Payment authorized successfully.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/ap/pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/payment-statistics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive",
      });
      // Invalidate queries to ensure UI reflects current state (e.g. if already authorized)
      queryClient.invalidateQueries({ queryKey: ['/api/ap/pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/payment-statistics'] });
    },
  });

  // Batch authorize mutation
  const batchAuthorizeMutation = useMutation({
    mutationFn: async (batchData: any) => {
      return await apiRequest('/api/ap/batch-authorize', {
        method: 'POST',
        body: JSON.stringify(batchData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Batch Authorization Complete",
        description: `${batchSelection.length} payments have been authorized.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/payment-statistics'] });
      setBatchSelection([]);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Authorization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredPayments = Array.isArray(pendingPayments)
    ? pendingPayments.filter((payment: any) =>
      payment.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'authorized':
        return <Badge className="bg-green-500 text-white">Authorized</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500 text-white">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
        return <Badge className="bg-red-500 text-white">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500 text-white">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const handleBatchAuthorize = () => {
    if (batchSelection.length === 0) {
      toast({
        title: "No Payments Selected",
        description: "Please select payments to authorize.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = Array.isArray(batchSelection) ? batchSelection.reduce((sum, id) => {
      const payment = pendingPayments?.find((p: any) => p.id === id);
      return sum + ((payment?.amount ?? 0));
    }, 0) : 0;

    batchAuthorizeMutation.mutate({
      payment_ids: batchSelection,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      authorized_by: 'Current User',
      authorized_date: new Date().toISOString(),
      notes: authorizationNotes
    });
  };

  const handleSingleAuthorize = (paymentId: string) => {
    const payment = Array.isArray(pendingPayments) ? pendingPayments.find((p: any) => p.id === paymentId) : null;
    authorizePaymentMutation.mutate({
      payment_id: paymentId,
      payment_amount: payment?.amount || 0,
      payment_method: paymentMethod || 'BANK_TRANSFER',
      authorized_by: 1, // TODO: Get from user context
      authorized_by_name: 'Current User',
      authorized_date: new Date().toISOString(),
      notes: authorizationNotes,
      source_type: payment?.source_type || 'PO'
    });
  };

  const togglePaymentSelection = (paymentId: string) => {
    setBatchSelection(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Authorization</h2>
        <Button variant="outline" onClick={onBack}>
          Back to AP Dashboard
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {paymentStats.pending_count || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Authorized Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {paymentStats.authorized_today || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily Limit Used</p>
                <p className="text-2xl font-bold text-blue-600">
                  {paymentStats.daily_limit_used || 0}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {paymentStats.high_risk_count || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authorization Limits */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-blue-900">Authorization Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
              <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Daily Limit</p>
              <p className="text-lg font-bold">${authLimits.daily_limit?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-600">
                Used: ${authLimits.used_today?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Single Payment</p>
              <p className="text-lg font-bold">${authLimits.single_payment_limit?.toLocaleString() || '0'}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
              <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Dual Approval</p>
              <p className="text-lg font-bold">${authLimits.dual_approval_threshold?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Authorization */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Authorization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Corporate Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Authorization Notes</Label>
              <Input
                value={authorizationNotes}
                onChange={(e) => setAuthorizationNotes(e.target.value)}
                placeholder="Optional authorization notes"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleBatchAuthorize}
                disabled={batchSelection.length === 0 || batchAuthorizeMutation.isPending}
                className="w-full"
              >
                {batchAuthorizeMutation.isPending ? 'Authorizing...' : `Authorize ${batchSelection.length} Payments`}
              </Button>
            </div>
          </div>

          {batchSelection.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium">
                Selected: {batchSelection.length} payments,
                Total: ${Array.isArray(batchSelection) ? Number(batchSelection.reduce((sum, id) => {
                  const payment = pendingPayments?.find((p: any) => p.id === id);
                  return sum + (Number(payment?.amount) || 0);
                }, 0)).toFixed(2) : '0.00'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Payments</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Select</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Auth Level</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No pending payments found</TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Checkbox
                          checked={batchSelection.includes(payment.id)}
                          onCheckedChange={() => togglePaymentSelection(payment.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{payment.vendor_name || 'Unknown Vendor'}</TableCell>
                      <TableCell className="font-mono">{payment.invoice_number || '-'}</TableCell>
                      <TableCell>${(Number(payment.amount) || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs">
                            {payment.required_level || 'Standard'}
                          </Badge>
                          {payment.requires_dual_approval && (
                            <Badge className="bg-purple-500 text-white text-xs">
                              Dual {payment.approval_count || 0}/{payment.required_approvals || 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRiskBadge(payment.risk_level || 'low')}</TableCell>
                      <TableCell>
                        {payment.authorization_status === 'PENDING_DUAL_APPROVAL' ? (
                          <Badge className="bg-orange-500 text-white">Awaiting 2nd Approval</Badge>
                        ) : (
                          getStatusBadge(payment.status || 'pending')
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSingleAuthorize(payment.id)}
                          disabled={authorizePaymentMutation.isPending}
                        >
                          {payment.requires_dual_approval && payment.approval_count === 1
                            ? '2nd Approve'
                            : 'Authorize'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}