import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, XCircle, FileQuestion } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeliveryBlockBadgeProps {
  blockCode: string;
  blockName?: string;
  blockType?: string;
  blockReason?: string;
  requiresApproval?: boolean;
  onClick?: () => void;
}

const DeliveryBlockBadge: React.FC<DeliveryBlockBadgeProps> = ({ 
  blockCode,
  blockName,
  blockType,
  blockReason,
  requiresApproval,
  onClick
}) => {
  const getBlockIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'CREDIT':
        return <Lock className="h-3 w-3" />;
      case 'QUALITY':
        return <AlertCircle className="h-3 w-3" />;
      case 'MANUAL':
        return <XCircle className="h-3 w-3" />;
      default:
        return <FileQuestion className="h-3 w-3" />;
    }
  };

  const badgeContent = (
    <Badge 
      variant="destructive" 
      className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80"
      onClick={onClick}
    >
      <span>🚫</span>
      {getBlockIcon(blockType)}
      <span className="font-semibold">{blockName || blockCode}</span>
      {requiresApproval && <span className="text-xs">(Approval Required)</span>}
    </Badge>
  );

  if (blockReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">Block Reason:</p>
            <p>{blockReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};

export default DeliveryBlockBadge;

