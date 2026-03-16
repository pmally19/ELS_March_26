import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Calendar, SplitSquareHorizontal } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleLine {
  id: number;
  line_number: number;
  product_name: string;
  product_code: string;
  schedule_quantity: number;
  confirmed_quantity: number;
  delivered_quantity: number;
  unit: string;
  requested_delivery_date: string;
  confirmed_delivery_date: string;
  confirmation_status: string;
  availability_status: string;
  plant_name?: string;
}

interface ScheduleLinesTableProps {
  scheduleLines: ScheduleLine[];
  onSplitLine?: (scheduleLineId: number) => void;
  showActions?: boolean;
}

const ScheduleLinesTable: React.FC<ScheduleLinesTableProps> = ({ 
  scheduleLines, 
  onSplitLine,
  showActions = true 
}) => {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string; className?: string }> = {
      'CONFIRMED': { variant: 'default', label: 'Confirmed' },
      'DELIVERED': { variant: 'default', label: 'Delivered', className: 'bg-green-600 text-white' },
      'PARTIALLY_DELIVERED': { variant: 'default', label: 'Partial', className: 'bg-yellow-600 text-white' },
      'PENDING': { variant: 'secondary', label: 'Pending' },
    };
    
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getAvailabilityBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string; className?: string }> = {
      'AVAILABLE': { variant: 'default', label: '✓ Available', className: 'bg-green-600 text-white' },
      'NOT_AVAILABLE': { variant: 'destructive', label: '✗ Not Available' },
      'PARTIAL': { variant: 'default', label: '⚠ Partial', className: 'bg-yellow-600 text-white' },
      'UNCHECKED': { variant: 'secondary', label: 'Unchecked' },
    };
    
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className={`text-xs ${config.className || ''}`}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  if (scheduleLines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No schedule lines found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 min-w-[48px] whitespace-nowrap">Line</TableHead>
              <TableHead className="min-w-[200px]">Product</TableHead>
              <TableHead className="text-right min-w-[100px] whitespace-nowrap">Scheduled</TableHead>
              <TableHead className="text-right min-w-[100px] whitespace-nowrap">Confirmed</TableHead>
              <TableHead className="text-right min-w-[100px] whitespace-nowrap">Delivered</TableHead>
              <TableHead className="text-right min-w-[100px] whitespace-nowrap">Remaining</TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">Delivery Date</TableHead>
              <TableHead className="min-w-[100px] whitespace-nowrap">Status</TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">Availability</TableHead>
              {showActions && <TableHead className="text-center min-w-[100px] whitespace-nowrap">Actions</TableHead>}
            </TableRow>
          </TableHeader>
        <TableBody>
          {scheduleLines.map((line) => {
            const confirmedQty = parseFloat(String(line.confirmed_quantity || line.schedule_quantity || 0));
            const deliveredQty = parseFloat(String(line.delivered_quantity || 0));
            const remaining = confirmedQty - deliveredQty;
            return (
              <TableRow key={line.id}>
                <TableCell className="font-medium">{line.line_number}</TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <div className="font-medium truncate" title={line.product_name || 'N/A'}>
                      {(() => {
                        if (!line.product_name) return 'N/A';
                        let productName = String(line.product_name).trim();
                        // Remove any long alphanumeric strings that look like IDs (more than 10 chars, all lowercase/numbers)
                        // This handles cases like "ajlkrafvojssss" which are random IDs
                        productName = productName.replace(/\b[a-z0-9]{10,}\b/gi, (match) => {
                          // Only remove if it's all lowercase (no uppercase letters) and looks like a random ID
                          if (match === match.toLowerCase() && /^[a-z0-9]+$/.test(match)) {
                            return '';
                          }
                          return match;
                        });
                        // Clean up multiple spaces and trim
                        productName = productName.replace(/\s+/g, ' ').trim();
                        // Take first 5 words if still too long
                        const words = productName.split(/\s+/).filter(w => w.length > 0);
                        const cleanedName = words.slice(0, 5).join(' ');
                        return cleanedName || 'N/A';
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={line.product_code || 'N/A'}>
                      {line.product_code ? String(line.product_code).trim() : 'N/A'}
                    </div>
                    {line.plant_name && (
                      <div className="text-xs text-blue-600 truncate" title={String(line.plant_name).trim()}>
                        {String(line.plant_name).trim()}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {parseFloat(String(line.schedule_quantity || 0)).toFixed(3)} {line.unit || 'EA'}
                </TableCell>
                <TableCell className="text-right">
                  {parseFloat(String(line.confirmed_quantity || 0)).toFixed(3)} {line.unit || 'EA'}
                </TableCell>
                <TableCell className="text-right">
                  {parseFloat(String(line.delivered_quantity || 0)).toFixed(3)} {line.unit || 'EA'}
                </TableCell>
                <TableCell className="text-right">
                  <span className={remaining > 0 ? 'font-semibold text-blue-600' : 'text-gray-400'}>
                    {remaining.toFixed(3)} {line.unit || 'EA'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span>{formatDate(line.requested_delivery_date)}</span>
                  </div>
                  {line.confirmed_delivery_date !== line.requested_delivery_date && (
                    <div className="text-xs text-orange-600 mt-1">
                      Confirmed: {formatDate(line.confirmed_delivery_date)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(line.confirmation_status)}
                </TableCell>
                <TableCell>
                  {getAvailabilityBadge(line.availability_status)}
                </TableCell>
                {showActions && (
                  <TableCell className="text-center min-w-[100px] whitespace-nowrap">
                    {remaining > 0 && onSplitLine && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSplitLine(line.id)}
                        className="text-xs whitespace-nowrap"
                      >
                        <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                        Split
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      
      {/* Summary */}
      <div className="bg-gray-50 p-3 border-t">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Total Lines: {scheduleLines.length}</span>
          <span className="font-semibold">
            Total Quantity: {scheduleLines.reduce((sum, line) => {
              const qty = parseFloat(String(line.confirmed_quantity || line.schedule_quantity || 0));
              return sum + qty;
            }, 0).toFixed(3)} units
          </span>
          <span className="font-semibold text-blue-600">
            Remaining: {scheduleLines.reduce((sum, line) => {
              const confirmedQty = parseFloat(String(line.confirmed_quantity || line.schedule_quantity || 0));
              const deliveredQty = parseFloat(String(line.delivered_quantity || 0));
              return sum + (confirmedQty - deliveredQty);
            }, 0).toFixed(3)} units
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleLinesTable;

