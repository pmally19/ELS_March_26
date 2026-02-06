import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, BarChart3, Calendar, Target, Zap, Filter, Download, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ForecastPeriod {
  id: number;
  period: string;
  year: number;
  month: number;
  materialCode: string;
  materialName: string;
  forecastQuantity: number;
  actualQuantity?: number;
  variance?: number;
  variancePercent?: number;
  confidence: number;
  forecastMethod: 'historical' | 'trend' | 'seasonal' | 'manual';
  status: 'draft' | 'approved' | 'active' | 'closed';
  createdBy: string;
  lastUpdated: string;
}

interface ForecastModel {
  id: number;
  modelName: string;
  description: string;
  methodology: string;
  accuracy: number;
  materials: string[];
  active: boolean;
}

interface DemandPattern {
  period: string;
  historical: number;
  forecast: number;
  trend: number;
  seasonal: number;
}

export default function WholesaleForecast() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [forecastDialog, setForecastDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ForecastModel | null>(null);
  const [newForecast, setNewForecast] = useState({
    materialCode: '',
    period: '',
    quantity: 0,
    method: 'historical' as const,
    confidence: 85
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch forecast data
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['/api/sales/wholesale-forecast', selectedPeriod, selectedMaterial],
    queryFn: async () => {
      const response = await apiRequest(`/api/sales/wholesale-forecast?period=${selectedPeriod}&material=${selectedMaterial}`);
      return Array.isArray(response) ? response : sampleForecasts;
    }
  });

  // Fetch materials for forecasting
  const { data: materials = [] } = useQuery({
    queryKey: ['/api/master-data/materials'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/materials');
      return Array.isArray(response) ? response : sampleMaterials;
    }
  });

  // Fetch forecast models
  const { data: models = [] } = useQuery({
    queryKey: ['/api/sales/forecast-models'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales/forecast-models');
      return Array.isArray(response) ? response : sampleModels;
    }
  });

  // Generate forecast mutation
  const generateForecastMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/sales/wholesale-forecast/generate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Forecast generated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/wholesale-forecast'] });
      setForecastDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate forecast",
        variant: "destructive"
      });
    }
  });

  // Calculate forecast metrics
  const forecastMetrics = {
    totalMaterials: new Set(forecasts.map(f => f.materialCode)).size,
    totalForecast: forecasts.reduce((sum, f) => sum + f.forecastQuantity, 0),
    averageAccuracy: forecasts.length > 0 
      ? forecasts.reduce((sum, f) => sum + (f.confidence || 0), 0) / forecasts.length 
      : 0,
    varianceCount: forecasts.filter(f => f.variance && Math.abs(f.variance) > 10).length
  };

  const handleGenerateForecast = () => {
    if (!newForecast.materialCode || !newForecast.period) {
      toast({
        title: "Validation Error",
        description: "Please select material and period",
        variant: "destructive"
      });
      return;
    }

    generateForecastMutation.mutate(newForecast);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Calendar },
      approved: { color: "bg-blue-100 text-blue-800", icon: Target },
      active: { color: "bg-green-100 text-green-800", icon: Zap },
      closed: { color: "bg-red-100 text-red-800", icon: TrendingDown }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Calendar;

    return (
      <Badge className={config?.color || "bg-gray-100 text-gray-800"}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getVarianceBadge = (variance: number | undefined) => {
    if (variance === undefined) return null;
    
    const absVariance = Math.abs(variance);
    if (absVariance <= 5) {
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    } else if (absVariance <= 15) {
      return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
    }
  };

  // Prepare chart data
  const chartData = sampleDemandPattern.map(item => ({
    ...item,
    historicalShort: item.historical,
    forecastShort: item.forecast
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Wholesale Forecast</h1>
          <p className="text-sm text-muted-foreground">Demand planning and sales forecasting for wholesale operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setForecastDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Forecast
          </Button>
        </div>
      </div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Materials Forecasted</p>
                <p className="text-2xl font-bold">{forecastMetrics.totalMaterials}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Forecast Qty</p>
                <p className="text-2xl font-bold">{forecastMetrics.totalForecast.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{forecastMetrics.averageAccuracy.toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Variance</p>
                <p className="text-2xl font-bold">{forecastMetrics.varianceCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Label>Filters:</Label>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Period</SelectItem>
                <SelectItem value="next">Next Period</SelectItem>
                <SelectItem value="quarter">Next Quarter</SelectItem>
                <SelectItem value="year">Next Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {materials.map((material: any) => (
                  <SelectItem key={material.code} value={material.code}>
                    {material.code} - {material.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="forecasts">
        <TabsList>
          <TabsTrigger value="forecasts">Current Forecasts</TabsTrigger>
          <TabsTrigger value="analysis">Demand Analysis</TabsTrigger>
          <TabsTrigger value="models">Forecast Models</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle>Forecast Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading forecasts...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Forecast Qty</TableHead>
                      <TableHead>Actual Qty</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecasts.map((forecast) => (
                      <TableRow key={forecast.id}>
                        <TableCell>{forecast.period}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{forecast.materialCode}</div>
                            <div className="text-sm text-muted-foreground">{forecast.materialName}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{forecast.forecastQuantity.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">
                          {forecast.actualQuantity ? forecast.actualQuantity.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {forecast.variance !== undefined && (
                              <>
                                <span className={`font-mono ${forecast.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {forecast.variance > 0 ? '+' : ''}{forecast.variance}%
                                </span>
                                {getVarianceBadge(forecast.variance)}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${forecast.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono">{forecast.confidence}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{forecast.forecastMethod}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(forecast.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demand Pattern Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="historicalShort" 
                      stroke="#8884d8" 
                      name="Historical Demand"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forecastShort" 
                      stroke="#82ca9d" 
                      name="Forecast"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="trend" 
                      stroke="#ffc658" 
                      name="Trend"
                      strokeWidth={1}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forecast Accuracy by Method</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sampleAccuracyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Forecast Models</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Methodology</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.modelName}</TableCell>
                      <TableCell>{model.methodology}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${model.accuracy}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono">{model.accuracy}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.materials.length} materials</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={model.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {model.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">Configure</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Forecast Dialog */}
      <Dialog open={forecastDialog} onOpenChange={setForecastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Forecast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="material">Material</Label>
              <Select value={newForecast.materialCode} onValueChange={(value) => 
                setNewForecast(prev => ({ ...prev, materialCode: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material: any) => (
                    <SelectItem key={material.code} value={material.code}>
                      {material.code} - {material.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Forecast Period</Label>
              <Input
                id="period"
                type="month"
                value={newForecast.period}
                onChange={(e) => setNewForecast(prev => ({ ...prev, period: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="method">Forecast Method</Label>
              <Select value={newForecast.method} onValueChange={(value: any) => 
                setNewForecast(prev => ({ ...prev, method: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">Historical Average</SelectItem>
                  <SelectItem value="trend">Trend Analysis</SelectItem>
                  <SelectItem value="seasonal">Seasonal Adjustment</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newForecast.method === 'manual' && (
              <div>
                <Label htmlFor="quantity">Forecast Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newForecast.quantity}
                  onChange={(e) => setNewForecast(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForecastDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateForecast}
                disabled={generateForecastMutation.isPending}
              >
                {generateForecastMutation.isPending ? 'Generating...' : 'Generate Forecast'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sample data
const sampleForecasts: ForecastPeriod[] = [
  {
    id: 1,
    period: "2024-03",
    year: 2024,
    month: 3,
    materialCode: "TECH-001",
    materialName: "Advanced Software License",
    forecastQuantity: 150,
    actualQuantity: 142,
    variance: -5.3,
    variancePercent: -5.3,
    confidence: 88,
    forecastMethod: "trend",
    status: "closed",
    createdBy: "Forecast Manager",
    lastUpdated: "2024-02-15"
  },
  {
    id: 2,
    period: "2024-04",
    year: 2024,
    month: 4,
    materialCode: "PROD-105",
    materialName: "Industrial Equipment",
    forecastQuantity: 75,
    confidence: 92,
    forecastMethod: "historical",
    status: "active",
    createdBy: "Sales Planner",
    lastUpdated: "2024-03-20"
  }
];

const sampleMaterials = [
  { code: "TECH-001", description: "Advanced Software License" },
  { code: "PROD-105", description: "Industrial Equipment" },
  { code: "SERV-200", description: "Consulting Services" }
];

const sampleModels: ForecastModel[] = [
  {
    id: 1,
    modelName: "Seasonal Trend Model",
    description: "Advanced seasonal trending with historical patterns",
    methodology: "Machine Learning + Seasonal Decomposition",
    accuracy: 87,
    materials: ["TECH-001", "PROD-105"],
    active: true
  },
  {
    id: 2,
    modelName: "Linear Regression Model",
    description: "Simple linear regression based on historical data",
    methodology: "Linear Regression",
    accuracy: 73,
    materials: ["SERV-200"],
    active: false
  }
];

const sampleDemandPattern: DemandPattern[] = [
  { period: "Jan", historical: 120, forecast: 125, trend: 115, seasonal: 130 },
  { period: "Feb", historical: 135, forecast: 140, trend: 125, seasonal: 145 },
  { period: "Mar", historical: 150, forecast: 155, trend: 135, seasonal: 160 },
  { period: "Apr", historical: 165, forecast: 170, trend: 145, seasonal: 175 },
  { period: "May", historical: 180, forecast: 185, trend: 155, seasonal: 190 },
  { period: "Jun", historical: 195, forecast: 200, trend: 165, seasonal: 205 }
];

const sampleAccuracyData = [
  { method: "Historical", accuracy: 73 },
  { method: "Trend", accuracy: 85 },
  { method: "Seasonal", accuracy: 91 },
  { method: "Manual", accuracy: 67 }
];