import { useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, X, Save, Settings } from "lucide-react";
import OverviewStats from "@/components/dashboard/OverviewStats";
import ChartSection from "@/components/dashboard/ChartSection";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import InventoryActivity from "@/components/dashboard/InventoryActivity";
import TopSellingProducts from "@/components/dashboard/TopSellingProducts";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Define widget type
interface Widget {
  id: string;
  name: string;
  component: React.ComponentType;
  minW: number;
  minH: number;
}

// Define dashboard state type
interface DashboardState {
  layouts: Layouts;
  widgets: string[];
}

// Define available widgets
const AVAILABLE_WIDGETS: Widget[] = [
  { id: "overview", name: "Overview Statistics", component: OverviewStats, minW: 3, minH: 2 },
  { id: "chart", name: "Sales Chart", component: ChartSection, minW: 3, minH: 2 },
  { id: "recentOrders", name: "Recent Orders", component: RecentOrdersTable, minW: 2, minH: 2 },
  { id: "inventory", name: "Inventory Activity", component: InventoryActivity, minW: 2, minH: 2 },
  { id: "topProducts", name: "Top Products", component: TopSellingProducts, minW: 2, minH: 2 },
  { id: "activity", name: "Activity Feed", component: ActivityFeed, minW: 2, minH: 2 },
  { id: "quickActions", name: "Quick Actions", component: QuickActions, minW: 2, minH: 1 }
];

// Find widget by id
const findWidgetById = (id: string) => AVAILABLE_WIDGETS.find(widget => widget.id === id);

export default function CustomizableDashboard() {
  // Dashboard state with widgets and their layouts
  const [dashboardState, setDashboardState] = useState<DashboardState>(() => {
    // Try to load saved state from localStorage
    try {
      const savedState = localStorage.getItem("dashboardState");
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error("Error loading dashboard state:", error);
    }
    
    // Default state if no saved state exists
    return {
      layouts: {
        lg: [
          { i: "overview", x: 0, y: 0, w: 12, h: 2, minW: 3, minH: 2 },
          { i: "chart", x: 0, y: 2, w: 8, h: 4, minW: 3, minH: 2 },
          { i: "inventory", x: 8, y: 2, w: 4, h: 4, minW: 2, minH: 2 },
          { i: "topProducts", x: 0, y: 6, w: 6, h: 4, minW: 2, minH: 2 },
          { i: "activity", x: 6, y: 6, w: 6, h: 4, minW: 2, minH: 2 }
        ],
        md: [
          { i: "overview", x: 0, y: 0, w: 10, h: 2, minW: 3, minH: 2 },
          { i: "chart", x: 0, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
          { i: "inventory", x: 6, y: 2, w: 4, h: 4, minW: 2, minH: 2 },
          { i: "topProducts", x: 0, y: 6, w: 5, h: 4, minW: 2, minH: 2 },
          { i: "activity", x: 5, y: 6, w: 5, h: 4, minW: 2, minH: 2 }
        ],
        sm: [
          { i: "overview", x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
          { i: "chart", x: 0, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
          { i: "inventory", x: 0, y: 6, w: 6, h: 4, minW: 2, minH: 2 },
          { i: "topProducts", x: 0, y: 10, w: 6, h: 4, minW: 2, minH: 2 },
          { i: "activity", x: 0, y: 14, w: 6, h: 4, minW: 2, minH: 2 }
        ],
        xs: [
          { i: "overview", x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
          { i: "chart", x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 2 },
          { i: "inventory", x: 0, y: 6, w: 4, h: 4, minW: 2, minH: 2 },
          { i: "topProducts", x: 0, y: 10, w: 4, h: 4, minW: 2, minH: 2 },
          { i: "activity", x: 0, y: 14, w: 4, h: 4, minW: 2, minH: 2 }
        ]
      },
      widgets: ["overview", "chart", "inventory", "topProducts", "activity"]
    };
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  
  // Save dashboard state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("dashboardState", JSON.stringify(dashboardState));
    } catch (error) {
      console.error("Error saving dashboard state:", error);
    }
  }, [dashboardState]);
  
  // Handle layout changes
  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    setDashboardState((prevState: DashboardState) => ({
      ...prevState,
      layouts: allLayouts
    }));
  };
  
  // Add a widget to the dashboard
  const addWidget = (widgetId: string) => {
    const widget = findWidgetById(widgetId);
    if (!widget) return;
    
    // If widget is already on dashboard, don't add it again
    if (dashboardState.widgets.includes(widgetId)) {
      setIsWidgetSelectorOpen(false);
      return;
    }
    
    // Create new layout item for each breakpoint
    const newLayouts = { ...dashboardState.layouts };
    
    // Add to all breakpoints
    Object.keys(newLayouts).forEach(breakpoint => {
      // Find the lowest y position to place the widget at the bottom
      let maxY = 0;
      newLayouts[breakpoint].forEach((item: Layout) => {
        const itemBottom = item.y + item.h;
        if (itemBottom > maxY) maxY = itemBottom;
      });
      
      // Determine width based on breakpoint
      let w = 6;
      if (breakpoint === 'lg') w = 6;
      else if (breakpoint === 'md') w = 5;
      else if (breakpoint === 'sm') w = 6;
      else if (breakpoint === 'xs') w = 4;
      
      newLayouts[breakpoint].push({
        i: widgetId,
        x: 0,
        y: maxY,
        w,
        h: 4,
        minW: widget.minW || 2,
        minH: widget.minH || 2
      });
    });
    
    setDashboardState((prevState: DashboardState) => ({
      ...prevState,
      layouts: newLayouts,
      widgets: [...prevState.widgets, widgetId]
    }));
    
    setIsWidgetSelectorOpen(false);
  };
  
  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    setDashboardState((prevState: DashboardState) => {
      const newLayouts = { ...prevState.layouts };
      
      // Remove from all breakpoints
      Object.keys(newLayouts).forEach(breakpoint => {
        newLayouts[breakpoint] = newLayouts[breakpoint].filter(
          (item: Layout) => item.i !== widgetId
        );
      });
      
      return {
        ...prevState,
        layouts: newLayouts,
        widgets: prevState.widgets.filter((id: string) => id !== widgetId)
      };
    });
  };
  
  // Reset the dashboard to default
  const resetDashboard = () => {
    localStorage.removeItem("dashboardState");
    window.location.reload();
  };
  
  // Widget selector component
  const WidgetSelector = () => (
    <Card className="absolute right-0 top-16 z-50 w-64 shadow-lg border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Add Widgets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {AVAILABLE_WIDGETS.map(widget => (
          <Button
            key={widget.id}
            variant={dashboardState.widgets.includes(widget.id) ? "secondary" : "outline"}
            className="w-full justify-start text-left mb-2"
            onClick={() => addWidget(widget.id as string)}
            disabled={dashboardState.widgets.includes(widget.id)}
          >
            {widget.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode 
              ? "Edit mode: Drag widgets to rearrange, resize, or remove them" 
              : "Customizable dashboard with drag and drop widgets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {isEditMode ? "Done Editing" : "Edit Dashboard"}
          </Button>
          
          {isEditMode && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsWidgetSelectorOpen(!isWidgetSelectorOpen)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (window.confirm("Reset dashboard to default layout?")) {
                    resetDashboard();
                  }
                }}
              >
                Reset
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Widget Selector (visible when in edit mode and button clicked) */}
      <div className="relative">
        {isWidgetSelectorOpen && <WidgetSelector />}
      </div>
      
      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={dashboardState.layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={100}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
      >
        {dashboardState.widgets.map(widgetId => {
          const widget = findWidgetById(widgetId);
          if (!widget) return null;
          
          const Component = widget.component;
          
          return (
            <div key={widgetId} className="rounded-lg shadow-sm border relative">
              {isEditMode && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full"
                  onClick={() => removeWidget(widgetId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="w-full h-full overflow-auto p-2">
                <Component />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}