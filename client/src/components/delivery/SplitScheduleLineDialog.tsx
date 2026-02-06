import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Plus, Trash2, SplitSquareHorizontal, AlertCircle } from 'lucide-react';
import { format } from "date-fns";

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
}

interface Split {
  id: string;
  quantity: number;
  date: Date;
}

interface SplitScheduleLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleLine: ScheduleLine | null;
  onSplit: (scheduleLineId: number, splits: { quantity: number; date: string }[]) => Promise<void>;
}

const SplitScheduleLineDialog: React.FC<SplitScheduleLineDialogProps> = ({
  open,
  onOpenChange,
  scheduleLine,
  onSplit
}) => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with 2 default splits when dialog opens
  useEffect(() => {
    if (open && scheduleLine) {
      const confirmedQty = parseFloat(scheduleLine.confirmed_quantity || scheduleLine.schedule_quantity || 0);
      const deliveredQty = parseFloat(scheduleLine.delivered_quantity || 0);
      const remainingQty = confirmedQty - deliveredQty;
      
      if (remainingQty <= 0) {
        setError("No remaining quantity to split");
        setSplits([]);
        return;
      }
      
      const halfQty = Math.floor(remainingQty / 2);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      setSplits([
        { id: '1', quantity: halfQty, date: today },
        { id: '2', quantity: remainingQty - halfQty, date: nextWeek }
      ]);
      setError(null);
    } else if (!open) {
      // Reset when dialog closes
      setSplits([]);
      setError(null);
    }
  }, [open, scheduleLine]);

  const addSplit = () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + splits.length * 7);
    setSplits([...splits, { 
      id: Date.now().toString(), 
      quantity: 0, 
      date: newDate 
    }]);
  };

  const removeSplit = (id: string) => {
    if (splits.length > 2) {
      setSplits(splits.filter(s => s.id !== id));
    }
  };

  const updateSplit = (id: string, field: 'quantity' | 'date', value: number | Date) => {
    setSplits(splits.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
    setError(null);
  };

  const getTotalSplitQuantity = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.quantity.toString()) || 0), 0);
  };

  const validateSplits = (): string | null => {
    if (!scheduleLine) return "No schedule line selected";
    
    const confirmedQty = parseFloat(scheduleLine.confirmed_quantity || scheduleLine.schedule_quantity || 0);
    const deliveredQty = parseFloat(scheduleLine.delivered_quantity || 0);
    const remainingQty = confirmedQty - deliveredQty;
    const totalSplitQty = getTotalSplitQuantity();

    if (remainingQty <= 0) {
      return "No remaining quantity to split";
    }

    if (splits.length < 2) {
      return "At least 2 splits are required";
    }

    if (splits.some(s => !s.quantity || s.quantity <= 0)) {
      return "All splits must have a quantity greater than 0";
    }

    // Allow small floating point differences (0.01)
    if (Math.abs(totalSplitQty - remainingQty) > 0.01) {
      return `Total split quantity (${totalSplitQty}) must equal remaining quantity (${remainingQty})`;
    }

    if (splits.some(s => !s.date)) {
      return "All splits must have a delivery date";
    }

    return null;
  };

  const handleSplit = async () => {
    if (!scheduleLine) return;

    const validationError = validateSplits();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSplitting(true);
    setError(null);

    try {
      // Filter out invalid splits and format dates
      const formattedSplits = splits
        .filter(s => s.quantity > 0 && s.date)
        .map(s => ({
          quantity: parseFloat(s.quantity.toString()),
          date: format(s.date, 'yyyy-MM-dd')
        }));

      if (formattedSplits.length === 0) {
        setError("At least one valid split is required");
        setIsSplitting(false);
        return;
      }

      await onSplit(scheduleLine.id, formattedSplits);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split schedule line');
      setIsSplitting(false);
    } finally {
      setIsSplitting(false);
    }
  };

  if (!scheduleLine) return null;

  const confirmedQty = parseFloat(scheduleLine.confirmed_quantity || scheduleLine.schedule_quantity || 0);
  const deliveredQty = parseFloat(scheduleLine.delivered_quantity || 0);
  const remainingQty = confirmedQty - deliveredQty;
  const totalSplitQty = getTotalSplitQuantity();
  const difference = remainingQty - totalSplitQty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SplitSquareHorizontal className="h-5 w-5" />
            Split Schedule Line
          </DialogTitle>
          <DialogDescription>
            Divide this schedule line into multiple deliveries with different dates
          </DialogDescription>
        </DialogHeader>

        {/* Schedule Line Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Product:</span> {scheduleLine.product_name}
            </div>
            <div>
              <span className="font-semibold">Code:</span> {scheduleLine.product_code}
            </div>
            <div>
              <span className="font-semibold">Total Quantity:</span> {confirmedQty} {scheduleLine.unit}
            </div>
            <div>
              <span className="font-semibold">Already Delivered:</span> {deliveredQty} {scheduleLine.unit}
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-blue-600">Remaining to Split:</span>{' '}
              <span className="text-lg font-bold text-blue-600">{remainingQty} {scheduleLine.unit}</span>
            </div>
          </div>
        </div>

        {/* Quantity Summary */}
        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">Total Split Quantity:</span>
              <span className={`ml-2 text-lg font-bold ${
                difference === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalSplitQty} / {remainingQty} {scheduleLine.unit}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Difference:</span>
              <span className={`ml-2 text-lg font-bold ${
                difference === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {difference > 0 ? '+' : ''}{difference} {scheduleLine.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Splits Configuration */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Delivery Splits ({splits.length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSplit}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Split
            </Button>
          </div>

          {splits.map((split, index) => (
            <div key={split.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <Label className="font-semibold text-blue-600">
                  Split {index + 1}
                </Label>
                {splits.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(split.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <Label htmlFor={`quantity-${split.id}`} className="text-sm">
                    Quantity ({scheduleLine.unit})
                  </Label>
                  <Input
                    id={`quantity-${split.id}`}
                    type="number"
                    min="0"
                    step="0.001"
                    value={split.quantity || ''}
                    onChange={(e) => updateSplit(split.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                {/* Delivery Date */}
                <div>
                  <Label className="text-sm">Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {split.date ? format(split.date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={split.date}
                        onSelect={(date) => date && updateSplit(split.id, 'date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Helper Text */}
        <div className="text-sm text-gray-500 mt-2">
          💡 Tip: The total of all split quantities must equal the remaining quantity ({remainingQty} {scheduleLine.unit})
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSplitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSplit}
            disabled={isSplitting || difference !== 0}
          >
            {isSplitting ? (
              <>Splitting...</>
            ) : (
              <>
                <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                Split into {splits.length} Lines
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SplitScheduleLineDialog;

