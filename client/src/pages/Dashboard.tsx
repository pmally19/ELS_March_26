import { useState, useEffect } from "react";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import ChartSection from "@/components/dashboard/ChartSection";
import InventoryActivity from "@/components/dashboard/InventoryActivity";
import TopSellingProducts from "@/components/dashboard/TopSellingProducts";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AddWidgetDialog from "@/components/dashboard/AddWidgetDialog";
import DynamicWidgetGrid, { Widget } from "@/components/dashboard/DynamicWidgetGrid";
import ResizableDashboard from "@/components/dashboard/ResizableDashboard";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCcw, LayoutGrid } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Default widgets that always appear
const DEFAULT_WIDGETS: Widget[] = [
  {
    id: "default-sales-overview",
    type: "sales-overview",
    title: "Sales Overview",
    width: 2,
  },
  {
    id: "default-inventory-status",
    type: "inventory-status",
    title: "Inventory Status",
    width: 1,
  },
  {
    id: "default-top-products",
    type: "top-products",
    title: "Top Selling Products",
    width: 1,
  },
  {
    id: "default-recent-activity",
    type: "recent-activity",
    title: "Recent Activity",
    width: 1,
  }
];

export default function Dashboard() {
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<Widget[]>([]);
  const [defaultWidgetsState, setDefaultWidgetsState] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for saved dashboard configuration
  const { data: dashboardConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/dashboard/config'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard/config');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard configuration');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching dashboard config:', error);
        // Fall back to localStorage
        const savedWidgets = localStorage.getItem('dashboard_widgets');
        if (savedWidgets) {
          return JSON.parse(savedWidgets);
        }
        return { widgets: [] };
      }
    },
    staleTime: 300000, // 5 minutes
  });

  // Load saved widgets from config
  useEffect(() => {
    if (dashboardConfig?.widgets) {
      // Filter out any dashboard widgets that are duplicates of default widgets
      // We'll consider widgets with the same type as duplicates
      const defaultWidgetTypes = defaultWidgetsState.map(widget => widget.type);

      // Only keep widgets from config that aren't default widgets
      const filteredCustomWidgets = dashboardConfig.widgets.filter((widget) => {
        // Ensure widget is treated as Widget type
        const widgetItem = widget as Widget;

        // If widget id starts with 'default-', it's already in defaultWidgetsState
        if (widgetItem.id.startsWith('default-')) return false;

        // Check if this is a custom widget with the same type as a default widget
        // If so, don't include it to avoid duplicates
        return !defaultWidgetTypes.includes(widgetItem.type);
      });

      setCustomWidgets(filteredCustomWidgets);
    }

    // Load default widget states (collapsed state)
    const savedDefaultState = localStorage.getItem('default_widgets_state');
    if (savedDefaultState) {
      try {
        const parsedState = JSON.parse(savedDefaultState);
        setDefaultWidgetsState(prev =>
          prev.map(widget => ({
            ...widget,
            collapsed: parsedState[widget.id]?.collapsed || false
          }))
        );
      } catch (error) {
        console.error('Error parsing default widget states:', error);
      }
    }
  }, [dashboardConfig]);

  // Handle adding a new widget
  const handleAddWidget = (widgetType: string, widgetConfig: any) => {
    // Check if this widget type already exists in either default or custom widgets
    const allWidgets = [...defaultWidgetsState, ...customWidgets];
    const existingWidget = allWidgets.find(widget => widget.type === widgetType);

    if (existingWidget) {
      toast({
        title: "Widget already exists",
        description: `This report type is already on your dashboard. Each report can only appear once.`,
        variant: "destructive",
      });
      return;
    }

    const newWidget: Widget = {
      id: `custom-widget-${Date.now()}`,
      type: widgetType,
      title: widgetConfig.title || 'New Widget',
      width: getDefaultWidthForType(widgetType),
      position: customWidgets.length + 1,
    };

    const updatedWidgets = [...customWidgets, newWidget];
    setCustomWidgets(updatedWidgets);

    // Save to localStorage for persistence
    localStorage.setItem('dashboard_widgets', JSON.stringify({
      widgets: updatedWidgets
    }));

    // Save to server (if available)
    saveDashboardConfig(updatedWidgets);

    toast({
      title: "Widget added",
      description: `${newWidget.title} has been added to your dashboard.`,
    });
  };

  // Handle removing a widget
  const handleRemoveWidget = (widgetId: string) => {
    // Only allow removing custom widgets
    if (widgetId.startsWith('default-')) {
      toast({
        title: "Cannot remove default widget",
        description: "Default widgets cannot be removed, but can be minimized.",
        variant: "destructive",
      });
      return;
    }

    const updatedWidgets = customWidgets.filter(widget => widget.id !== widgetId);
    setCustomWidgets(updatedWidgets);

    // Save to localStorage
    localStorage.setItem('dashboard_widgets', JSON.stringify({
      widgets: updatedWidgets
    }));

    // Save to server (if available)
    saveDashboardConfig(updatedWidgets);

    toast({
      title: "Widget removed",
      description: "The widget has been removed from your dashboard.",
    });
  };

  // Handle toggling collapse state
  const handleToggleCollapse = (widgetId: string, isCollapsed: boolean) => {
    // Handle default widgets
    if (widgetId.startsWith('default-')) {
      setDefaultWidgetsState(prev =>
        prev.map(widget =>
          widget.id === widgetId
            ? { ...widget, collapsed: isCollapsed }
            : widget
        )
      );

      // Save default widget states
      const currentState = defaultWidgetsState.reduce((acc, widget) => ({
        ...acc,
        [widget.id]: { collapsed: widget.id === widgetId ? isCollapsed : widget.collapsed }
      }), {});

      localStorage.setItem('default_widgets_state', JSON.stringify(currentState));
    }
    // Handle custom widgets
    else {
      setCustomWidgets(prev =>
        prev.map(widget =>
          widget.id === widgetId
            ? { ...widget, collapsed: isCollapsed }
            : widget
        )
      );

      // Save to localStorage
      localStorage.setItem('dashboard_widgets', JSON.stringify({
        widgets: customWidgets.map(widget =>
          widget.id === widgetId
            ? { ...widget, collapsed: isCollapsed }
            : widget
        )
      }));

      // Save to server (if available)
      saveDashboardConfig(customWidgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, collapsed: isCollapsed }
          : widget
      ));
    }
  };

  // Set default column width based on widget type
  const getDefaultWidthForType = (widgetType: string) => {
    switch (widgetType) {
      case 'sales-overview':
      case 'line-chart':
      case 'bar-chart':
        return 2; // Takes 2 columns
      case 'inventory-status':
      case 'pie-chart':
      case 'kpi':
        return 1; // Takes 1 column
      case 'top-products':
      case 'recent-activity':
      case 'table':
        return 1; // Takes 1 column
      default:
        return 1;
    }
  };

  // Save dashboard configuration to server
  const saveDashboardConfig = async (widgets: Widget[]) => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets }),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboard configuration');
      }
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      // If server save fails, we still have localStorage as fallback
    }
  };

  // Handle dashboard refresh
  const handleRefreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all dashboard-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/sales-chart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/revenue-by-category'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/materials/top-selling'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });

      // Add a slight delay for better UX
      setTimeout(() => {
        setIsRefreshing(false);
        toast({
          title: "Dashboard refreshed",
          description: "All widgets have been updated with the latest data.",
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      setIsRefreshing(false);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      toast({
        title: "Edit mode disabled",
        description: "Your dashboard layout has been saved.",
      });
    } else {
      toast({
        title: "Edit mode enabled",
        description: "You can now add, remove, and rearrange widgets.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your business overview and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isEditMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleEditMode}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            {isEditMode ? "Save Layout" : "Customize"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshDashboard}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddWidgetOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Default Widgets Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Main Metrics</h2>
        {isLoadingConfig ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <ResizableDashboard
            widgets={defaultWidgetsState}
            onRemoveWidget={isEditMode ? handleRemoveWidget : undefined}
            onToggleCollapse={handleToggleCollapse}
            onWidgetsReorder={(updatedItems) => {
              setDefaultWidgetsState(updatedItems);
              saveDashboardConfig(updatedItems);
            }}
          />
        )}
      </div>

      {/* Custom Widgets Section */}
      {(customWidgets.length > 0 || isEditMode) && (
        <div className="space-y-6 mt-10">
          <h2 className="text-xl font-semibold">Custom Widgets</h2>
          {customWidgets.length > 0 ? (
            <ResizableDashboard
              widgets={customWidgets}
              onRemoveWidget={isEditMode ? handleRemoveWidget : undefined}
              onWidgetsReorder={(updatedItems) => {
                setCustomWidgets(updatedItems);
                saveDashboardConfig(updatedItems);
              }}
            />
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-2">No custom widgets yet</h3>
              <p className="text-muted-foreground mb-4">
                Add widgets to customize your dashboard experience
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddWidgetOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Widget
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Widget Dialog */}
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}
