import React from 'react';
import { Badge } from '@/components/ui/badge';

interface DeliveryPriorityBadgeProps {
  priorityCode: string;
  priorityName?: string;
  colorCode?: string;
  showName?: boolean;
}

const DeliveryPriorityBadge: React.FC<DeliveryPriorityBadgeProps> = ({ 
  priorityCode, 
  priorityName,
  colorCode,
  showName = true 
}) => {
  // Default color mapping if not provided from database
  const getDefaultColor = (code: string) => {
    switch (code) {
      case '01': return '#FF0000'; // High - Red
      case '02': return '#00AA00'; // Normal - Green
      case '03': return '#0000FF'; // Low - Blue
      default: return '#808080';    // Gray
    }
  };

  const color = colorCode || getDefaultColor(priorityCode);
  
  // Get priority icon
  const getPriorityIcon = (code: string) => {
    switch (code) {
      case '01': return '🔴';
      case '02': return '🟢';
      case '03': return '🔵';
      default: return '⚪';
    }
  };

  // Get variant based on priority
  const getVariant = (code: string) => {
    switch (code) {
      case '01': return 'destructive';
      case '02': return 'default';
      case '03': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Badge 
      variant={getVariant(priorityCode)}
      className="inline-flex items-center gap-1"
      style={{ backgroundColor: color, color: '#ffffff' }}
    >
      <span>{getPriorityIcon(priorityCode)}</span>
      {showName && <span>{priorityName || `Priority ${priorityCode}`}</span>}
    </Badge>
  );
};

export default DeliveryPriorityBadge;

