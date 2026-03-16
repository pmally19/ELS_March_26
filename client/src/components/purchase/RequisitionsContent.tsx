import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Search, Plus, Download, Eye, Edit2, Trash2, MoreHorizontal, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import PRDetailDialog from './PRDetailDialog';
import ConvertPRtoPODialog from './ConvertPRtoPODialog';

interface Requisition {
  id: number;
  req_number: string;
  requester: string | null;
  department: string | null;
  req_date: string | null;
  status: string | null;
  priority?: string | null;
  approval_status?: string | null;
  total_estimated_value?: number;
  currency?: string | null;
}

export default function RequisitionsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPRId, setSelectedPRId] = useState<number | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [comments, setComments] = useState('');
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requisitions = [], isLoading, error } = useQuery<Requisition[]>({
    queryKey: ['/api/purchase/requisitions'],
    queryFn: async () => {
      const data = await apiRequest<Requisition[]>('/api/purchase/requisitions', 'GET');
      return Array.isArray(data) ? data : [];
    },
  });

  const filteredRequisitions = requisitions.filter((req) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      req.req_number?.toLowerCase().includes(searchLower) ||
      req.requester?.toLowerCase().includes(searchLower) ||
      req.department?.toLowerCase().includes(searchLower) ||
      req.status?.toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
    setTimeout(() => setIsRefreshing(false), 500);
    toast({
      title: 'Refreshed',
      description: 'Purchase requisitions data has been refreshed',
    });
  };

  const handleExport = () => {
    // Export to CSV
    const headers = ['PR Number', 'Requester', 'Department', 'Date', 'Status', 'Priority', 'Total Value', 'Currency'];
    const csvData = filteredRequisitions.map(req => [
      req.req_number || '',
      req.requester || '',
      req.department || '',
      req.req_date ? new Date(req.req_date).toLocaleDateString() : '',
      req.status || '',
      req.priority || '',
      req.total_estimated_value || '',
      req.currency || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-requisitions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: `${filteredRequisitions.length} requisitions exported to CSV`,
    });
  };

  const handleNewRequisition = () => {
    window.location.href = '/transactions/purchase-requisition';
  };

  const handleView = (req: Requisition) => {
    setSelectedPRId(req.id);
    setShowDetailDialog(true);
  };

  const handleEdit = (req: Requisition) => {
    toast({
      title: 'Edit Requisition',
      description: `Editing ${req.req_number}`,
    });
  };

  const handleDelete = (req: Requisition) => {
    toast({
      title: 'Delete Requisition',
      description: `Deleting ${req.req_number}`,
      variant: 'destructive',
    });
  };

  const handleApproveClick = (req: Requisition) => {
    setSelectedPRId(req.id);
    setShowApproveDialog(true);
  };

  const handleRejectClick = (req: Requisition) => {
    setSelectedPRId(req.id);
    setShowRejectDialog(true);
  };

  const handleConvertClick = async (req: Requisition) => {
    setSelectedPRId(req.id);

    // Fetch PR items to get material IDs
    try {
      setLoadingVendors(true);
      const prDetails = await apiRequest(`/api/purchase/requisitions/${req.id}`, 'GET');

      if (prDetails.items && prDetails.items.length > 0) {
        const materialIds = prDetails.items
          .filter((item: any) => item.material_id)
          .map((item: any) => item.material_id);

        if (materialIds.length > 0) {
          // Fetch filtered vendors
          const vendorData = await apiRequest(
            `/api/purchase/vendors/by-materials?materialIds=${materialIds.join(',')}`,
            'GET'
          );
          setFilteredVendors(vendorData.vendors || []);
        }
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: 'Warning',
        description: 'Could not fetch vendor recommendations. Showing all vendors.',
        variant: 'default',
      });
      setFilteredVendors([]);
    } finally {
      setLoadingVendors(false);
      setShowConvertDialog(true);
    }
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const data = await apiRequest(
        `/api/purchase/requisitions/${selectedPRId}/approve`,
        'POST',
        { approver_name: approverName, comments }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
      toast({ title: 'Success', description: 'Purchase requisition approved' });
      setShowApproveDialog(false);
      setApproverName('');
      setComments('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!comments) {
        throw new Error('Rejection reason is required');
      }
      const data = await apiRequest(
        `/api/purchase/requisitions/${selectedPRId}/reject`,
        'POST',
        { approver_name: approverName, comments }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
      toast({ title: 'Success', description: 'Purchase requisition rejected' });
      setShowRejectDialog(false);
      setApproverName('');
      setComments('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string | null, approvalStatus?: string | null) => {
    if (!status) return <Badge variant="outline">—</Badge>;

    const displayStatus = approvalStatus || status;

    switch (displayStatus.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'pending':
      case 'submitted':
      case 'pending approval':
        return <Badge className="bg-yellow-500 text-white">Pending Approval</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500 text-white">Approved</Badge>;
      case 'converted':
      case 'converted to po':
        return <Badge className="bg-green-500 text-white">Converted to PO</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'created':
        return <Badge className="bg-gray-500 text-white">Created</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{displayStatus}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) {
      return <Badge variant="outline">Not Set</Badge>;
    }

    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
        return <Badge className="bg-red-500 text-white">High</Badge>;
      case 'medium':
      case 'normal':
        return <Badge className="bg-orange-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Purchase Requisitions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleNewRequisition}>
                <Plus className="h-4 w-4 mr-2" />
                New Requisition
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requisitions by number, requester, department, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading requisitions. Please try again.
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No requisitions match your search.' : 'No purchase requisitions found.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR Number</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.req_number}</TableCell>
                      <TableCell>{req.requester || '—'}</TableCell>
                      <TableCell>{req.department || '—'}</TableCell>
                      <TableCell>
                        {req.req_date ? new Date(req.req_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>{getPriorityBadge(req.priority || null)}</TableCell>
                      <TableCell>{getStatusBadge(req.status, req.approval_status)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {req.total_estimated_value
                          ? `${req.currency || '$'} ${req.total_estimated_value.toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(req)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {req.approval_status === 'PENDING' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleApproveClick(req)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRejectClick(req)}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(req)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(req)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PR Detail Dialog */}
      <PRDetailDialog
        prId={selectedPRId}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onApprove={(prId) => {
          const req = requisitions.find(r => r.id === prId);
          if (req) handleApproveClick(req);
        }}
        onReject={(prId) => {
          const req = requisitions.find(r => r.id === prId);
          if (req) handleRejectClick(req);
        }}
        onConvert={(prId) => {
          const req = requisitions.find(r => r.id === prId);
          if (req) handleConvertClick(req);
        }}
      />

      {/* Convert to PO Dialog */}
      <ConvertPRtoPODialog
        prId={selectedPRId}
        prNumber={requisitions.find(r => r.id === selectedPRId)?.req_number}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        filteredVendors={filteredVendors.length > 0 ? filteredVendors : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
          setFilteredVendors([]);
        }}
      />

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Requisition</DialogTitle>
            <DialogDescription>
              Approve this requisition to proceed with procurement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approverName">Your Name</Label>
              <Input
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add approval comments..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Requisition</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this requisition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approverName">Your Name</Label>
              <Input
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="comments">Rejection Reason *</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Explain why you are rejecting this requisition..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !comments}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}