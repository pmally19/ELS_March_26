import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Package, Truck, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface EnhancedDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: any;
  scheduleLines: any[];
  onCreateDelivery: (deliveryData: any) => void;
  isCreating?: boolean;
}

const EnhancedDeliveryDialog: React.FC<EnhancedDeliveryDialogProps> = ({
  open,
  onOpenChange,
  salesOrder,
  scheduleLines,
  onCreateDelivery,
  isCreating = false
}) => {
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [deliveryType, setDeliveryType] = useState('LF');
  const [priority, setPriority] = useState('02');
  const [shippingCondition, setShippingCondition] = useState('01');
  const [route, setRoute] = useState('');
  const [movementType, setMovementType] = useState('601');

  // Fetch master data
  const { data: priorities } = useQuery({
    queryKey: ['/api/order-to-cash/delivery-priorities'],
    queryFn: async () => {
      const res = await apiRequest('/api/order-to-cash/delivery-priorities');
      const data = await res.json();
      return data.success ? data.data : [];
    }
  });

  const { data: shippingConditions } = useQuery({
    queryKey: ['/api/order-to-cash/shipping-conditions'],
    queryFn: async () => {
      const res = await apiRequest('/api/order-to-cash/shipping-conditions');
      const data = await res.json();
      return data.success ? data.data : [];
    }
  });

  const { data: routes } = useQuery({
    queryKey: ['/api/order-to-cash/routes'],
    queryFn: async () => {
      const res = await apiRequest('/api/order-to-cash/routes');
      const data = await res.json();
      return data.success ? data.data : [];
    }
  });

  const { data: movementTypes } = useQuery({
    queryKey: ['/api/order-to-cash/movement-types'],
    queryFn: async () => {
      const res = await apiRequest('/api/order-to-cash/movement-types');
      const data = await res.json();
      return data.success ? data.data : [];
    }
  });

  // Select all eligible schedule lines by default ONLY when dialog first opens
  // Reset when dialog closes so it re-initializes with updated schedule lines on next open
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // When dialog opens, auto-select all eligible (undelivered) schedule lines
    // This ensures split deliveries remain selectable after one split is delivered
    if (open && scheduleLines && scheduleLines.length > 0) {
      if (!hasInitialized) {
        const eligibleLines = scheduleLines
          .filter(line => {
            const remaining = (line.confirmed_quantity || 0) - (line.delivered_quantity || 0);
            return remaining > 0;
          })
          .map(line => line.id);
        setSelectedLines(eligibleLines);
        setHasInitialized(true);
        console.log('📋 Dialog opened - Auto-selected eligible lines:', eligibleLines, 'out of', scheduleLines.length, 'total lines');
      }
    }
    
    // Reset when dialog closes so next open will re-initialize with updated data
    if (!open) {
      setSelectedLines([]);
      setHasInitialized(false);
      console.log('📋 Dialog closed - Reset selection state');
    }
  }, [open, scheduleLines, hasInitialized]);

  const toggleLineSelection = (lineId: number) => {
    setSelectedLines(prev => 
      prev.includes(lineId) 
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  };

  const handleCreate = () => {
    if (selectedLines.length === 0) {
      return;
    }
    
    console.log('📦 Creating delivery with selected schedule lines:', selectedLines);
    onCreateDelivery({
      salesOrderId: salesOrder.id,
      selectedScheduleLines: selectedLines,
      deliveryType,
      priority,
      shippingCondition,
      route,
      movementType
    });
  };

  const selectedLinesData = scheduleLines.filter(line => selectedLines.includes(line.id));
  const totalQuantity = selectedLinesData.reduce((sum, line) => {
    const confirmedQty = parseFloat(line.confirmed_quantity || 0);
    const deliveredQty = parseFloat(line.delivered_quantity || 0);
    return sum + (confirmedQty - deliveredQty);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Delivery - {salesOrder?.order_number}
          </DialogTitle>
          <DialogDescription>
            Customer: {salesOrder?.customer_name} | Total: ${salesOrder?.total_amount}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Lines Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Schedule Lines to Deliver ({selectedLines.length} of {scheduleLines.length})
            </Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {scheduleLines.map((line) => {
                // CRITICAL: Handle NULL/undefined values for delivered_quantity
                const confirmedQty = parseFloat(line.confirmed_quantity || 0);
                const deliveredQty = parseFloat(line.delivered_quantity || 0);
                const remaining = confirmedQty - deliveredQty;
                const isEligible = remaining > 0;
                
                return (
                  <div 
                    key={line.id} 
                    className={`p-3 border-b last:border-b-0 flex items-start gap-3 ${
                      !isEligible ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedLines.includes(line.id)}
                      onCheckedChange={() => toggleLineSelection(line.id)}
                      disabled={!isEligible}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Line {line.line_number}: {line.product_name}</span>
                          <span className="text-sm text-gray-500 ml-2">({line.product_code})</span>
                        </div>
                        <Badge variant={isEligible ? 'default' : 'secondary'}>
                          {line.confirmation_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {/* Quantity Information */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>Confirmed: <strong>{confirmedQty}</strong> {line.unit}</span>
                          <span>Delivered: <strong>{deliveredQty}</strong> {line.unit}</span>
                          <span className="font-semibold text-blue-600">
                            Remaining: <strong>{remaining.toFixed(3)}</strong> {line.unit}
                          </span>
                          <span className="text-gray-500">
                            Date: {format(new Date(line.requested_delivery_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {/* Additional Details - Plant and Storage Location */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 pt-1 border-t border-gray-100">
                          {line.plant_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Plant: <strong className="text-gray-700">{line.plant_name}</strong>
                              {line.plant_code && <span>({line.plant_code})</span>}
                            </span>
                          )}
                          {(line.storage_location_code || line.storage_location_code_from_table) && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Storage: <strong className="text-gray-700">
                                {line.storage_location_name || line.storage_location_code_from_table || line.storage_location_code}
                              </strong>
                              {(line.storage_location_code_from_table || line.storage_location_code) && 
                                !line.storage_location_name && 
                                <span>({line.storage_location_code_from_table || line.storage_location_code})</span>
                              }
                            </span>
                          )}
                          {line.availability_status && (
                            <span>
                              Availability: <strong className="text-gray-700">{line.availability_status}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Configuration */}
          <div className="border-t pt-6">
            <Label className="text-base font-semibold mb-3 block">Delivery Configuration</Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Delivery Type */}
              <div>
                <Label>Delivery Type</Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LF">LF - Standard Delivery</SelectItem>
                    <SelectItem value="LX">LX - Express Delivery</SelectItem>
                    <SelectItem value="LR">LR - Returns Delivery</SelectItem>
                    <SelectItem value="LFG">LFG - Free Goods</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities?.map((p: any) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.code === '01' && '🔴'} 
                        {p.code === '02' && '🟢'} 
                        {p.code === '03' && '🔵'} 
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Condition */}
              <div>
                <Label>Shipping Condition</Label>
                <Select value={shippingCondition} onValueChange={setShippingCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingConditions?.map((sc: any) => (
                      <SelectItem key={sc.code} value={sc.code}>
                        {sc.code} - {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Route */}
              <div>
                <Label>Route</Label>
                <Select value={route || 'AUTO'} onValueChange={(val) => setRoute(val === 'AUTO' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto-determine</SelectItem>
                    {routes?.map((r: any) => (
                      <SelectItem key={r.code} value={r.code}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3" />
                          {r.code} - {r.name} ({r.transit_days || 1} days)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Movement Type */}
              <div className="col-span-2">
                <Label>Movement Type</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select movement type" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementTypes?.map((mt: any) => (
                      <SelectItem key={mt.code} value={mt.code}>
                        <div className="flex flex-col py-1">
                          <div className="font-medium">{mt.code} - {mt.name}</div>
                          <div className="text-xs text-gray-500">
                            {mt.movement_category} | {mt.inventory_effect}
                            {mt.description && ` | ${mt.description.substring(0, 50)}`}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {movementTypes?.find((mt: any) => mt.code === movementType)?.description || 'Standard goods issue from sales order delivery'}
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Delivery Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Lines to deliver: <span className="font-semibold">{selectedLines.length}</span></div>
              <div>Total quantity: <span className="font-semibold">{totalQuantity} units</span></div>
              <div>Priority: <span className="font-semibold">
                {priorities?.find((p: any) => p.code === priority)?.name || priority}
              </span></div>
              <div>Shipping: <span className="font-semibold">
                {shippingConditions?.find((sc: any) => sc.code === shippingCondition)?.name || shippingCondition}
              </span></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={selectedLines.length === 0 || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Delivery ({selectedLines.length} lines)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedDeliveryDialog;

