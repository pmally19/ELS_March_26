import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DashboardWidget from './DashboardWidget';
import ChartSection from './ChartSection';
import InventoryActivity from './InventoryActivity';
import TopSellingProducts from './TopSellingProducts';
import ActivityFeed from './ActivityFeed';
import ProductionSummaryWidget from './ProductionSummaryWidget';
import OrdersComparisonWidget from './OrdersComparisonWidget';
import OrdersKeyMetricsWidget from './OrdersKeyMetricsWidget';
import { Widget } from './DynamicWidgetGrid';

// Widget types with their corresponding components
const WIDGET_COMPONENTS: Record<string, React.FC<any>> = {
  // Default widgets
  "sales-overview": ChartSection,
  "inventory-status": InventoryActivity,
  "top-products": TopSellingProducts,
  "recent-activity": ActivityFeed,
  
  // Specialized production and order widgets
  "production-summary": ProductionSummaryWidget,
  "orders-comparison": OrdersComparisonWidget,
  "orders-key-metrics": OrdersKeyMetricsWidget,
};

// Custom resize handle with improved styling
function CustomResizeHandle({ className = '', ...props }: any) {
  return (
    <PanelResizeHandle
      className={`w-2 hover:bg-blue-100 active:bg-blue-200 transition duration-100 rounded-md mx-1 my-1 group ${className}`}
      {...props}
    >
      <div className="w-1 h-8 bg-gray-300 rounded-full mx-auto my-2 group-hover:bg-blue-400 group-active:bg-blue-500 transition duration-100"></div>
    </PanelResizeHandle>
  );
}

interface ResizableDashboardProps {
  widgets: Widget[];
  onRemoveWidget?: (id: string) => void;
  onWidgetResize?: (id: string, size: number) => void;
  onWidgetsReorder?: (widgets: Widget[]) => void;
  onToggleCollapse?: (id: string, collapsed: boolean) => void;
}

export default function ResizableDashboard({
  widgets,
  onRemoveWidget,
  onWidgetResize,
  onWidgetsReorder,
  onToggleCollapse,
}: ResizableDashboardProps) {
  // Store panel sizes and widget order
  const [panelSizes, setPanelSizes] = useState<Record<string, number>>({});
  const [widgetItems, setWidgetItems] = useState<Widget[]>(widgets);
  
  // Update local state when widgets prop changes
  React.useEffect(() => {
    setWidgetItems(widgets);
  }, [widgets]);
  
  // Handle drag end event
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
    
    // Call callback if provided
    if (onWidgetsReorder) {
      onWidgetsReorder(updatedItems);
    }
  };

  // Layout widgets in rows or groups
  const layoutWidgets = () => {
    if (widgetItems.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No widgets added to dashboard</p>
        </div>
      );
    }

    // Filter out collapsed widgets from the main layout
    const expandedWidgets = widgetItems.filter(widget => !widget.collapsed);
    const collapsedWidgets = widgetItems.filter(widget => widget.collapsed);

    // Create a draggable context for the widgets
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets" type="WIDGET_LIST">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {/* Collapsed widgets section - compact horizontal bar */}
              {collapsedWidgets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-lg border">
                  <span className="text-sm text-gray-600 mr-2">Minimized:</span>
                  {collapsedWidgets.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => onToggleCollapse && onToggleCollapse(widget.id, false)}
                      className="px-3 py-1 text-xs bg-white border rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {widget.title}
                    </button>
                  ))}
                </div>
              )}

              {/* First row - horizontal layout with expanded widgets only */}
              {expandedWidgets.length > 0 && (
                <PanelGroup direction="horizontal" className="mb-4">
                  {expandedWidgets.slice(0, 3).map((widget, index, arr) => (
                  <Draggable 
                    key={widget.id} 
                    draggableId={widget.id} 
                    index={index}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                      >
                        <div className="flex" style={{ position: 'relative' }}>
                          <Panel 
                            id={widget.id}
                            defaultSize={panelSizes[widget.id] || 100 / arr.length}
                            onResize={(size) => {
                              setPanelSizes({...panelSizes, [widget.id]: size});
                              if (onWidgetResize) onWidgetResize(widget.id, size);
                            }}
                          >
                            <DashboardWidget
                              id={widget.id}
                              title={widget.title}
                              defaultCollapsed={widget.collapsed}
                              onRemove={onRemoveWidget}
                              dragHandleProps={dragProvided.dragHandleProps}
                            >
                              {renderWidgetContent(widget)}
                            </DashboardWidget>
                          </Panel>
                          {index < arr.length - 1 && <CustomResizeHandle />}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
              </PanelGroup>
              )}

              {/* Second row - horizontal layout with expanded widgets only */}
              {expandedWidgets.length > 3 && (
                <PanelGroup direction="horizontal" className="mb-4">
                  {expandedWidgets.slice(3, 6).map((widget, index, arr) => (
                    <Draggable 
                      key={widget.id} 
                      draggableId={widget.id} 
                      index={index + 3}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                        >
                          <div className="flex" style={{ position: 'relative' }}>
                            <Panel 
                              id={widget.id}
                              defaultSize={panelSizes[widget.id] || 100 / arr.length}
                              onResize={(size) => {
                                setPanelSizes({...panelSizes, [widget.id]: size});
                                if (onWidgetResize) onWidgetResize(widget.id, size);
                              }}
                            >
                              <DashboardWidget
                                id={widget.id}
                                title={widget.title}
                                defaultCollapsed={widget.collapsed}
                                onRemove={onRemoveWidget}
                                dragHandleProps={dragProvided.dragHandleProps}
                              >
                                {renderWidgetContent(widget)}
                              </DashboardWidget>
                            </Panel>
                            {index < arr.length - 1 && <CustomResizeHandle />}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </PanelGroup>
              )}

              {/* Additional widgets in a vertical layout */}
              {widgetItems.length > 6 && (
                <PanelGroup direction="vertical" className="mb-4">
                  {widgetItems.slice(6).map((widget, index, arr) => (
                    <Draggable 
                      key={widget.id} 
                      draggableId={widget.id} 
                      index={index + 6}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                        >
                          <div className="flex" style={{ position: 'relative' }}>
                            <Panel 
                              id={widget.id}
                              defaultSize={panelSizes[widget.id] || 100 / arr.length}
                              onResize={(size) => {
                                setPanelSizes({...panelSizes, [widget.id]: size});
                                if (onWidgetResize) onWidgetResize(widget.id, size);
                              }}
                            >
                              <DashboardWidget
                                id={widget.id}
                                title={widget.title}
                                defaultCollapsed={widget.collapsed}
                                onRemove={onRemoveWidget}
                                dragHandleProps={dragProvided.dragHandleProps}
                              >
                                {renderWidgetContent(widget)}
                              </DashboardWidget>
                            </Panel>
                            {index < arr.length - 1 && <CustomResizeHandle />}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </PanelGroup>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  // Render widget content based on type
  const renderWidgetContent = (widget: Widget) => {
    const WidgetComponent = WIDGET_COMPONENTS[widget.type];
    
    if (WidgetComponent) {
      return <WidgetComponent dataSource={widget.dataSource || 'sales'} />;
    } else {
      return (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          Widget type '{widget.type}' not implemented
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      {layoutWidgets()}
    </div>
  );
}