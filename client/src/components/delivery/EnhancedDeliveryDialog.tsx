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
import { Loader2, Package, Truck, MapPin, ArrowRight, Info } from 'lucide-react';
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



  // ── NEW: Load delivery document types from sd_document_types ──
  const { data: deliveryDocTypes = [] } = useQuery({
    queryKey: ['/api/sales-distribution/document-types', 'DELIVERY'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/document-types?category=DELIVERY');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // ── NEW: Load copy control headers to show auto-determined delivery type ──
  const sourceDocType = salesOrder?.document_type || 'OR';
  const { data: ccHeaders = [] } = useQuery({
    queryKey: ['/api/sales-distribution/copy-control-headers'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/copy-control-headers');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // ── NEW: Load copy control items for item category preview per line ──
  const { data: ccItems = [] } = useQuery({
    queryKey: ['/api/sales-distribution/copy-control-items'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/copy-control-items');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Find the applicable copy control header for this sales order's doc type
  const applicableCCHeader = ccHeaders.find((h: any) => h.source_doc_type === sourceDocType);

  // Build item category map from copy control items
  const ccItemMap: Record<string, string> = {};
  const relevantCCItems = ccItems.filter(
    (it: any) => it.source_doc_type === sourceDocType && it.target_doc_type === (applicableCCHeader?.target_doc_type || 'LF')
  );
  for (const it of relevantCCItems) {
    ccItemMap[it.source_item_category] = it.target_item_category;
  }

  // Auto-set delivery type from copy control when dialog opens and CC header is found
  useEffect(() => {
    if (open && applicableCCHeader?.target_doc_type) {
      setDeliveryType(applicableCCHeader.target_doc_type);
    }
  }, [open, applicableCCHeader]);

  // Select all eligible schedule lines by default ONLY when dialog first opens
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
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
      }
    }
    if (!open) {
      setSelectedLines([]);
      setHasInitialized(false);
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
    if (selectedLines.length === 0) return;
    onCreateDelivery({
      salesOrderId: salesOrder.id,
      selectedScheduleLines: selectedLines,
      deliveryType,
      priority,
      shippingCondition,
      route
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

          {/* ── Copy Control Banner ── */}
          {applicableCCHeader ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
              <Info className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-green-800">
                <strong>Copy Control Active:</strong>{' '}
                <Badge variant="outline" className="font-mono text-blue-700 bg-blue-50 border-blue-200 mx-1">{sourceDocType}</Badge>
                <ArrowRight className="h-3 w-3 inline mx-1 text-gray-400" />
                <Badge variant="outline" className="font-mono text-green-700 bg-green-50 border-green-200 mx-1">{applicableCCHeader.target_doc_type}</Badge>
                {' — '}{relevantCCItems.length} item rule{relevantCCItems.length !== 1 ? 's' : ''} configured
                {relevantCCItems.length > 0 && (
                  <span className="ml-2 text-gray-600">
                    ({relevantCCItems.map((it: any) => `${it.source_item_category}→${it.target_item_category}`).join(', ')})
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-amber-800">
                No copy control rule found for document type <strong>{sourceDocType}</strong>.
                Delivery type must be selected manually.
              </span>
            </div>
          )}

          {/* Schedule Lines Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Schedule Lines to Deliver ({selectedLines.length} of {scheduleLines.length})
            </Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {scheduleLines.map((line) => {
                const confirmedQty = parseFloat(line.confirmed_quantity || 0);
                const deliveredQty = parseFloat(line.delivered_quantity || 0);
                const remaining = confirmedQty - deliveredQty;
                const isEligible = remaining > 0;
                // Determine delivery item category from copy control map
                const srcItemCat = line.item_category || 'TAN';
                const tgtItemCat = ccItemMap[srcItemCat] || (relevantCCItems.length > 0 ? '—' : null);

                return (
                  <div
                    key={line.id}
                    className={`p-3 border-b last:border-b-0 flex items-start gap-3 ${!isEligible ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'
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
                        <div className="flex items-center gap-2">
                          {/* ── Item Category Flow Badge ── */}
                          {tgtItemCat && (
                            <div className="flex items-center gap-1 text-xs">
                              <Badge variant="secondary" className="font-mono text-xs py-0">{srcItemCat}</Badge>
                              <ArrowRight className="h-3 w-3 text-gray-400" />
                              <Badge variant="outline" className="font-mono text-xs py-0 text-green-700 bg-green-50 border-green-200">{tgtItemCat}</Badge>
                            </div>
                          )}
                          <Badge variant={isEligible ? 'default' : 'secondary'}>
                            {line.confirmation_status}
                          </Badge>
                        </div>
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
                        {/* Plant and Storage Location */}
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
              {/* Delivery Type — loaded from sd_document_types / copy control */}
              <div>
                <Label className="flex items-center gap-1">
                  Delivery Type
                  {applicableCCHeader && (
                    <span className="text-xs text-green-600 font-normal ml-1">(from copy control)</span>
                  )}
                </Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryDocTypes.length > 0 ? (
                      deliveryDocTypes.map((dt: any) => (
                        <SelectItem key={dt.code} value={dt.code}>
                          {dt.code} — {dt.name}
                          {dt.code === applicableCCHeader?.target_doc_type && ' ✓ (copy control)'}
                        </SelectItem>
                      ))
                    ) : (
                      // Fallback if API doesn't return data yet
                      <>
                        <SelectItem value="LF">LF — Standard Delivery</SelectItem>
                        <SelectItem value="EL">EL — Express Delivery</SelectItem>
                        <SelectItem value="LR">LR — Returns Delivery</SelectItem>
                      </>
                    )}
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


            </div>
          </div>

          {/* Delivery Preview */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Delivery Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Lines to deliver: <span className="font-semibold">{selectedLines.length}</span></div>
              <div>Total quantity: <span className="font-semibold">{totalQuantity} units</span></div>
              <div>Delivery type: <span className="font-semibold">{deliveryType}</span></div>
              <div>Priority: <span className="font-semibold">
                {priorities?.find((p: any) => p.code === priority)?.name || priority}
              </span></div>
              <div>Shipping: <span className="font-semibold">
                {shippingConditions?.find((sc: any) => sc.code === shippingCondition)?.name || shippingCondition}
              </span></div>
              {relevantCCItems.length > 0 && (
                <div>Item categories: <span className="font-semibold text-green-700">
                  {relevantCCItems.map((it: any) => `${it.source_item_category}→${it.target_item_category}`).join(', ')}
                </span></div>
              )}
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
