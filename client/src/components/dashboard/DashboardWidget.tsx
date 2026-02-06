import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinusIcon, MaximizeIcon, XIcon } from "lucide-react";

interface DashboardWidgetProps {
  title: string;
  id: string;
  onRemove?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
  dragHandleProps?: any; // For draggable functionality
}

export default function DashboardWidget({
  title,
  id,
  onRemove,
  children,
  className = "",
  defaultCollapsed = false,
  dragHandleProps,
}: DashboardWidgetProps) {
  // State for expansion/collapse
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Use effect to log state changes - helps with debugging
  useEffect(() => {
    console.log(`Widget ${id} collapsed state: ${isCollapsed}`);
  }, [isCollapsed, id]);
  
  return (
    <Card className={`border shadow-sm transition-all ${className}`}>
      <CardHeader 
        {...dragHandleProps} 
        className="p-3 flex flex-row items-center justify-between bg-gray-50 border-b cursor-move"
      >
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 z-50"
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag from starting
              setIsCollapsed(!isCollapsed);
            }}
          >
            <span className="sr-only">
              {isCollapsed ? "Expand" : "Collapse"}
            </span>
            {isCollapsed ? (
              <MaximizeIcon className="h-3.5 w-3.5" />
            ) : (
              <MinusIcon className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-600 z-50"
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag from starting
                onRemove(id);
              }}
            >
              <span className="sr-only">Remove</span>
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="p-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}