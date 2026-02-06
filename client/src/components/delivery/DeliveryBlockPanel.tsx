import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Lock, LockOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { format } from 'date-fns';

interface DeliveryBlockPanelProps {
  salesOrder: any;
  onBlockChange?: () => void;
}

const DeliveryBlockPanel: React.FC<DeliveryBlockPanelProps> = ({ 
  salesOrder,
  onBlockChange 
}) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [releaseReason, setReleaseReason] = useState('');

  // Fetch available delivery blocks
  const { data: deliveryBlocks } = useQuery({
    queryKey: ['/api/order-to-cash/delivery-blocks'],
    queryFn: async () => {
      const res = await apiRequest('/api/order-to-cash/delivery-blocks');
      const data = await res.json();
      return data.success ? data.data : [];
    }
  });

  // Fetch block history for this order
  const { data: blockHistory, refetch: refetchHistory } = useQuery({
    queryKey: [`/api/order-to-cash/schedule-lines/${salesOrder?.id}`],
    enabled: !!salesOrder?.id,
    queryFn: async () => {
      // This would need a dedicated endpoint for block history
      // For now, we'll show basic info
      return [];
    }
  });

  const handleBlock = async () => {
    if (!selectedBlockCode || !blockReason) {
      alert('Please select a block type and provide a reason');
      return;
    }

    setIsBlocking(true);
    try {
      const res = await apiRequest('/api/order-to-cash/block-delivery', {
        method: 'POST',
        body: JSON.stringify({
          salesOrderId: salesOrder.id,
          blockCode: selectedBlockCode,
          blockReason
        })
      });

      const result = await res.json();
      if (result.success) {
        alert('Delivery blocked successfully');
        setBlockReason('');
        setSelectedBlockCode('');
        onBlockChange?.();
        refetchHistory();
      } else {
        alert(result.error || 'Failed to block delivery');
      }
    } catch (error) {
      console.error('Error blocking delivery:', error);
      alert('Failed to block delivery');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseReason) {
      alert('Please provide a reason for releasing the block');
      return;
    }

    setIsBlocking(true);
    try {
      const res = await apiRequest('/api/order-to-cash/release-block', {
        method: 'POST',
        body: JSON.stringify({
          salesOrderId: salesOrder.id,
          releaseReason
        })
      });

      const result = await res.json();
      if (result.success) {
        alert('Block released successfully');
        setReleaseReason('');
        onBlockChange?.();
        refetchHistory();
      } else {
        alert(result.error || 'Failed to release block');
      }
    } catch (error) {
      console.error('Error releasing block:', error);
      alert('Failed to release block');
    } finally {
      setIsBlocking(false);
    }
  };

  const currentBlock = deliveryBlocks?.find(
    (block: any) => block.code === salesOrder?.delivery_block
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {salesOrder?.delivery_block ? (
            <>
              <Lock className="h-5 w-5 text-red-600" />
              Delivery Blocked
            </>
          ) : (
            <>
              <LockOpen className="h-5 w-5 text-green-600" />
              Delivery Block Management
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-3 rounded-lg border bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Current Status:</span>
            {salesOrder?.delivery_block ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Blocked
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600 text-white">
                <CheckCircle className="h-3 w-3" />
                No Block
              </Badge>
            )}
          </div>
          
          {currentBlock && (
            <div className="text-sm space-y-1 mt-2 pt-2 border-t">
              <div><span className="font-medium">Block Type:</span> {currentBlock.name}</div>
              <div><span className="font-medium">Category:</span> {currentBlock.block_type}</div>
              {currentBlock.requires_approval && (
                <div className="text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Requires Approval from {currentBlock.approval_role}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Block or Release Controls */}
        {!salesOrder?.delivery_block ? (
          <div className="space-y-3">
            <div>
              <Label>Block Type</Label>
              <Select value={selectedBlockCode} onValueChange={setSelectedBlockCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select block type" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryBlocks?.map((block: any) => (
                    <SelectItem key={block.code} value={block.code}>
                      <div>
                        <div className="font-medium">{block.name}</div>
                        <div className="text-xs text-gray-500">{block.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Block Reason</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter reason for blocking delivery..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleBlock} 
              disabled={isBlocking || !selectedBlockCode || !blockReason}
              variant="destructive"
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Block Delivery
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Release Reason</Label>
              <Textarea
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="Enter reason for releasing block..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleRelease} 
              disabled={isBlocking || !releaseReason}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <LockOpen className="h-4 w-4 mr-2" />
              Release Block
            </Button>
          </div>
        )}

        {/* Block History */}
        {blockHistory && blockHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Block History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {blockHistory.map((entry: any, index: number) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.block_name}</span>
                    <Badge variant={entry.status === 'RELEASED' ? 'default' : 'destructive'} className={entry.status === 'RELEASED' ? 'bg-green-600 text-white' : ''}>
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {entry.block_reason}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(new Date(entry.blocked_date), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryBlockPanel;

