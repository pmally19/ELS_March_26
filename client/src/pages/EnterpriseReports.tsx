import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import { 
  DollarSign, Package, Activity, TrendingUp, Download, RefreshCw
} from "lucide-react";

export default function EnterpriseReports() {
  const { toast } = useToast();
  const [selectedView, setSelectedView] = useState('financeview');

  // Fetch enterprise summary
  const { data: enterpriseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/reports/enterprise-summary'],
  });

  // Fetch enterprise view data
  const { data: viewData, isLoading: viewLoading, refetch } = useQuery({
    queryKey: ['/api/reports/enterprise-views/' + selectedView],
    enabled: !!selectedView,
  });

  const handleExport = () => {
    if (!viewData?.data) return;
    
    const csv = [
      Object.keys(viewData.data[0]).join(','),
      ...viewData.data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedView}_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `${selectedView} data exported successfully`,
    });
  };

  const getViewTitle = (view: string) => {
    const titles = {
      financeview: "Finance View",
      materialflowview: "Material Flow View", 
      inventoryflowview: "Inventory Flow View",
      financialmaterialintegrationview: "Integration View"
    };
    return titles[view as keyof typeof titles] || view;
  };

  const getViewDescription = (view: string) => {
    const descriptions = {
      financeview: "Financial reporting with master data integration and risk assessment",
      materialflowview: "Material movement analytics with value stream tracking",
      inventoryflowview: "Inventory management analytics by material and location",
      financialmaterialintegrationview: "Complete business process integration analysis"
    };
    return descriptions[view as keyof typeof descriptions] || "";
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Header title="Enterprise Reports" subtitle="Comprehensive business intelligence from your gigantic tables" />

      {/* Enterprise Summary Cards */}
      {enterpriseSummary && !summaryLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financial Records</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseSummary.finance_records}</div>
              <p className="text-xs text-muted-foreground">
                Revenue: ${parseFloat(enterpriseSummary.total_revenue || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Material Movements</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseSummary.material_records}</div>
              <p className="text-xs text-muted-foreground">
                Value: ${parseFloat(enterpriseSummary.total_material_value || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Analytics</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseSummary.inventory_records}</div>
              <p className="text-xs text-muted-foreground">Inventory summaries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Integration Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseSummary.integration_records}</div>
              <p className="text-xs text-muted-foreground">Cross-module flows</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Selection and Data Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enterprise Reporting Views</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select a view to explore comprehensive business data with master data integration
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!viewData?.data}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger>
                <SelectValue placeholder="Select enterprise view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financeview">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Finance View - Financial reporting with master data
                  </div>
                </SelectItem>
                <SelectItem value="materialflowview">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Material Flow View - Material movement analytics
                  </div>
                </SelectItem>
                <SelectItem value="inventoryflowview">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Inventory Flow View - Inventory management analytics
                  </div>
                </SelectItem>
                <SelectItem value="financialmaterialintegrationview">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Integration View - Complete business process integration
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View Data Display */}
            {viewLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading view data...</div>
              </div>
            )}

            {viewData && !viewLoading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{getViewTitle(selectedView)}</h3>
                    <p className="text-sm text-muted-foreground">{getViewDescription(selectedView)}</p>
                  </div>
                  <Badge variant="secondary">{viewData.total} records</Badge>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {viewData.data?.[0] && Object.keys(viewData.data[0]).map((key) => (
                            <th key={key} className="text-left p-3 font-medium">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.data?.map((row, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-3">
                                {typeof value === 'number' && value > 1000 ? 
                                  value.toLocaleString() : 
                                  String(value || '-')
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              </div>
            )}

            {!viewData && !viewLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">No data available for this view</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}