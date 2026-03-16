import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, RefreshCw, FileText, CheckCircle, Clock, DollarSign,
  AlertCircle, BookOpen, ArrowRight, Printer, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// ─── Types ────────────────────────────────────────────────
interface BillingDocument {
  id: number;
  billingNumber: string;
  billingType: string;
  billingTypeLabel: string;
  billingDate: string;
  dueDate: string;
  currency: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  postingStatus: string;
  accountingDocumentNumber: string | null;
  reference: string | null;
  salesOrderId: number | null;
  salesOrderNumber: string | null;
  deliveryId: number | null;
  deliveryNumber: string | null;
  customerId: number;
  customerName: string;
  customerCode: string | null;
}

interface BillingDueItem {
  deliveryId: number;
  deliveryNumber: string;
  deliveryDate: string;
  pgiDate: string;
  salesOrderNumber: string | null;
  customerName: string;
  customerCode: string | null;
  itemCount: number;
  estimatedNetValue: number;
}

interface BillingSummary {
  totalDocuments: number;
  postedCount: number;
  openCount: number;
  totalBilled: number;
  totalOutstanding: number;
  thisMonthBilled: number;
}

// ─── Helpers ──────────────────────────────────────────────
const fmt = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function billingTypeBadgeColor(type: string) {
  const map: Record<string, string> = {
    F2: 'bg-blue-100 text-blue-800',
    G2: 'bg-green-100 text-green-800',
    L2: 'bg-orange-100 text-orange-800',
    RE: 'bg-red-100 text-red-800',
    OR: 'bg-blue-100 text-blue-800',
    F5: 'bg-purple-100 text-purple-800',
  };
  return map[type] || 'bg-gray-100 text-gray-800';
}

function statusBadgeColor(status: string) {
  const map: Record<string, string> = {
    POSTED: 'bg-green-100 text-green-700',
    OPEN: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

// ─── Main Component ───────────────────────────────────────
export default function SalesBilling() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedBilling, setSelectedBilling] = useState<BillingDocument | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // ── Data Fetching ──────────────────────────────────────
  const summaryQ = useQuery<BillingSummary>({
    queryKey: ['/api/billing/summary'],
  });

  const documentsQ = useQuery<BillingDocument[]>({
    queryKey: ['/api/billing/documents'],
  });

  const dueListQ = useQuery<BillingDueItem[]>({
    queryKey: ['/api/billing/due-list'],
  });

  const detailQ = useQuery({
    queryKey: ['/api/billing/documents', selectedBilling?.id],
    enabled: !!selectedBilling && showDetail,
  });

  // ── Mutations ─────────────────────────────────────────
  const postToGLMutation = useMutation({
    mutationFn: (billingId: number) =>
      apiRequest(`/api/billing/documents/${billingId}/post`, { method: 'POST' }),
    onSuccess: (_, billingId) => {
      toast({ title: '✅ GL Posting Successful', description: `Billing document posted to accounting.` });
      qc.invalidateQueries({ queryKey: ['/api/billing/documents'] });
      qc.invalidateQueries({ queryKey: ['/api/billing/summary'] });
    },
    onError: (err: any) => {
      toast({ title: 'GL Posting Failed', description: err.message, variant: 'destructive' });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: (deliveryId: number) =>
      apiRequest('/api/billing/documents', { method: 'POST', body: JSON.stringify({ deliveryId, billingType: 'F2' }) }),
    onSuccess: () => {
      toast({ title: '✅ Billing Created', description: 'Billing document created from delivery.' });
      qc.invalidateQueries({ queryKey: ['/api/billing/documents'] });
      qc.invalidateQueries({ queryKey: ['/api/billing/due-list'] });
      qc.invalidateQueries({ queryKey: ['/api/billing/summary'] });
    },
    onError: (err: any) => {
      toast({ title: 'Billing Creation Failed', description: err.message, variant: 'destructive' });
    },
  });

  const summary = summaryQ.data;
  const documents = documentsQ.data || [];
  const dueList = dueListQ.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto p-6 space-y-6">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Sales Billing</h1>
              <p className="text-slate-500 text-sm mt-0.5">SAP equivalent: VF01 / VF02 / VF04</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { documentsQ.refetch(); dueListQ.refetch(); summaryQ.refetch(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Documents', value: summary?.totalDocuments ?? '—', icon: FileText, color: 'text-blue-600' },
            { label: 'Posted to GL', value: summary?.postedCount ?? '—', icon: CheckCircle, color: 'text-green-600' },
            { label: 'Open / Pending', value: summary?.openCount ?? '—', icon: Clock, color: 'text-yellow-600' },
            { label: 'This Month Billed', value: summary ? fmt(summary.thisMonthBilled) : '—', icon: DollarSign, color: 'text-purple-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${color}`} />
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Tabs ─────────────────────────────────── */}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Billing Documents
              {documents.length > 0 && <Badge className="ml-2 bg-blue-100 text-blue-800">{documents.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="due-list">
              <Clock className="h-4 w-4 mr-2" />
              Billing Due List (VF04)
              {dueList.length > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-800">{dueList.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── Documents Tab ────────────────────────────── */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Billing Documents (VBRK)</CardTitle>
                <CardDescription>All billing invoices, credit memos, and debit memos</CardDescription>
              </CardHeader>
              <CardContent>
                {documentsQ.isLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-slate-500">Loading billing documents...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center p-12 text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No billing documents found.</p>
                    <p className="text-sm mt-1">Create billing from the Due List tab or from a Delivery.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Billing No.</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Billing Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Net</TableHead>
                          <TableHead>Tax</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>GL Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map(bd => (
                          <TableRow key={bd.id}>
                            <TableCell className="font-mono font-semibold text-blue-700">{bd.billingNumber}</TableCell>
                            <TableCell>
                              <Badge className={billingTypeBadgeColor(bd.billingType)}>
                                {bd.billingType} — {bd.billingTypeLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{bd.customerName}</div>
                              {bd.customerCode && <div className="text-xs text-slate-400">{bd.customerCode}</div>}
                            </TableCell>
                            <TableCell>{fmtDate(bd.billingDate)}</TableCell>
                            <TableCell>{fmtDate(bd.dueDate)}</TableCell>
                            <TableCell className="font-mono">{fmt(bd.netAmount, bd.currency)}</TableCell>
                            <TableCell className="font-mono text-slate-500">{fmt(bd.taxAmount, bd.currency)}</TableCell>
                            <TableCell className="font-mono font-semibold">{fmt(bd.totalAmount, bd.currency)}</TableCell>
                            <TableCell>
                              <Badge className={statusBadgeColor(bd.postingStatus)}>
                                {bd.postingStatus}
                              </Badge>
                              {bd.accountingDocumentNumber && (
                                <div className="text-xs text-slate-400 mt-0.5">{bd.accountingDocumentNumber}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => { setSelectedBilling(bd); setShowDetail(true); }}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                {bd.postingStatus !== 'POSTED' && (
                                  <Button
                                    size="sm" variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                    disabled={postToGLMutation.isPending}
                                    onClick={() => postToGLMutation.mutate(bd.id)}
                                  >
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    Post GL
                                  </Button>
                                )}
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
          </TabsContent>

          {/* ── Due List Tab (VF04) ──────────────────────── */}
          <TabsContent value="due-list">
            <Card>
              <CardHeader>
                <CardTitle>Billing Due List — VF04</CardTitle>
                <CardDescription>
                  Deliveries with Post Goods Issue (PGI) completed, pending invoice creation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dueListQ.isLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-slate-500">Loading due list...</span>
                  </div>
                ) : dueList.length === 0 ? (
                  <div className="text-center p-12 text-slate-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-50" />
                    <p>No deliveries pending billing.</p>
                    <p className="text-sm mt-1">All PGI-posted deliveries have been billed!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Delivery No.</TableHead>
                          <TableHead>Sales Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Delivery Date</TableHead>
                          <TableHead>PGI Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Est. Net Value</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dueList.map(item => (
                          <TableRow key={item.deliveryId}>
                            <TableCell className="font-mono font-semibold text-blue-700">{item.deliveryNumber}</TableCell>
                            <TableCell className="font-mono">{item.salesOrderNumber || '—'}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.customerName}</div>
                              {item.customerCode && <div className="text-xs text-slate-400">{item.customerCode}</div>}
                            </TableCell>
                            <TableCell>{fmtDate(item.deliveryDate)}</TableCell>
                            <TableCell>{fmtDate(item.pgiDate)}</TableCell>
                            <TableCell className="text-center">{item.itemCount}</TableCell>
                            <TableCell className="font-mono">{fmt(item.estimatedNetValue)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                disabled={createBillingMutation.isPending}
                                onClick={() => createBillingMutation.mutate(item.deliveryId)}
                              >
                                {createBillingMutation.isPending ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                )}
                                Create F2 Invoice
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Detail Dialog ─────────────────────────────── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Billing Document: {selectedBilling?.billingNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedBilling && (
            <div className="space-y-5">
              {/* Header Info (VBRK) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-slate-400">Billing Type</p>
                  <Badge className={billingTypeBadgeColor(selectedBilling.billingType)}>
                    {selectedBilling.billingType} — {selectedBilling.billingTypeLabel}
                  </Badge>
                </div>
                <div><p className="text-slate-400">Customer (Payer)</p><p className="font-semibold">{selectedBilling.customerName}</p></div>
                <div><p className="text-slate-400">Billing Date</p><p>{fmtDate(selectedBilling.billingDate)}</p></div>
                <div><p className="text-slate-400">Due Date</p><p className={new Date(selectedBilling.dueDate) < new Date() && selectedBilling.postingStatus !== 'POSTED' ? 'text-red-600 font-semibold' : ''}>{fmtDate(selectedBilling.dueDate)}</p></div>
                <div><p className="text-slate-400">Reference Sales Order</p><p className="font-mono">{selectedBilling.salesOrderNumber || '—'}</p></div>
                <div><p className="text-slate-400">Reference Delivery</p><p className="font-mono">{selectedBilling.deliveryNumber || '—'}</p></div>
                <div><p className="text-slate-400">GL Posting Status</p>
                  <Badge className={statusBadgeColor(selectedBilling.postingStatus)}>{selectedBilling.postingStatus}</Badge>
                </div>
                {selectedBilling.accountingDocumentNumber && (
                  <div><p className="text-slate-400">Accounting Doc.</p><p className="font-mono">{selectedBilling.accountingDocumentNumber}</p></div>
                )}
              </div>

              <Separator />

              {/* Document Flow (VBFA) */}
              <div>
                <p className="font-semibold text-sm mb-2">Document Flow (SAP: VBFA)</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {selectedBilling.salesOrderNumber && (
                    <>
                      <span className="bg-blue-50 border border-blue-200 rounded px-2 py-1 font-mono">SO: {selectedBilling.salesOrderNumber}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </>
                  )}
                  {selectedBilling.deliveryNumber && (
                    <>
                      <span className="bg-green-50 border border-green-200 rounded px-2 py-1 font-mono">DEL: {selectedBilling.deliveryNumber}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </>
                  )}
                  <span className="bg-purple-50 border border-purple-200 rounded px-2 py-1 font-mono">BILL: {selectedBilling.billingNumber}</span>
                  {selectedBilling.accountingDocumentNumber && (
                    <>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="bg-orange-50 border border-orange-200 rounded px-2 py-1 font-mono">GL: {selectedBilling.accountingDocumentNumber}</span>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Amounts Summary */}
              <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-slate-400">Net Amount</p><p className="font-semibold text-lg">{fmt(selectedBilling.netAmount, selectedBilling.currency)}</p></div>
                <div><p className="text-slate-400">Tax Amount</p><p className="font-semibold text-lg">{fmt(selectedBilling.taxAmount, selectedBilling.currency)}</p></div>
                <div><p className="text-slate-400">Total / Gross</p><p className="font-bold text-xl text-blue-700">{fmt(selectedBilling.totalAmount, selectedBilling.currency)}</p></div>
                <div><p className="text-slate-400">Paid</p><p className="text-green-600 font-semibold">{fmt(selectedBilling.paidAmount, selectedBilling.currency)}</p></div>
                <div><p className="text-slate-400">Outstanding</p><p className={`font-semibold ${selectedBilling.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(selectedBilling.outstandingAmount, selectedBilling.currency)}</p></div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {selectedBilling.postingStatus !== 'POSTED' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={postToGLMutation.isPending}
                    onClick={() => {
                      postToGLMutation.mutate(selectedBilling.id);
                      setShowDetail(false);
                    }}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Post to GL (FI)
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetail(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}