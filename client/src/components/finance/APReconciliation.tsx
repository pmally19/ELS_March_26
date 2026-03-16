import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

export default function APReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [glAccountId, setGlAccountId] = useState<string>('');
  const [companyCode, setCompanyCode] = useState<string>('');

  // Reconcile AP subledger with GL
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/reconciliation/ap/reconcile', {
        method: 'POST',
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
          ? 'AP subledger and GL are balanced'
          : `Difference found: $${data.data.difference.toFixed(2)}`,
        variant: data.data.isBalanced ? 'default' : 'destructive'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation/ap'] });
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
    queryKey: ['/api/reconciliation/ap/history'],
    queryFn: async () => {
      const response = await apiRequest('/api/reconciliation/ap/history');
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
          <CardTitle>AP Subledger Reconciliation</CardTitle>
          <CardDescription>
            Compare AP subledger totals with GL AP account balance
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
                placeholder="Leave empty for all AP accounts"
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
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reconciling...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
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
            <CardTitle>Reconciliation Results</CardTitle>
            <CardDescription>
              Reconciliation performed on {new Date(reconciliationResult.reconciliationDate).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">AP Subledger Total</div>
                <div className="text-2xl font-bold">${reconciliationResult.subledgerTotal.toFixed(2)}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">GL Account Balance</div>
                <div className="text-2xl font-bold">${reconciliationResult.glAccountBalance.toFixed(2)}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Difference</div>
                <div className={`text-2xl font-bold ${reconciliationResult.difference > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  ${reconciliationResult.difference.toFixed(2)}
                </div>
              </div>
            </div>

            {reconciliationResult.isBalanced ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  AP subledger and GL are balanced. All amounts match.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Discrepancy detected. AP subledger and GL do not match. Please review discrepancies below.
                </AlertDescription>
              </Alert>
            )}

            {reconciliationResult.discrepancies && reconciliationResult.discrepancies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Discrepancies</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationResult.discrepancies.map((discrepancy: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={discrepancy.type === 'MISSING_IN_GL' ? 'destructive' : 'outline'}>
                            {discrepancy.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{discrepancy.description}</TableCell>
                        <TableCell>${discrepancy.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {discrepancy.documentNumber ? (
                            <Link 
                              href={`/finance/ap-enhanced?document=${encodeURIComponent(discrepancy.documentNumber)}`}
                              className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {discrepancy.documentNumber}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reconciliation History */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation History</CardTitle>
          <CardDescription>Recent AP reconciliation records</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading history...</div>
          ) : history && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Open Items</TableHead>
                  <TableHead>Total Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(record.reconciliation_date).toLocaleString()}
                    </TableCell>
                    <TableCell>{record.total_open_items || 0}</TableCell>
                    <TableCell>${parseFloat(record.total_outstanding || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No reconciliation history available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

