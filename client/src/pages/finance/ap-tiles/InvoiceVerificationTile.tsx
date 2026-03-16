import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Eye, Plus, Search } from 'lucide-react';

interface InvoiceVerification {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_code: string;
  invoice_amount: number;
  verification_status: string;
  workflow_stage: string;
  verification_type: string;
  po_number?: string;
  gr_number?: string;
  line_items: number;
  matched_amount: number;
  variance_amount: number;
  tolerance_exceeded: boolean;
  assigned_to?: string;
  created_at: string;
}

interface LineItem {
  id: number;
  line_number: number;
  material_code?: string;
  description?: string;
  quantity_invoiced: number;
  quantity_received: number;
  quantity_ordered: number;
  unit_price: number;
  line_amount: number;
  validation_status: string;
  variance_reason?: string;
}

interface VerificationStats {
  total_workflows: number;
  pending_verification: number;
  approved_invoices: number;
  rejected_invoices: number;
  tolerance_exceeded: number;
  avg_invoice_amount: number;
  line_variances: number;
}

export default function InvoiceVerificationTile() {
  const [workflows, setWorkflows] = useState<InvoiceVerification[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<InvoiceVerification | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Form state for new workflow
  const [newWorkflow, setNewWorkflow] = useState({
    workflow_stage: 'RECEIVED',
    verification_type: 'THREE_WAY_MATCH',
    po_number: '',
    gr_number: '',
    invoice_number: '',
    vendor_id: '',
    invoice_amount: 0,
    assigned_to: '',
    verification_notes: ''
  });

  useEffect(() => {
    fetchWorkflows();
    fetchStatistics();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/complete-ap/invoice-verification/workflows');
      const data = await response.json();
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invoice verification workflows',
        variant: 'destructive',
      });
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/complete-ap/invoice-verification/statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchLineItems = async (verificationId: number) => {
    try {
      const response = await fetch(`/api/complete-ap/invoice-verification/line-items/${verificationId}`);
      const data = await response.json();
      setLineItems(data || []);
    } catch (error) {
      console.error('Error fetching line items:', error);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.invoice_number || !newWorkflow.invoice_amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/complete-ap/invoice-verification/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorkflow),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Invoice verification workflow created successfully',
        });
        setNewWorkflow({
          workflow_stage: 'RECEIVED',
          verification_type: 'THREE_WAY_MATCH',
          po_number: '',
          gr_number: '',
          invoice_number: '',
          vendor_id: '',
          invoice_amount: 0,
          assigned_to: '',
          verification_notes: ''
        });
        fetchWorkflows();
        fetchStatistics();
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create invoice verification workflow',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'MATCHED': return 'bg-green-100 text-green-800';
      case 'VARIANCE': return 'bg-orange-100 text-orange-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'VERIFIED': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_workflows}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_verification}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved Invoices</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved_invoices}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Line Variances</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.line_variances}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">Verification Workflows</TabsTrigger>
          <TabsTrigger value="create">Create Workflow</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by invoice number or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workflows List */}
          <div className="grid gap-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStageIcon(workflow.workflow_stage)}
                      <div>
                        <h3 className="font-semibold">{workflow.invoice_number}</h3>
                        <p className="text-sm text-gray-600">{workflow.vendor_name} ({workflow.vendor_code})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">${workflow.invoice_amount.toLocaleString()}</p>
                        <Badge className={getStatusColor(workflow.verification_status)}>
                          {workflow.verification_status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{workflow.verification_type}</p>
                        <p className="text-sm text-gray-600">{workflow.line_items} line items</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWorkflow(workflow);
                          fetchLineItems(workflow.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {workflow.tolerance_exceeded && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-orange-700">
                        ⚠️ Tolerance exceeded - Variance: ${workflow.variance_amount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Invoice Verification Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Invoice Number *</Label>
                  <Input
                    id="invoice_number"
                    value={newWorkflow.invoice_number}
                    onChange={(e) => setNewWorkflow({...newWorkflow, invoice_number: e.target.value})}
                    placeholder="Enter invoice number"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice_amount">Invoice Amount *</Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    step="0.01"
                    value={newWorkflow.invoice_amount}
                    onChange={(e) => setNewWorkflow({...newWorkflow, invoice_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="verification_type">Verification Type</Label>
                  <Select 
                    value={newWorkflow.verification_type} 
                    onValueChange={(value) => setNewWorkflow({...newWorkflow, verification_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THREE_WAY_MATCH">Three-Way Match</SelectItem>
                      <SelectItem value="TWO_WAY_MATCH">Two-Way Match</SelectItem>
                      <SelectItem value="MANUAL">Manual Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="workflow_stage">Workflow Stage</Label>
                  <Select 
                    value={newWorkflow.workflow_stage} 
                    onValueChange={(value) => setNewWorkflow({...newWorkflow, workflow_stage: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIVED">Received</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="po_number">PO Number</Label>
                  <Input
                    id="po_number"
                    value={newWorkflow.po_number}
                    onChange={(e) => setNewWorkflow({...newWorkflow, po_number: e.target.value})}
                    placeholder="Purchase order number"
                  />
                </div>

                <div>
                  <Label htmlFor="gr_number">GR Number</Label>
                  <Input
                    id="gr_number"
                    value={newWorkflow.gr_number}
                    onChange={(e) => setNewWorkflow({...newWorkflow, gr_number: e.target.value})}
                    placeholder="Goods receipt number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="verification_notes">Verification Notes</Label>
                <Textarea
                  id="verification_notes"
                  value={newWorkflow.verification_notes}
                  onChange={(e) => setNewWorkflow({...newWorkflow, verification_notes: e.target.value})}
                  placeholder="Enter verification notes..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={createWorkflow} 
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Verification Workflow'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line-items" className="space-y-4">
          {selectedWorkflow ? (
            <Card>
              <CardHeader>
                <CardTitle>Line Items - {selectedWorkflow.invoice_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div key={item.id} className="border rounded p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Line {item.line_number}</h4>
                          <p className="text-sm text-gray-600">{item.material_code} - {item.description}</p>
                        </div>
                        <Badge className={getStatusColor(item.validation_status)}>
                          {item.validation_status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-600">Invoiced Qty</p>
                          <p className="font-semibold">{item.quantity_invoiced}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Received Qty</p>
                          <p className="font-semibold">{item.quantity_received}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Unit Price</p>
                          <p className="font-semibold">${item.unit_price}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Line Amount</p>
                          <p className="font-semibold">${item.line_amount}</p>
                        </div>
                      </div>
                      
                      {item.variance_reason && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                          <p className="text-sm text-orange-700">Variance: {item.variance_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">Select a workflow to view line items</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}