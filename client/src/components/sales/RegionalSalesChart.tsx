import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  Globe, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Plus,
  Eye
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface RegionalData {
  region: string;
  sales: number;
  percentage: number;
  growth: number;
}

interface RegionalSalesChartProps {
  onCustomize?: () => void;
}

const RegionalSalesChart: React.FC<RegionalSalesChartProps> = ({ onCustomize }) => {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['sales', 'growth']);

  const { data: regionalData, isLoading } = useQuery({
    queryKey: ['/api/sales/regional-data'],
    staleTime: 5 * 60 * 1000
  });

  const kpiOptions = [
    { id: 'sales', label: 'Sales Revenue', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'growth', label: 'Growth Rate', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'percentage', label: 'Market Share', icon: <PieChart className="h-4 w-4" /> },
    { id: 'customers', label: 'Customer Count', icon: <Globe className="h-4 w-4" /> },
    { id: 'orders', label: 'Order Volume', icon: <BarChart3 className="h-4 w-4" /> }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sales by Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-center">
              <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = regionalData || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sales by Region
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(value: 'pie' | 'bar') => setChartType(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Pie
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCustomizer(true)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Customize
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartType === 'pie' ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="sales"
                    nameKey="region"
                    label={({ region, percentage }) => `${region}: ${percentage}%`}
                  >
                    {data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value / 1000) + 'K'} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Regional Summary */}
          <div className="mt-4 space-y-2">
            {data.map((region: RegionalData, index: number) => (
              <div key={region.region} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{region.region}</span>
                </div>
                <div className="flex items-center gap-4">
                  {selectedKPIs.includes('sales') && (
                    <span className="text-sm font-semibold">{formatCurrency(region.sales)}</span>
                  )}
                  {selectedKPIs.includes('percentage') && (
                    <Badge variant="secondary">{formatPercentage(region.percentage)}</Badge>
                  )}
                  {selectedKPIs.includes('growth') && (
                    <div className="flex items-center gap-1">
                      {region.growth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${region.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(Math.abs(region.growth))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customization Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Regional Sales Chart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Chart Type</h4>
              <Select value={chartType} onValueChange={(value: 'pie' | 'bar') => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Display KPIs</h4>
              <div className="space-y-2">
                {kpiOptions.map((kpi) => (
                  <div key={kpi.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={kpi.id}
                      checked={selectedKPIs.includes(kpi.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKPIs(prev => [...prev, kpi.id]);
                        } else {
                          setSelectedKPIs(prev => prev.filter(id => id !== kpi.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={kpi.id} className="flex items-center gap-2 text-sm">
                      {kpi.icon}
                      {kpi.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCustomizer(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCustomizer(false)}>
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RegionalSalesChart;