import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ARAgingAnalysis() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState<string>('');

  // Update aging buckets
  const updateBucketsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ar/post-journal/aging/update-buckets', {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update aging buckets');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Aging Buckets Updated',
        description: `Updated ${data.updated} AR open items with aging buckets`,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/aging'] });
      refetchReport();
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update aging buckets',
        variant: 'destructive'
      });
    }
  });

  // Get aging report
  const { data: report, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['/api/ar/post-journal/aging/report', customerId],
    queryFn: async () => {
      const url = customerId
        ? `/api/ar/post-journal/aging/report?customerId=${customerId}`
        : '/api/ar/post-journal/aging/report';
      const response = await apiRequest(url);
      if (!response.ok) throw new Error('Failed to fetch aging report');
      const data = await response.json();
      return data.data || [];
    }
  });

  const totalOutstanding = report?.reduce((sum: number, item: any) => 
    sum + parseFloat(item.total_outstanding || 0), 0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Update Aging Buckets Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aging Bucket Management</span>
            <Button
              onClick={() => updateBucketsMutation.mutate()}
              disabled={updateBucketsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateBucketsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Update Aging Buckets
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Calculate and update aging buckets for all AR open items based on due dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updateBucketsMutation.isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully updated {updateBucketsMutation.data.updated} AR open items
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Aging Report Card */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Analysis Report</CardTitle>
          <CardDescription>
            Outstanding receivables categorized by age (days past due)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="customerId">Filter by Customer ID (Optional)</Label>
              <Input
                id="customerId"
                type="number"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Leave empty for all customers"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => refetchReport()}
                disabled={reportLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {reportLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading aging report...</span>
            </div>
          ) : report && report.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {report.map((bucket: any, index: number) => {
                  const amount = parseFloat(bucket.total_outstanding || 0);
                  const percentage = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0;
                  const isOverdue = index > 0;
                  
                  return (
                    <div
                      key={bucket.aging_bucket}
                      className={`p-4 border rounded-lg ${
                        index === 0
                          ? 'bg-green-50 border-green-200'
                          : index >= 3
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="text-sm text-muted-foreground mb-1">
                        {bucket.aging_bucket || 'Unknown'}
                      </div>
                      <div className={`text-2xl font-bold ${
                        index === 0
                          ? 'text-green-600'
                          : index >= 3
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        ${amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {bucket.item_count || 0} items • {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Outstanding:</span>
                  <span className="text-2xl font-bold">
                    ${totalOutstanding.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aging Bucket</TableHead>
                    <TableHead className="text-right">Item Count</TableHead>
                    <TableHead className="text-right">Total Outstanding</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((bucket: any) => {
                    const amount = parseFloat(bucket.total_outstanding || 0);
                    const percentage = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0;
                    
                    return (
                      <TableRow key={bucket.aging_bucket}>
                        <TableCell>
                          <Badge variant="outline">{bucket.aging_bucket || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{bucket.item_count || 0}</TableCell>
                        <TableCell className="text-right">
                          ${amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">No aging data available</p>
              <p className="text-sm">There are currently no outstanding invoices to display in the aging report.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

