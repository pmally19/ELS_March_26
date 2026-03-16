import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ARClearingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Fetch clearing statistics
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/ar/post-journal/clearing/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/post-journal/clearing/statistics');
      if (!response.ok) throw new Error('Failed to fetch clearing statistics');
      const data = await response.json();
      return data.data;
    }
  });

  // Fetch items ready to clear
  const { data: readyToClear, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['/api/ar/open-items/ready-to-clear'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/open-items?status=ready_to_clear');
      if (!response.ok) throw new Error('Failed to fetch items ready to clear');
      const data = await response.json();
      return data.data || [];
    }
  });

  // Perform automatic clearing
  const performClearingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ar/post-journal/clearing/perform', {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform automatic clearing');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Clearing Completed',
        description: `Successfully cleared ${data.cleared} AR open items`,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar'] });
      refetchItems();
    },
    onError: (error: any) => {
      toast({
        title: 'Clearing Failed',
        description: error.message || 'Failed to perform automatic clearing',
        variant: 'destructive'
      });
    }
  });

  // Manually clear specific item
  const clearItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest(`/api/ar/post-journal/clearing/clear/${itemId}`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear item');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Item Cleared',
        description: 'AR open item cleared successfully',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar'] });
      refetchItems();
      setSelectedItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Clearing Failed',
        description: error.message || 'Failed to clear item',
        variant: 'destructive'
      });
    }
  });

  if (statsLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading clearing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Clearing Statistics</CardTitle>
          <CardDescription>Overview of AR open items clearing status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {statistics?.cleared_count || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Cleared Items</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {statistics?.ready_to_clear || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Ready to Clear</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {statistics?.open_count || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Open Items</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                ${parseFloat(statistics?.total_outstanding || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Outstanding</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Clearing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Automatic Clearing</span>
            <Button
              onClick={() => performClearingMutation.mutate()}
              disabled={performClearingMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {performClearingMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Perform Automatic Clearing
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Automatically clear all AR open items that are fully paid (outstanding amount = 0)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performClearingMutation.data?.errors?.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some items failed to clear: {performClearingMutation.data.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}
          {performClearingMutation.isSuccess && (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully cleared {performClearingMutation.data.cleared} AR open items
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Items Ready to Clear */}
      <Card>
        <CardHeader>
          <CardTitle>Items Ready to Clear</CardTitle>
          <CardDescription>
            AR open items with zero outstanding amount that can be cleared
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readyToClear && readyToClear.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Outstanding Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyToClear.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.invoice_number || 'N/A'}
                    </TableCell>
                    <TableCell>{item.document_number}</TableCell>
                    <TableCell>
                      ${parseFloat(item.original_amount || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(item.outstanding_amount || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearItemMutation.mutate(item.id)}
                        disabled={clearItemMutation.isPending && selectedItemId === item.id}
                      >
                        {clearItemMutation.isPending && selectedItemId === item.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No items ready to clear</p>
              <p className="text-sm">All items are either cleared or have outstanding amounts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

