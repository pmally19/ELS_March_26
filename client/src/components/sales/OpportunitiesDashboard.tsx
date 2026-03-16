import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Helper function to get stage badge styling
const getStageBadge = (stage: string) => {
  switch (stage) {
    case 'Prospecting':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Prospecting</Badge>;
    case 'Qualification':
      return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Qualification</Badge>;
    case 'Needs Analysis':
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Needs Analysis</Badge>;
    case 'Value Proposition':
      return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200">Value Proposition</Badge>;
    case 'Identify Decision Makers':
      return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200">Decision Makers</Badge>;
    case 'Proposal/Price Quote':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Proposal/Quote</Badge>;
    case 'Negotiation/Review':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Negotiation</Badge>;
    case 'Closed Won':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Closed Won</Badge>;
    case 'Closed Lost':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Closed Lost</Badge>;
    default:
      return <Badge>{stage}</Badge>;
  }
};

// Component for displaying opportunities dashboard
const OpportunitiesDashboard: React.FC = () => {
  // State for pipeline data
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [isPipelineLoading, setIsPipelineLoading] = useState(false);
  
  // State for open opportunities
  const [openOpportunities, setOpenOpportunities] = useState<any[]>([]);
  const [isOpenOpportunitiesLoading, setIsOpenOpportunitiesLoading] = useState(false);

  // Function to fetch pipeline data from the dedicated endpoint
  const fetchPipelineData = async () => {
    setIsPipelineLoading(true);
    try {
      const response = await fetch('/api/sales-module/pipeline-by-stage');
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline data');
      }
      const data = await response.json();
      setPipelineData(data);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setIsPipelineLoading(false);
    }
  };

  // Function to fetch open opportunities from the dedicated endpoint
  const fetchOpenOpportunities = async () => {
    setIsOpenOpportunitiesLoading(true);
    try {
      const response = await fetch('/api/sales-module/open-opportunities');
      if (!response.ok) {
        throw new Error('Failed to fetch open opportunities');
      }
      const data = await response.json();
      setOpenOpportunities(data);
    } catch (error) {
      console.error('Error fetching open opportunities:', error);
    } finally {
      setIsOpenOpportunitiesLoading(false);
    }
  };

  // Fetch both sets of data on component mount
  useEffect(() => {
    fetchPipelineData();
    fetchOpenOpportunities();
  }, []);

  // Calculate total pipeline value and count
  const totalCount = pipelineData.reduce((sum, stage) => sum + Number(stage.count), 0);
  const totalValue = pipelineData.reduce((sum, stage) => sum + Number(stage.value), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Pipeline by Stage Component */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Pipeline by Stage</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchPipelineData} 
            disabled={isPipelineLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isPipelineLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent>
          {isPipelineLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : pipelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-gray-500 mb-2">No pipeline data available</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPipelineData}
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
                {pipelineData.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStageBadge(stage.stage)}
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

      {/* Open Opportunities Component */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Open Opportunities</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchOpenOpportunities} 
            disabled={isOpenOpportunitiesLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isOpenOpportunitiesLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent>
          {isOpenOpportunitiesLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : openOpportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-gray-500 mb-2">No open opportunities available</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOpenOpportunities}
                className="mt-2"
              >
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="space-y-3">
                {openOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="p-3 hover:bg-gray-50 rounded-md cursor-pointer border mb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-sm">
                          {opportunity.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {opportunity.customer || "No customer"}
                        </p>
                      </div>
                      {getStageBadge(opportunity.stage)}
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
                        <span className="font-medium">
                          {opportunity.expected_close_date 
                            ? new Date(opportunity.expected_close_date).toLocaleDateString() 
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OpportunitiesDashboard;