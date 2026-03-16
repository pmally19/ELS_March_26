import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  X, 
  CheckCircle, 
  DollarSign, 
  Ban,
  AlertCircle
} from 'lucide-react';
import ReasonCodeSelector, { ReasonCode } from './ReasonCodeSelector';

export interface SalesDocumentAction {
  type: 'block-order' | 'reject-item' | 'apply-discount' | 'cancel-order';
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresReasonCode: boolean;
  destructive?: boolean;
}

export interface SalesDocumentActionsProps {
  orderId: string;
  itemId?: string;
  onAction: (action: SalesDocumentAction['type'], reasonCode?: string, notes?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const ACTIONS: SalesDocumentAction[] = [
  {
    type: 'block-order',
    title: 'Block Order',
    description: 'Block the entire sales order from processing',
    icon: <Ban className="h-4 w-4" />,
    requiresReasonCode: true,
    destructive: true
  },
  {
    type: 'reject-item',
    title: 'Reject Item',
    description: 'Reject a specific line item from the order',
    icon: <X className="h-4 w-4" />,
    requiresReasonCode: true,
    destructive: true
  },
  {
    type: 'apply-discount',
    title: 'Apply Discount',
    description: 'Apply a discount to the order or item',
    icon: <DollarSign className="h-4 w-4" />,
    requiresReasonCode: true,
    destructive: false
  },
  {
    type: 'cancel-order',
    title: 'Cancel Order',
    description: 'Cancel the entire sales order',
    icon: <AlertTriangle className="h-4 w-4" />,
    requiresReasonCode: true,
    destructive: true
  }
];

export default function SalesDocumentActions({
  orderId,
  itemId,
  onAction,
  disabled = false,
  className = ""
}: SalesDocumentActionsProps) {
  const [selectedAction, setSelectedAction] = useState<SalesDocumentAction | null>(null);
  const [reasonCode, setReasonCode] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContextForAction = (action: SalesDocumentAction): 'order-block' | 'item-rejection' | 'discount' | 'general' => {
    switch (action.type) {
      case 'block-order':
      case 'cancel-order':
        return 'order-block';
      case 'reject-item':
        return 'item-rejection';
      case 'apply-discount':
        return 'discount';
      default:
        return 'general';
    }
  };

  const handleActionClick = (action: SalesDocumentAction) => {
    setSelectedAction(action);
    setReasonCode(undefined);
    setNotes('');
    setError(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    // Validate required fields
    if (selectedAction.requiresReasonCode && !reasonCode) {
      setError('A reason code is required for this action.');
      return;
    }

    // Additional validation for critical actions
    if (selectedAction.type === 'block-order' || selectedAction.type === 'cancel-order') {
      if (!reasonCode) {
        setError('A reason code is mandatory for blocking or cancelling an order.');
        return;
      }
      if (!notes || notes.trim().length < 10) {
        setError('Detailed notes are required for blocking or cancelling an order (minimum 10 characters).');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAction(selectedAction.type, reasonCode, notes);
      setSelectedAction(null);
      setReasonCode(undefined);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setReasonCode(undefined);
    setNotes('');
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Order Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACTIONS.map((action) => (
              <Button
                key={action.type}
                variant={action.destructive ? "destructive" : "outline"}
                onClick={() => handleActionClick(action)}
                disabled={disabled}
                className="justify-start h-auto p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm opacity-80">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={handleCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedAction?.icon}
              <span>{selectedAction?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {selectedAction && (
              <>
                <ReasonCodeSelector
                  context={getContextForAction(selectedAction)}
                  value={reasonCode}
                  onChange={setReasonCode}
                  required={selectedAction.requiresReasonCode}
                  placeholder={`Select reason for ${selectedAction.title.toLowerCase()}...`}
                  error={selectedAction.requiresReasonCode && !reasonCode ? 'Reason code is required' : undefined}
                />

                <div className="space-y-2">
                  <Label htmlFor="action-notes">
                    Additional Notes 
                    {(selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order') && (
                      <span className="text-red-500"> *</span>
                    )}
                    {!(selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order') && (
                      <span className="text-muted-foreground"> (Optional)</span>
                    )}
                  </Label>
                  <Textarea
                    id="action-notes"
                    placeholder={
                      selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order'
                        ? "Detailed explanation required (minimum 10 characters)..."
                        : "Add any additional notes or comments..."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={
                      (selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order') && 
                      (!notes || notes.trim().length < 10) 
                        ? 'border-red-500' 
                        : ''
                    }
                  />
                  {(selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order') && (
                    <div className="text-sm text-muted-foreground">
                      Minimum 10 characters required for critical actions
                    </div>
                  )}
                </div>

                {selectedAction.type === 'block-order' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Blocking this order will prevent it from being processed further. 
                      This action can be reversed by an administrator.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedAction.type === 'cancel-order' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Canceling this order will permanently remove it from the system. 
                      This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={
                isSubmitting || 
                (selectedAction?.requiresReasonCode && !reasonCode) ||
                ((selectedAction?.type === 'block-order' || selectedAction?.type === 'cancel-order') && 
                 (!notes || notes.trim().length < 10))
              }
              variant={selectedAction?.destructive ? "destructive" : "default"}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm {selectedAction?.title}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
