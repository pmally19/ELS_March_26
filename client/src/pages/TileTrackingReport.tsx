import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, FileText, Settings, Database } from 'lucide-react';

interface TileChange {
  id: number;
  tile_id: string;
  tile_name: string;
  page_route: string;
  change_type: 'new' | 'modified' | 'deleted';
  api_endpoints: any[];
  crud_operations: any[];
  changed_by: string;
  change_description: string;
  before_state: any;
  after_state: any;
  change_timestamp: string;
  crud_test_results: any;
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  pageRoute: string;
  changeType: string;
}

export function TileTrackingReport() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    pageRoute: '',
    changeType: ''
  });

  // Get tile change report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['/api/tile-tracking/tile-change-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/tile-tracking/tile-change-report?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    }
  });

  // Get functionality status
  const { data: functionalityData } = useQuery({
    queryKey: ['/api/tile-tracking/tile-functionality-status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'untested': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    const variants = {
      new: 'bg-green-100 text-green-800',
      modified: 'bg-blue-100 text-blue-800',
      deleted: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>;
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading tile tracking report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tile Change Tracking Report</h1>
        <Button onClick={() => refetch()}>
          <FileText className="h-4 w-4 mr-2" />
          Refresh Report
        </Button>
      </div>

      {/* Summary Cards */}
      {reportData?.report?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{reportData.report.summary.total_changes}</div>
              <p className="text-sm text-muted-foreground">Total Changes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{reportData.report.summary.new_tiles}</div>
              <p className="text-sm text-muted-foreground">New Tiles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{reportData.report.summary.modified_tiles}</div>
              <p className="text-sm text-muted-foreground">Modified Tiles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{reportData.report.summary.deleted_tiles}</div>
              <p className="text-sm text-muted-foreground">Deleted Tiles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{reportData.report.summary.affected_pages}</div>
              <p className="text-sm text-muted-foreground">Affected Pages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{reportData.report.summary.unique_tiles}</div>
              <p className="text-sm text-muted-foreground">Unique Tiles</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Page Route</label>
              <Input
                placeholder="e.g., /dashboard, /sales"
                value={filters.pageRoute}
                onChange={(e) => handleFilterChange('pageRoute', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Change Type</label>
              <Select value={filters.changeType} onValueChange={(value) => handleFilterChange('changeType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Functionality Status Overview */}
      {functionalityData?.functionalityReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              CRUD Operations Status by Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(functionalityData.functionalityReport).map(([pageRoute, tiles]: [string, any[]]) => (
              <div key={pageRoute} className="mb-4">
                <h3 className="font-semibold text-lg mb-2">{pageRoute}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tiles.slice(0, 6).map((tile, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">{tile.tile_name}</span>
                      <div className="flex items-center">
                        {getStatusIcon(tile.functionality_status)}
                        <span className="ml-1 text-xs">{tile.functionality_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Change Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Tile Name</TableHead>
                <TableHead>Page Route</TableHead>
                <TableHead>Change Type</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>API Endpoints</TableHead>
                <TableHead>CRUD Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData?.report?.changes?.map((change: TileChange) => (
                <TableRow key={change.id}>
                  <TableCell className="text-sm">
                    {new Date(change.change_timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{change.tile_name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 rounded">{change.page_route}</code>
                  </TableCell>
                  <TableCell>{getChangeTypeBadge(change.change_type)}</TableCell>
                  <TableCell>{change.changed_by}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{change.api_endpoints?.length || 0} APIs</Badge>
                  </TableCell>
                  <TableCell>
                    {change.crud_test_results ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-xs">
                          {change.crud_test_results.passedTests}/{change.crud_test_results.totalTests}
                        </span>
                      </div>
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {change.change_description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}