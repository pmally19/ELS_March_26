import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PipelineStage = {
  stage: string;
  count: number;
  value: number;
};

export default function OpportunitiesPipeline() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch opportunity pipeline data
  const { 
    data = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['/api/sales/opportunities-pipeline'],
    queryFn: async () => {
      const response = await fetch('/api/sales/opportunities-pipeline');
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline data');
      }
      return response.json();
    }
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get color for stage
  const getStageColor = (stage: string): string => {
    switch (stage?.toLowerCase()) {
      case 'prospecting':
        return 'bg-blue-100 text-blue-800';
      case 'qualification':
        return 'bg-purple-100 text-purple-800';
      case 'needs analysis':
        return 'bg-indigo-100 text-indigo-800';
      case 'value proposition':
        return 'bg-teal-100 text-teal-800';
      case 'identify decision makers':
        return 'bg-cyan-100 text-cyan-800';
      case 'proposal/price quote':
        return 'bg-green-100 text-green-800';
      case 'negotiation/review':
        return 'bg-amber-100 text-amber-800';
      case 'closed won':
        return 'bg-emerald-100 text-emerald-800';
      case 'closed lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate total value
  const totalValue = data.reduce((sum: number, stage: PipelineStage) => sum + Number(stage.value), 0);
  
  // Calculate total count
  const totalCount = data.reduce((sum: number, stage: PipelineStage) => sum + Number(stage.count), 0);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Pipeline by Stage</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading || isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-500 mb-2">No pipeline data available</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="mt-2"
            >
              Refresh Data
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Stage</span>
              <div className="flex space-x-8">
                <span className="w-12 text-right">Count</span>
                <span className="w-24 text-right">Value</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {data.map((stage: PipelineStage) => (
                <div key={stage.stage} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className={`${getStageColor(stage.stage)} rounded-full px-3 py-1`}>
                      {stage.stage}
                    </Badge>
                  </div>
                  <div className="flex space-x-8">
                    <span className="w-12 text-right font-medium">{stage.count}</span>
                    <span className="w-24 text-right font-medium">{formatCurrency(Number(stage.value))}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-3 mt-3 border-t">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <div className="flex space-x-8">
                  <span className="w-12 text-right">{totalCount}</span>
                  <span className="w-24 text-right">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}