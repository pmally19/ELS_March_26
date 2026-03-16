import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChartIcon, LineChartIcon, PieChartIcon, TableIcon, GaugeIcon, ActivityIcon } from "lucide-react";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: string, widgetConfig: any) => void;
}

export default function AddWidgetDialog({ open, onOpenChange, onAddWidget }: AddWidgetDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState("sales");
  const [selectedWidgetType, setSelectedWidgetType] = useState("");
  const [selectedDataSource, setSelectedDataSource] = useState("");
  
  const handleAddWidget = () => {
    if (!selectedWidgetType || !selectedDataSource) return;
    
    onAddWidget(selectedWidgetType, {
      category: selectedCategory,
      dataSource: selectedDataSource,
      title: getWidgetTitle(selectedWidgetType, selectedDataSource)
    });
    
    // Reset form
    setSelectedWidgetType("");
    setSelectedDataSource("");
    onOpenChange(false);
  };
  
  const getWidgetTitle = (type: string, dataSource: string) => {
    const typeMap: Record<string, string> = {
      "line-chart": "Trend",
      "bar-chart": "Comparison",
      "pie-chart": "Distribution",
      "table": "Summary",
      "kpi": "Key Metrics",
      "activity": "Recent Activity"
    };
    
    const dataSourceMap: Record<string, string> = {
      "sales": "Sales",
      "orders": "Orders",
      "customers": "Customers",
      "inventory": "Inventory",
      "production": "Production",
      "finance": "Finance",
      "expenses": "Expenses",
      "revenue": "Revenue"
    };
    
    return `${dataSourceMap[dataSource] || dataSource} ${typeMap[type] || type}`;
  };
  
  const widgetOptions = [
    { id: "line-chart", name: "Line Chart", icon: LineChartIcon, description: "Show trends over time" },
    { id: "bar-chart", name: "Bar Chart", icon: BarChartIcon, description: "Compare values across categories" },
    { id: "pie-chart", name: "Pie Chart", icon: PieChartIcon, description: "Show distribution or composition" },
    { id: "table", name: "Data Table", icon: TableIcon, description: "Display detailed information in rows and columns" },
    { id: "kpi", name: "KPI Card", icon: GaugeIcon, description: "Highlight key performance indicators" },
    { id: "activity", name: "Activity Feed", icon: ActivityIcon, description: "Display recent events or updates" }
  ];
  
  // Get data sources based on selected category
  const getDataSources = () => {
    switch (selectedCategory) {
      case "sales":
        return [
          { id: "sales", name: "Sales Data" },
          { id: "orders", name: "Orders" },
          { id: "customers", name: "Customers" },
          { id: "quotes", name: "Quotes" },
          { id: "invoices", name: "Invoices" }
        ];
      case "inventory":
        return [
          { id: "inventory", name: "Inventory Levels" },
          { id: "materials", name: "Materials" },
          { id: "stock", name: "Stock Movements" },
          { id: "warehouses", name: "Warehouse Status" }
        ];
      case "finance":
        return [
          { id: "revenue", name: "Revenue" },
          { id: "expenses", name: "Expenses" },
          { id: "accounts", name: "Accounts" },
          { id: "profitability", name: "Profitability" }
        ];
      case "production":
        return [
          { id: "production", name: "Production Orders" },
          { id: "capacity", name: "Capacity Utilization" },
          { id: "quality", name: "Quality Metrics" }
        ];
      default:
        return [];
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Widget to Dashboard</DialogTitle>
          <DialogDescription>
            Select the type of widget and data source you want to add to your dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="sales" className="w-full mt-4" onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>
          
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Widget Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {widgetOptions.map((widget) => (
                  <Card 
                    key={widget.id}
                    className={`cursor-pointer border-2 hover:bg-accent/20 transition-colors ${
                      selectedWidgetType === widget.id ? 'border-primary' : 'border-border'
                    }`}
                    onClick={() => setSelectedWidgetType(widget.id)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <widget.icon className="h-8 w-8 mb-2 text-primary" />
                      <div className="font-medium">{widget.name}</div>
                      <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="data-source" className="text-sm font-medium mb-2 block">
                Data Source
              </Label>
              <Select
                value={selectedDataSource}
                onValueChange={setSelectedDataSource}
              >
                <SelectTrigger id="data-source" className="w-full">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {getDataSources().map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddWidget}
            disabled={!selectedWidgetType || !selectedDataSource}
          >
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}