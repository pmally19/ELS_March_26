import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  FileText,
  Eye,
  CreditCard,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function FinancialPostingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [showGlDetails, setShowGlDetails] = useState(false);

  // Fetch pending billing documents
  const { data: pendingDocs, isLoading: loadingPending, error: pendingError } = useQuery({
    queryKey: ["/api/order-to-cash/financial-posting/pending"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/financial-posting/pending");
      return await response.json();
    },
  });

  // Fetch posted billing documents
  const { data: postedDocs, isLoading: loadingPosted, error: postedError } = useQuery({
    queryKey: ["/api/order-to-cash/financial-posting/posted"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/financial-posting/posted");
      return await response.json();
    },
  });

  // Post billing document to GL mutation
  const postToGLMutation = useMutation({
    mutationFn: async (billingId: number) => {
      const response = await apiRequest(`/api/order-to-cash/financial-posting/post/${billingId}`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Posted to GL Successfully",
        description: `Billing document ${data.data?.billingNumber} posted with accounting document ${data.data?.accountingDocumentNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/financial-posting/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/financial-posting/posted"] });
    },
    onError: (error: any) => {
      toast({
        title: "GL Posting Failed",
        description: error.message || "Failed to post billing document to GL",
        variant: "destructive",
      });
    },
  });

  // View GL details
  const handleViewGlDetails = async (billingId: number) => {
    try {
      console.log('🔍 Fetching GL details for billing ID:', billingId);
      const response = await apiRequest(`/api/order-to-cash/financial-posting/gl-details/${billingId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ GL details response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load GL details');
      }
      
      if (!data.data) {
        throw new Error('Invalid response format from server');
      }
      
      setSelectedBilling(data.data);
      setShowGlDetails(true);
    } catch (error: any) {
      console.error('❌ Error loading GL details:', error);
      toast({
        title: "Error Loading GL Details",
        description: error?.message || "Failed to load GL details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      return <Badge variant="outline">Pending</Badge>;
    }
    switch (status.toUpperCase()) {
      case "POSTED":
        return <Badge className="bg-green-500">Posted</Badge>;
      case "OPEN":
        return <Badge variant="default">Pending</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatCurrency = (amount: number | string) => {
    return `$${parseFloat(String(amount || 0)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold">
                {pendingDocs?.data?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Pending Posting</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold">
                {postedDocs?.data?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Posted to GL</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold">
                {formatCurrency(
                  pendingDocs?.data?.reduce(
                    (sum: number, doc: any) => sum + parseFloat(doc.total_amount || 0),
                    0
                  ) || 0
                )}
              </div>
              <div className="text-sm text-gray-600">Pending Value</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold">
                {formatCurrency(
                  postedDocs?.data?.reduce(
                    (sum: number, doc: any) => sum + parseFloat(doc.total_amount || 0),
                    0
                  ) || 0
                )}
              </div>
              <div className="text-sm text-gray-600">Posted Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/financial-posting/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/financial-posting/posted"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Posting Tab */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Financial Posting</CardTitle>
          <p className="text-sm text-gray-600">Billing documents ready to be posted to General Ledger</p>
        </CardHeader>
        <CardContent>
          {loadingPending ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading pending documents...</p>
            </div>
          ) : pendingError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-2" />
              <p className="text-gray-600">Error loading pending documents</p>
              <p className="text-sm text-red-500 mt-1">
                {pendingError instanceof Error ? pendingError.message : "Failed to fetch data"}
              </p>
            </div>
          ) : !pendingDocs?.data || pendingDocs.data.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No pending billing documents</p>
              <p className="text-sm text-gray-500">
                {postedDocs?.data && postedDocs.data.length > 0
                  ? "All billing documents have been posted to GL"
                  : "No billing documents available for posting"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDocs.data.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.billing_number}</TableCell>
                    <TableCell>{doc.customer_name}</TableCell>
                    <TableCell>
                      {doc.company_code ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.company_code}</span>
                          {doc.company_name && (
                            <span className="text-xs text-gray-500">{doc.company_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{doc.sales_order_number || "-"}</TableCell>
                    <TableCell>{doc.delivery_number || "-"}</TableCell>
                    <TableCell>
                      {doc.billing_date ? format(new Date(doc.billing_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {doc.due_date ? format(new Date(doc.due_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(doc.net_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(doc.tax_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(doc.total_amount || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.posting_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => postToGLMutation.mutate(doc.id)}
                          disabled={postToGLMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {postToGLMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <BookOpen className="h-4 w-4 mr-2" />
                              Post to GL
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Posted Documents Tab */}
      <Card>
        <CardHeader>
          <CardTitle>Posted to General Ledger</CardTitle>
          <p className="text-sm text-gray-600">Billing documents that have been posted to GL</p>
        </CardHeader>
        <CardContent>
          {loadingPosted ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading posted documents...</p>
            </div>
          ) : postedError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-2" />
              <p className="text-gray-600">Error loading posted documents</p>
              <p className="text-sm text-red-500 mt-1">
                {postedError instanceof Error ? postedError.message : "Failed to fetch data"}
              </p>
            </div>
          ) : !postedDocs?.data || postedDocs.data.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No posted documents</p>
              <p className="text-sm text-gray-500">Posted billing documents will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>GL Document</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postedDocs.data.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.billing_number}</TableCell>
                    <TableCell>{doc.customer_name}</TableCell>
                    <TableCell>
                      {doc.company_code ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.company_code}</span>
                          {doc.company_name && (
                            <span className="text-xs text-gray-500">{doc.company_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{doc.sales_order_number || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {doc.accounting_document_number || "-"}
                    </TableCell>
                    <TableCell>
                      {doc.billing_date ? format(new Date(doc.billing_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(doc.total_amount || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.posting_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewGlDetails(doc.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View GL Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* GL Details Dialog */}
      <Dialog open={showGlDetails} onOpenChange={setShowGlDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>General Ledger Posting Details</DialogTitle>
          </DialogHeader>
          {selectedBilling && (
            <div className="space-y-6">
              {selectedBilling.posted ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">Accounting Document Number:</span>
                      <span className="font-mono">{selectedBilling.accountingDocumentNumber}</span>
                    </div>
                    {selectedBilling.companyCode && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Company Code:</span>
                        <span className="font-medium">{selectedBilling.companyCode}</span>
                        {selectedBilling.companyName && (
                          <span className="text-sm text-gray-600">({selectedBilling.companyName})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">GL Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Account Type</TableHead>
                            <TableHead>Debit/Credit</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Posting Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBilling.glEntries && selectedBilling.glEntries.length > 0 ? (
                            selectedBilling.glEntries.map((entry: any, index: number) => (
                              <TableRow key={entry.id || index}>
                                <TableCell className="font-mono">{entry.account_number || '-'}</TableCell>
                                <TableCell>{entry.account_name || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{entry.account_type || '-'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      entry.debit_credit_indicator === "D"
                                        ? "bg-blue-500"
                                        : "bg-green-500"
                                    }
                                  >
                                    {entry.debit_credit_indicator === "D" ? "Debit" : "Credit"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(entry.amount || 0)}
                                </TableCell>
                                <TableCell>{entry.description || entry.document_number || '-'}</TableCell>
                                <TableCell>
                                  {entry.posting_date
                                    ? format(new Date(entry.posting_date), "MMM dd, yyyy")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8">
                                <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-600">No GL entries found for this document</p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">This document has not been posted to GL yet</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

