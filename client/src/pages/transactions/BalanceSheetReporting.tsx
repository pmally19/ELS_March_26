import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, RefreshCw, FileText, Calendar, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function BalanceSheetReporting() {
  const [fsvs, setFsvs] = useState<any[]>([]);
  const [selectedFsvId, setSelectedFsvId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));

    // Fetch available FSVs
    fetch('/api/fsv')
      .then(res => res.json())
      .then(data => {
        setFsvs(data);
        if (data.length > 0) {
          setSelectedFsvId(data[0].id);
        }
      })
      .catch(err => console.error("Failed to load FSVs", err));
  }, []);

  // Fetch FSV Report
  const { data: reportData, isLoading, refetch, error } = useQuery<any>({
    queryKey: ['/api/fsv-reporting/report', selectedFsvId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiRequest(`/api/fsv-reporting/report/${selectedFsvId}?${params.toString()}`);
      return await response.json();
    },
    enabled: !!selectedFsvId, // Only fetch when FSV is selected
  });

  const handleRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
     if (!reportData?.report) return;
     const allIds = new Set<string>();
     const traverse = (nodes: any[]) => {
        nodes.forEach(n => {
           allIds.add(n.id);
           if (n.children) traverse(n.children);
        });
     };
     traverse(reportData.report);
     setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  // Recursive render function for the hierarchy
  const renderNode = (node: any, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = (node.children && node.children.length > 0) || (node.accounts && node.accounts.length > 0);

    return (
      <div key={node.id} className="w-full">
        {/* Node Header */}
        <div 
          className={`flex items-center justify-between py-2 px-4 border-b hover:bg-gray-50 cursor-pointer ${level === 0 ? 'bg-gray-100 font-bold' : ''}`}
          style={{ paddingLeft: `${level * 20 + 16}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center text-gray-400">
               {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </div>
            <span>{node.name}</span>
          </div>
          <div className={`font-mono ${level === 0 ? 'text-lg' : ''}`}>
             {formatCurrency(node.balance)}
          </div>
        </div>

        {/* Children & Accounts (if expanded) */}
        {isExpanded && hasChildren && (
          <div className="w-full">
            {/* Render Accounts attached directly to this node */}
            {node.accounts && node.accounts.map((acc: any, idx: number) => (
               <div key={`acc-${acc.accountNumber}-${idx}`} className="flex items-center justify-between py-1.5 px-4 border-b border-gray-100 text-sm text-gray-600 bg-white" style={{ paddingLeft: `${(level + 1) * 20 + 36}px` }}>
                  <span>Account {acc.accountNumber}</span>
                  <span className="font-mono">{formatCurrency(acc.balance)}</span>
               </div>
            ))}
            
            {/* Render Child Nodes */}
            {node.children && node.children.map((child: any) => renderNode(child, level + 1))}

            {/* Render Subtotals if configured */}
            {node.showGraduated && (
               <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 bg-blue-50/50 font-semibold" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                  <span className="text-blue-800">{node.graduatedText || `Running Total: ${node.name}`}</span>
                  <span className="font-mono text-blue-800">{formatCurrency(node.balance)}</span>
               </div>
            )}
            {node.showTotal && level > 0 && (
               <div className="flex items-center justify-between py-2 px-4 border-b border-gray-300 bg-gray-50 font-bold" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                  <span>{node.endText || `Total ${node.name}`}</span>
                  <span className="font-mono">{formatCurrency(node.balance)}</span>
               </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Statement Reporting</h1>
              <p className="text-gray-600 mt-1">Generate dynamic Balance Sheets & P&Ls using configured FSV structures</p>
            </div>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={expandAll}>Expand All</Button>
             <Button variant="outline" onClick={collapseAll}>Collapse All</Button>
          </div>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Report Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                 <Label>Financial Statement Version (FSV)</Label>
                 <Select value={selectedFsvId} onValueChange={setSelectedFsvId}>
                   <SelectTrigger className="mt-1">
                     <SelectValue placeholder="Select an FSV..." />
                   </SelectTrigger>
                   <SelectContent>
                     {fsvs.map(fsv => (
                       <SelectItem key={fsv.id} value={fsv.id}>{fsv.code} - {fsv.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1"/>
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1"/>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load report: {(error as any).message}</span>
            </CardContent>
          </Card>
        )}

        {/* Report Display Card */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gray-50 flex flex-row items-center justify-between">
            <div>
               <CardTitle>{reportData?.fsvName || "Select an FSV to generate report"}</CardTitle>
               <CardDescription>
                 {startDate && endDate ? `Period: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}` : ''}
               </CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={isLoading || !selectedFsvId}>
               <RefreshCw className={isLoading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
               {isLoading ? "Calculating..." : "Run Report"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
               <div className="p-12 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                  Aggregating balances up the hierarchy...
               </div>
            ) : reportData?.report ? (
               <div className="w-full flex flex-col">
                  {/* Header Row */}
                  <div className="flex items-center justify-between py-2 px-4 bg-gray-800 text-white font-semibold">
                     <span>FSV Item / G/L Account</span>
                     <span>Balance</span>
                  </div>
                  {/* Tree Render */}
                  <div className="flex flex-col w-full divide-y">
                     {reportData.report.map((rootNode: any) => renderNode(rootNode))}
                  </div>
               </div>
            ) : (
               <div className="p-12 text-center text-gray-500">
                  Select parameters above to generate the financial statement.
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}