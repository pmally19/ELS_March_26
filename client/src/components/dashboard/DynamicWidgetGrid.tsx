import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DashboardWidget from "./DashboardWidget";
import ChartSection from "./ChartSection";
import InventoryActivity from "./InventoryActivity";
import TopSellingProducts from "./TopSellingProducts";
import ActivityFeed from "./ActivityFeed";
import GenericWidgetContent from "./GenericWidgetContent";
import ProductionSummaryWidget from "./ProductionSummaryWidget";
import OrdersComparisonWidget from "./OrdersComparisonWidget";
import OrdersKeyMetricsWidget from "./OrdersKeyMetricsWidget";

// Widget types with their corresponding components
const WIDGET_COMPONENTS: Record<string, React.FC<any>> = {
  // Default widgets
  "sales-overview": ChartSection,
  "inventory-status": InventoryActivity,
  "top-products": TopSellingProducts,
  "recent-activity": ActivityFeed,
  
  // Generic chart types
  "line-chart": ({ dataSource }: { dataSource: string }) => <GenericWidgetContent type="line-chart" dataSource={dataSource} />,
  "bar-chart": ({ dataSource }: { dataSource: string }) => <GenericWidgetContent type="bar-chart" dataSource={dataSource} />,
  "pie-chart": ({ dataSource }: { dataSource: string }) => <GenericWidgetContent type="pie-chart" dataSource={dataSource} />,
  "kpi": ({ dataSource }: { dataSource: string }) => <GenericWidgetContent type="kpi" dataSource={dataSource} />,
  "table": ({ dataSource }: { dataSource: string }) => <GenericWidgetContent type="table" dataSource={dataSource} />,
  
  // Specialized production and order widgets
  "production-summary": ProductionSummaryWidget,
  "orders-comparison": OrdersComparisonWidget,
  "orders-key-metrics": OrdersKeyMetricsWidget,
};

// Define widget interface
export interface Widget {
  id: string;
  type: string;
  title: string;
  collapsed?: boolean;
  width?: number; // 1-3: small, medium, large
  height?: 'small' | 'medium' | 'large';
  position?: number;
  dataSource?: string;
}

interface DynamicWidgetGridProps {
  widgets: Widget[];
  onRemoveWidget?: (id: string) => void;
  onToggleCollapse?: (id: string, collapsed: boolean) => void;
  isLoading?: boolean;
}

export default function DynamicWidgetGrid({
  widgets,
  onRemoveWidget,
  onToggleCollapse,
  isLoading = false,
}: DynamicWidgetGridProps) {
  const [widgetItems, setWidgetItems] = useState(widgets);
  
  // Get widget data from backend
  const { data: availableWidgetTypes } = useQuery({
    queryKey: ['/api/dashboard/widget-types'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard/widget-types');
        if (!response.ok) {
          throw new Error('Failed to fetch widget types');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching widget types:', error);
        return [];
      }
    },
  });

  // Get widget display properties
  const getWidgetProps = (widgetType: string) => {
    if (!availableWidgetTypes) return { minWidth: 1, defaultHeight: 'medium' };
    
    const widgetTypeInfo = availableWidgetTypes.find((w: any) => w.id === widgetType);
    return widgetTypeInfo || { minWidth: 1, defaultHeight: 'medium' };
  };

  // Get column span based on widget width
  const getColSpan = (widget: Widget) => {
    const width = widget.width || getWidgetProps(widget.type).minWidth || 1;
    return `md:col-span-${Math.min(Math.max(width, 1), 3)}`;
  };

  // Handle widget removal
  const handleRemoveWidget = (id: string) => {
    if (onRemoveWidget) {
      onRemoveWidget(id);
    }
  };

  // Handle end of drag operation
  const handleDragEnd = (result: any) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = Array.from(widgetItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setWidgetItems(updatedItems);
    
    // Call API to save new positions
    saveDashboardConfig(updatedItems);
  };

  // Save dashboard config
  const saveDashboardConfig = async (items: Widget[]) => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets: items }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save dashboard configuration');
      }
    } catch (error) {
      console.error('Error saving dashboard configuration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  // Sort widgets by position if available
  const sortedWidgets = [...widgetItems].sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    return 0;
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-widgets" direction="vertical">
        {(provided) => (
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {sortedWidgets.map((widget, index) => {
              const WidgetComponent = WIDGET_COMPONENTS[widget.type];
              
              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${getColSpan(widget)}`}
                    >
                      <div {...provided.dragHandleProps} className="cursor-move">
                        <DashboardWidget
                          id={widget.id}
                          title={widget.title}
                          defaultCollapsed={widget.collapsed}
                          onRemove={handleRemoveWidget}
                        >
                          {WidgetComponent ? (
                            <WidgetComponent dataSource={widget.dataSource || 'sales'} />
                          ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground">
                              Widget type '{widget.type}' not implemented
                            </div>
                          )}
                        </DashboardWidget>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}