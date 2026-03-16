import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type Opportunity = {
  id: number;
  name: string;
  stage: string;
  value: number;
  probability: number;
  expected_close_date: string;
  customer: string;
};

export default function OpenOpportunities() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch open opportunities data
  const { 
    data = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['/api/sales/opportunities-open'],
    queryFn: async () => {
      const response = await fetch('/api/sales/opportunities-open');
      if (!response.ok) {
        throw new Error('Failed to fetch open opportunities');
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

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Open Opportunities</CardTitle>
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
            <p className="text-gray-500 mb-2">No open opportunities available</p>
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
          <div className="overflow-hidden">
            <div className="space-y-3">
              {data.map((opportunity: Opportunity) => (
                <Link key={opportunity.id} href={`/sales/opportunities/${opportunity.id}`}>
                  <div className="p-3 hover:bg-gray-50 rounded-md cursor-pointer border mb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-sm">
                          {opportunity.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {opportunity.customer || "No customer"}
                        </p>
                      </div>
                      <Badge className={`${getStageColor(opportunity.stage)} text-xs`}>
                        {opportunity.stage}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div>
                        <span className="text-gray-500 block">Value</span>
                        <span className="font-medium">{formatCurrency(Number(opportunity.value))}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Probability</span>
                        <span className="font-medium">{opportunity.probability}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Close Date</span>
                        <span className="font-medium">{formatDate(opportunity.expected_close_date)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}