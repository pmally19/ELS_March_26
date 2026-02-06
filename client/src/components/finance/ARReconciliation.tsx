import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

export default function ARReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [glAccountId, setGlAccountId] = useState<string>('');
  const [companyCode, setCompanyCode] = useState<string>('');

  // Reconcile AR subledger with GL
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ar/post-journal/reconciliation/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glAccountId: glAccountId ? parseInt(glAccountId) : undefined,
          companyCode: companyCode || undefined
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reconcile');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reconciliation Complete',
        description: data.data.isBalanced
          ? 'AR subledger and GL are balanced'
          : `Difference found: $${data.data.difference.toFixed(2)}${data.data.discrepancies?.length > 0 ? ` (${data.data.discrepancies.length} discrepancy${data.data.discrepancies.length !== 1 ? 'ies' : ''} found)` : ''}`,
        variant: data.data.isBalanced ? 'default' : 'destructive'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/post-journal/reconciliation/history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Reconciliation Failed',
        description: error.message || 'Failed to reconcile',
        variant: 'destructive'
      });
    }
  });

  // Get reconciliation history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/ar/post-journal/reconciliation/history'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/post-journal/reconciliation/history');
      if (!response.ok) throw new Error('Failed to fetch reconciliation history');
      const data = await response.json();
      return data.data || [];
    }
  });

  const reconciliationResult = reconcileMutation.data?.data;

  return (
    <div className="space-y-6">
      {/* Reconciliation Form */}
      <Card>
        <CardHeader>
          <CardTitle>AR Subledger Reconciliation</CardTitle>
          <CardDescription>
            Compare AR subledger totals with GL AR account balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="glAccountId">GL Account ID (Optional)</Label>
              <Input
                id="glAccountId"
                type="number"
                value={glAccountId}
                onChange={(e) => setGlAccountId(e.target.value)}
                placeholder="Leave empty for all AR accounts"
              />
            </div>
            <div>
              <Label htmlFor="companyCode">Company Code (Optional)</Label>
              <Input
                id="companyCode"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="Leave empty for all companies"
              />
            </div>
          </div>
          <Button
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            className="w-full md:w-auto"
          >
            {reconcileMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reconciling...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Run Reconciliation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reconciliation Results */}
      {reconciliationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Reconciliation Results
              {reconciliationResult.isBalanced ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unbalanced
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Reconciliation Date: {new Date(reconciliationResult.reconciliationDate).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">AR Subledger Total</div>
                <div className="text-2xl font-bold mt-1">
                  ${parseFloat(String(reconciliationResult.arSubledgerTotal || 0)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                {reconciliationResult.summary && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationResult.summary.totalOpenItems || 0} open items
                  </div>
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">GL Account Balance</div>
                <div className="text-2xl font-bold mt-1">
                  ${parseFloat(String(reconciliationResult.glAccountBalance || 0)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                {reconciliationResult.summary && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Debits: ${parseFloat(String(reconciliationResult.summary.totalDebits || 0)).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} | Credits: ${parseFloat(String(reconciliationResult.summary.totalCredits || 0)).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}
              </div>
              <div className={`p-4 border rounded-lg ${reconciliationResult.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-sm text-muted-foreground">Difference</div>
                <div className={`text-2xl font-bold mt-1 ${reconciliationResult.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ${parseFloat(String(reconciliationResult.difference || 0)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                {reconciliationResult.discrepancies && reconciliationResult.discrepancies.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationResult.discrepancies.length} discrepancy{reconciliationResult.discrepancies.length !== 1 ? 'ies' : ''} found
                  </div>
                )}
              </div>
            </div>

            {reconciliationResult.discrepancies && reconciliationResult.discrepancies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Discrepancies Found ({reconciliationResult.discrepancies.length}):</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Subledger Amount</TableHead>
                      <TableHead>GL Amount</TableHead>
                      <TableHead>Document Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationResult.discrepancies.map((disc: any, index: number) => {
                      const getBadgeVariant = () => {
                        if (disc.type === 'MISSING_IN_GL') return 'destructive';
                        if (disc.type === 'MISSING_IN_SUBLEDGER') return 'destructive';
                        if (disc.type === 'AMOUNT_MISMATCH') return 'outline';
                        return 'outline';
                      };
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={getBadgeVariant()}>
                              {disc.type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">{disc.description}</TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              ${parseFloat(String(disc.amount || 0)).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            {disc.subledgerAmount !== undefined ? (
                              <span className="text-muted-foreground">
                                ${parseFloat(String(disc.subledgerAmount || 0)).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {disc.glAmount !== undefined ? (
                              <span className="text-muted-foreground">
                                ${parseFloat(String(disc.glAmount || 0)).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {disc.documentNumber ? (
                              <Link 
                                href={`/finance/ar-enhanced?document=${encodeURIComponent(disc.documentNumber)}`}
                                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {disc.documentNumber}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {reconciliationResult.isBalanced && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  AR subledger and GL account balance match. No discrepancies found.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reconciliation History */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation History</CardTitle>
          <CardDescription>Recent reconciliation runs</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Open Items</TableHead>
                  <TableHead>Total Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discrepancies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(item.reconciliation_date).toLocaleString()}
                    </TableCell>
                    <TableCell>{item.total_open_items || 0}</TableCell>
                    <TableCell>
                      ${parseFloat(String(item.total_outstanding || 0)).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      {item.is_balanced !== undefined ? (
                        <Badge variant={item.is_balanced ? 'default' : 'destructive'} className={item.is_balanced ? 'bg-green-600' : ''}>
                          {item.is_balanced ? 'Balanced' : 'Unbalanced'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.discrepancies_count !== undefined ? (
                        <span className={item.discrepancies_count > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          {item.discrepancies_count || 0}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No reconciliation history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

