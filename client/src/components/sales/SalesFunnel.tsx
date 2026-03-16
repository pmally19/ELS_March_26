import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Target, 
  FileText, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Settings,
  Triangle
} from 'lucide-react';

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  conversionRate?: number;
  color: string;
  icon: React.ReactNode;
}

interface SalesFunnelProps {
  onCustomize?: () => void;
}

const SalesFunnel: React.FC<SalesFunnelProps> = ({ onCustomize }) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch sales funnel data
  const { data: funnelData = [], isLoading } = useQuery({
    queryKey: ['/api/sales/funnel-data'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/sales/funnel-data');
        if (!response.ok) {
          // Fallback to constructing data from available APIs
          return await fetchFallbackFunnelData();
        }
        const apiData = await response.json();
        
        // Transform API data to include proper icons
        return apiData.map((stage: any) => ({
          ...stage,
          icon: getIconForStage(stage.stage || stage.icon)
        }));
      } catch (error) {
        return await fetchFallbackFunnelData();
      }
    },
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Helper function to get proper icons for stages
  const getIconForStage = (stageNameOrIcon: string) => {
    switch (stageNameOrIcon) {
      case 'Leads':
      case 'Users':
        return <Users className="h-5 w-5" />;
      case 'Qualified':
      case 'Target':
        return <Target className="h-5 w-5" />;
      case 'Proposal':
      case 'FileText':
        return <FileText className="h-5 w-5" />;
      case 'Negotiation':
      case 'DollarSign':
        return <DollarSign className="h-5 w-5" />;
      case 'Closed Won':
      case 'CheckCircle':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Triangle className="h-5 w-5" />;
    }
  };

  // Fallback function to construct funnel data from existing APIs
  const fetchFallbackFunnelData = async (): Promise<FunnelStage[]> => {
    try {
      // Get data from existing APIs
      const [leadsRes, oppsRes, quotesRes, ordersRes, metricsRes] = await Promise.all([
        fetch('/api/sales/leads').catch(() => ({ json: () => [] })),
        fetch('/api/sales/opportunities').catch(() => ({ json: () => [] })),
        fetch('/api/sales/quotes').catch(() => ({ json: () => [] })),
        fetch('/api/sales/orders').catch(() => ({ json: () => [] })),
        fetch('/api/sales/metrics').catch(() => ({ json: () => null }))
      ]);

      const leads = await leadsRes.json();
      const opportunities = await oppsRes.json();
      const quotes = await quotesRes.json();
      const orders = await ordersRes.json();
      const metrics = await metricsRes.json();

      // Handle different response formats
      const leadsCount = Array.isArray(leads) ? leads.length : (leads?.data?.length || leads?.count || 0);
      const oppsCount = Array.isArray(opportunities) ? opportunities.length : (opportunities?.data?.length || opportunities?.count || 0);
      const quotesCount = Array.isArray(quotes) ? quotes.length : (quotes?.data?.length || quotes?.count || 0);
      const ordersCount = Array.isArray(orders) ? orders.length : (orders?.data?.length || orders?.count || 0);
      const totalRevenue = metrics?.totalRevenue || 0;

      // Calculate conversion rates
      const leadsToOppsRate = leadsCount > 0 ? (oppsCount / leadsCount) * 100 : 0;
      const oppsToQuotesRate = oppsCount > 0 ? (quotesCount / oppsCount) * 100 : 0;
      const quotesToOrdersRate = quotesCount > 0 ? (ordersCount / quotesCount) * 100 : 0;

      // Calculate average values based on actual data
      const avgLeadValue = leadsCount > 0 ? (totalRevenue / leadsCount) * 0.1 : 2500;
      const avgOppValue = oppsCount > 0 ? (totalRevenue / oppsCount) * 0.3 : 8500;
      const avgQuoteValue = quotesCount > 0 ? (totalRevenue / quotesCount) * 0.5 : 12000;
      const avgOrderValue = ordersCount > 0 ? (totalRevenue / ordersCount) : 18800;

      // Calculate realistic values based on counts
      const funnelStages: FunnelStage[] = [
        {
          stage: 'Leads',
          count: leadsCount,
          value: leadsCount * avgLeadValue,
          color: 'bg-blue-500',
          icon: <Users className="h-5 w-5" />
        },
        {
          stage: 'Opportunities',
          count: oppsCount,
          value: oppsCount * avgOppValue,
          conversionRate: parseFloat(leadsToOppsRate.toFixed(1)),
          color: 'bg-green-500',
          icon: <Target className="h-5 w-5" />
        },
        {
          stage: 'Quotes',
          count: quotesCount,
          value: quotesCount * avgQuoteValue,
          conversionRate: parseFloat(oppsToQuotesRate.toFixed(1)),
          color: 'bg-yellow-500',
          icon: <FileText className="h-5 w-5" />
        },
        {
          stage: 'Orders',
          count: ordersCount,
          value: ordersCount * avgOrderValue,
          conversionRate: parseFloat(quotesToOrdersRate.toFixed(1)),
          color: 'bg-purple-500',
          icon: <CheckCircle className="h-5 w-5" />
        },
        {
          stage: 'Revenue',
          count: ordersCount,
          value: totalRevenue,
          conversionRate: 100,
          color: 'bg-emerald-500',
          icon: <DollarSign className="h-5 w-5" />
        }
      ];

      return funnelStages;
    } catch (error) {
      console.error('Error constructing funnel data:', error);
      return [];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Triangle className="h-5 w-5" />
            Sales Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Triangle className="h-5 w-5" />
            Sales Funnel
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCustomize}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Customize
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelData.map((stage: FunnelStage, index: number) => {
            const isSelected = selectedStage === stage.stage;
            const stageWidth = Math.max(20, 100 - (index * 15)); // Decreasing width for funnel effect
            
            return (
              <div
                key={stage.stage}
                className={`relative cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-105' : 'hover:scale-102'
                }`}
                onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
              >
                {/* Funnel Stage Bar */}
                <div 
                  className={`rounded-lg p-4 mx-auto transition-all duration-300 ${
                    isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  } ${stage.color.startsWith('#') ? '' : stage.color}`}
                  style={{ 
                    width: `${stageWidth}%`,
                    backgroundColor: stage.color.startsWith('#') ? stage.color : undefined
                  }}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      {stage.icon}
                      <div>
                        <h4 className="font-semibold text-sm">{stage.stage}</h4>
                        <p className="text-xs opacity-90">
                          {formatNumber(stage.count)} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(stage.value)}
                      </div>
                      {stage.conversionRate && (
                        <div className="text-xs opacity-90 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {stage.conversionRate}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversion Arrow */}
                {index < funnelData.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-400"></div>
                  </div>
                )}

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Count:</span>
                        <span className="ml-2">{formatNumber(stage.count)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Value:</span>
                        <span className="ml-2">{formatCurrency(stage.value)}</span>
                      </div>
                      {stage.conversionRate && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">Conversion Rate:</span>
                          <Badge variant="secondary" className="ml-2">
                            {stage.conversionRate}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(funnelData[0]?.count || 0)}
              </div>
              <div className="text-xs text-gray-500">Total Leads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {funnelData.length > 0 ? 
                  Math.round(((funnelData[funnelData.length - 1]?.count || 0) / (funnelData[0]?.count || 1)) * 100) : 0
                }%
              </div>
              <div className="text-xs text-gray-500">Overall Conversion</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(funnelData[funnelData.length - 1]?.value || 0)}
              </div>
              <div className="text-xs text-gray-500">Total Revenue</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesFunnel;